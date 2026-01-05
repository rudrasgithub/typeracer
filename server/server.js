const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Load env vars
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const raceRoutes = require('./routes/race');
const leaderboardRoutes = require('./routes/leaderboard');
const userRoutes = require('./routes/user');

// Initialize express
const app = express();
const httpServer = createServer(app);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://typeracer-blond.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now in development
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/race', raceRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/user', userRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'TypeRacer API Server' });
});

// Socket.io for real-time racing
const activeRooms = new Map();
const waitingPlayers = [];
const onlineUsers = new Map();
const privateChats = new Map();
const disconnectedPlayers = new Map(); // Track temporarily disconnected players for reconnection
const countdownIntervals = new Map(); // Track countdown intervals per room
let matchmakingTimer = null;

// Constants for edge case handling
const RECONNECTION_GRACE_PERIOD = 30000; // 30 seconds to reconnect
const ROOM_CLEANUP_DELAY = 5000; // 5 seconds before cleaning up empty rooms
const MIN_PLAYERS_TO_START = 2;
const MAX_PLAYERS_PER_ROOM = 4;
const MATCHMAKING_BUFFER = 10000; // 10 seconds matchmaking buffer
const RACE_TIMEOUT = 300000; // 5 minutes max race duration

// Helper: Safe emit to a socket
const safeEmit = (socketId, event, data) => {
  const socket = io.sockets.sockets.get(socketId);
  if (socket && socket.connected) {
    socket.emit(event, data);
    return true;
  }
  return false;
};

// Helper: Check if socket is still connected
const isSocketConnected = (socketId) => {
  const socket = io.sockets.sockets.get(socketId);
  return socket && socket.connected;
};

// Helper: Clean up stale rooms
const cleanupStaleRooms = () => {
  const now = Date.now();
  activeRooms.forEach((room, roomId) => {
    // Clean up rooms that have been racing for too long
    if (room.startTime && (now - room.startTime > RACE_TIMEOUT)) {
      endRaceEarly(roomId, 'timeout');
    }
    
    // Clean up rooms with no connected players
    const connectedPlayers = room.players.filter(p => isSocketConnected(p.socketId));
    if (connectedPlayers.length === 0 && !hasDisconnectedPlayers(roomId)) {
      clearRoomCountdown(roomId);
      activeRooms.delete(roomId);
    }
  });
};

// Helper: Check if room has disconnected players who might reconnect
const hasDisconnectedPlayers = (roomId) => {
  let hasDisconnected = false;
  disconnectedPlayers.forEach((data, key) => {
    if (data.roomId === roomId && Date.now() - data.disconnectedAt < RECONNECTION_GRACE_PERIOD) {
      hasDisconnected = true;
    }
  });
  return hasDisconnected;
};

// Helper: Clear countdown interval for a room
const clearRoomCountdown = (roomId) => {
  const interval = countdownIntervals.get(roomId);
  if (interval) {
    clearInterval(interval);
    countdownIntervals.delete(roomId);
  }
};

// Helper: End race early (timeout, all players left, etc.)
const endRaceEarly = (roomId, reason) => {
  const room = activeRooms.get(roomId);
  if (!room) return;

  clearRoomCountdown(roomId);
  room.status = 'finished';
  
  // Calculate results for players who haven't finished
  const results = room.players.map(p => ({
    username: p.username,
    userId: p.userId,
    position: p.position || (p.finished ? p.position : 999),
    wpm: p.wpm || 0,
    accuracy: p.accuracy || 0,
    didNotFinish: !p.finished
  })).sort((a, b) => a.position - b.position);

  // Update all players status back to online
  room.players.forEach(p => {
    const playerUser = onlineUsers.get(p.socketId);
    if (playerUser) {
      playerUser.status = 'online';
      onlineUsers.set(p.socketId, playerUser);
    }
  });

  io.to(roomId).emit('raceFinished', { results, reason });
  
  // Schedule room cleanup
  setTimeout(() => {
    activeRooms.delete(roomId);
    // Clean up disconnected players for this room
    disconnectedPlayers.forEach((data, odName) => {
      if (data.roomId === roomId) {
        disconnectedPlayers.delete(odName);
      }
    });
  }, ROOM_CLEANUP_DELAY);

  broadcastOnlineStats();
};

// Helper: Handle single player left in race
const handleSinglePlayerLeft = (roomId) => {
  const room = activeRooms.get(roomId);
  if (!room) return;

  const connectedPlayers = room.players.filter(p => isSocketConnected(p.socketId));
  
  if (connectedPlayers.length === 1 && room.status === 'racing') {
    // Give the remaining player a short grace period to wait for reconnections
    setTimeout(() => {
      const currentRoom = activeRooms.get(roomId);
      if (!currentRoom) return;
      
      const stillConnected = currentRoom.players.filter(p => isSocketConnected(p.socketId));
      if (stillConnected.length === 1 && currentRoom.status === 'racing') {
        // Auto-finish the remaining player as winner if not finished
        const winner = stillConnected[0];
        if (!winner.finished) {
          winner.finished = true;
          winner.position = 1;
          io.to(roomId).emit('playerFinished', {
            username: winner.username,
            position: 1,
            wpm: winner.wpm || 0,
            accuracy: winner.accuracy || 100
          });
        }
        endRaceEarly(roomId, 'opponent_left');
      }
    }, 5000); // 5 second grace period
  } else if (connectedPlayers.length === 0) {
    // All players disconnected, end the race
    endRaceEarly(roomId, 'all_players_disconnected');
  }
};

// Helper: Remove player from waiting queue safely
const removeFromWaitingQueue = (socketId) => {
  const index = waitingPlayers.findIndex(p => p.socketId === socketId);
  if (index !== -1) {
    waitingPlayers.splice(index, 1);
    
    if (waitingPlayers.length === 0 && matchmakingTimer) {
      clearTimeout(matchmakingTimer);
      matchmakingTimer = null;
    }
    return true;
  }
  return false;
};

// Helper: Check for duplicate player in waiting queue
const isPlayerInWaitingQueue = (userId) => {
  return waitingPlayers.some(p => p.userId === userId);
};

// Helper: Check if player is already in a race
const getPlayerActiveRoom = (userId) => {
  for (const [roomId, room] of activeRooms.entries()) {
    if (room.players.some(p => p.userId === userId) && room.status !== 'finished') {
      return roomId;
    }
  }
  return null;
};

// Broadcast online stats to all connected clients
const broadcastOnlineStats = () => {
  const stats = {
    onlineCount: Array.from(onlineUsers.values()).filter(u => !u.isGuest).length,
    racingCount: Array.from(onlineUsers.values()).filter(u => u.status === 'racing').length,
    waitingCount: waitingPlayers.length,
    onlineUsers: Array.from(onlineUsers.values())
      .filter(u => !u.isGuest)
      .map(u => ({
        username: u.username,
        userId: u.userId,
        status: u.status
      }))
  };
  io.emit('onlineStats', stats);
};

// Periodic cleanup
setInterval(cleanupStaleRooms, 30000);

io.on('connection', (socket) => {
  // Register user when they connect
  socket.on('registerUser', (userData) => {
    // Check if this user already has an active session
    const existingSession = Array.from(onlineUsers.entries())
      .find(([_, u]) => u.userId === userData.userId && u.socketId !== socket.id);
    
    if (existingSession) {
      // Invalidate old session
      const oldSocketId = existingSession[0];
      const oldSocket = io.sockets.sockets.get(oldSocketId);
      if (oldSocket) {
        oldSocket.emit('sessionInvalidated', { message: 'You logged in from another location' });
        oldSocket.disconnect(true);
      }
      onlineUsers.delete(oldSocketId);
      removeFromWaitingQueue(oldSocketId);
    }

    onlineUsers.set(socket.id, {
      socketId: socket.id,
      username: userData.username,
      userId: userData.userId,
      status: 'online',
      isGuest: userData.isGuest || false,
      connectedAt: Date.now()
    });
    
    // Check if user was disconnected from a race
    const disconnectedData = disconnectedPlayers.get(userData.userId);
    if (disconnectedData && Date.now() - disconnectedData.disconnectedAt < RECONNECTION_GRACE_PERIOD) {
      socket.emit('pendingRaceReconnect', {
        roomId: disconnectedData.roomId,
        message: 'You have an active race. Reconnecting...'
      });
    }
    
    broadcastOnlineStats();
  });

  // Get online stats
  socket.on('getOnlineStats', () => {
    const stats = {
      onlineCount: Array.from(onlineUsers.values()).filter(u => !u.isGuest).length,
      racingCount: Array.from(onlineUsers.values()).filter(u => u.status === 'racing').length,
      waitingCount: waitingPlayers.length,
      onlineUsers: Array.from(onlineUsers.values())
        .filter(u => !u.isGuest)
        .map(u => ({
          username: u.username,
          userId: u.userId,
          status: u.status
        }))
    };
    socket.emit('onlineStats', stats);
  });

  // Global chat
  socket.on('globalChat', (message) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      io.emit('globalChatMessage', {
        id: Date.now(),
        username: user.username,
        message: message.text,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Race chat
  socket.on('raceChat', (data) => {
    const { roomId, message } = data;
    const user = onlineUsers.get(socket.id);
    if (user && roomId) {
      io.to(roomId).emit('raceChatMessage', {
        id: Date.now(),
        username: user.username,
        message: message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Private chat - start conversation
  socket.on('startPrivateChat', (targetUserId) => {
    const user = onlineUsers.get(socket.id);
    const targetSocket = Array.from(onlineUsers.entries())
      .find(([_, u]) => u.userId === targetUserId);
    
    if (user && targetSocket) {
      const chatRoomId = [socket.id, targetSocket[0]].sort().join('_');
      socket.join(chatRoomId);
      
      const targetSocketObj = io.sockets.sockets.get(targetSocket[0]);
      if (targetSocketObj) {
        targetSocketObj.join(chatRoomId);
      }
      
      socket.emit('privateChatStarted', {
        chatRoomId,
        targetUser: {
          username: targetSocket[1].username,
          userId: targetSocket[1].userId
        }
      });
    }
  });

  // Private chat message
  socket.on('privateChat', (data) => {
    const { targetSocketId, message } = data;
    const user = onlineUsers.get(socket.id);
    const chatRoomId = [socket.id, targetSocketId].sort().join('_');
    
    if (user) {
      io.to(chatRoomId).emit('privateChatMessage', {
        id: Date.now(),
        from: {
          socketId: socket.id,
          username: user.username
        },
        message: message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Helper function to create matches
  const createMatches = () => {
    while (waitingPlayers.length >= MIN_PLAYERS_TO_START) {
      const roomId = `race_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const playersToMatch = Math.min(MAX_PLAYERS_PER_ROOM, waitingPlayers.length);
      const players = waitingPlayers.splice(0, playersToMatch);

      // Verify all players are still connected
      const connectedPlayers = players.filter(p => isSocketConnected(p.socketId));
      
      if (connectedPlayers.length < MIN_PLAYERS_TO_START) {
        // Put back connected players to the waiting queue
        connectedPlayers.forEach(p => {
          if (!isPlayerInWaitingQueue(p.userId)) {
            waitingPlayers.unshift(p);
          }
        });
        continue;
      }

      // Update all matched players status to racing
      connectedPlayers.forEach(p => {
        const playerUser = onlineUsers.get(p.socketId);
        if (playerUser) {
          playerUser.status = 'racing';
          onlineUsers.set(p.socketId, playerUser);
        }
      });

      // Get random text for the race
      const raceTexts = [
        "The quick brown fox jumps over the lazy dog. TypeRacer is a fun way to improve your typing skills while competing with others.",
        "In the world of competitive typing, speed and accuracy are the keys to success. Practice makes perfect, so keep typing!",
        "Programming requires fast typing skills. The more you practice, the better you become at writing code efficiently.",
        "Typing games are not just fun, they help improve your muscle memory and increase your words per minute over time.",
        "The art of typing quickly comes from consistent practice and proper finger placement on the keyboard."
      ];
      const raceText = raceTexts[Math.floor(Math.random() * raceTexts.length)];

      activeRooms.set(roomId, {
        roomId,
        players: connectedPlayers.map(p => ({
          ...p,
          progress: 0,
          wpm: 0,
          accuracy: 100,
          finished: false,
          position: 0,
          isConnected: true
        })),
        text: raceText,
        startTime: null,
        status: 'countdown',
        createdAt: Date.now(),
        chatMessages: []
      });

      // Join all players to the room
      connectedPlayers.forEach(player => {
        const playerSocket = io.sockets.sockets.get(player.socketId);
        if (playerSocket) {
          playerSocket.join(roomId);
        }
      });

      broadcastOnlineStats();

      // Notify all players
      io.to(roomId).emit('raceReady', {
        roomId,
        players: connectedPlayers.map(p => ({ 
          socketId: p.socketId, 
          username: p.username,
          userId: p.userId 
        })),
        text: raceText
      });

      // Start countdown from 10 seconds
      let countdown = 10;
      const countdownInterval = setInterval(() => {
        const room = activeRooms.get(roomId);
        if (!room) {
          clearInterval(countdownInterval);
          countdownIntervals.delete(roomId);
          return;
        }

        // Check if any players are still connected
        const stillConnected = room.players.filter(p => isSocketConnected(p.socketId));
        if (stillConnected.length === 0) {
          clearInterval(countdownInterval);
          countdownIntervals.delete(roomId);
          activeRooms.delete(roomId);
          return;
        }

        io.to(roomId).emit('countdown', countdown);
        countdown--;

        if (countdown < 0) {
          clearInterval(countdownInterval);
          countdownIntervals.delete(roomId);
          
          const currentRoom = activeRooms.get(roomId);
          if (currentRoom) {
            // Final check for connected players
            const connectedNow = currentRoom.players.filter(p => isSocketConnected(p.socketId));
            if (connectedNow.length < 1) {
              activeRooms.delete(roomId);
              return;
            }
            
            currentRoom.startTime = Date.now();
            currentRoom.status = 'racing';
            activeRooms.set(roomId, currentRoom);
          }
          io.to(roomId).emit('raceStart');
        }
      }, 1000);
      
      countdownIntervals.set(roomId, countdownInterval);
    }
  };

  // Join waiting room
  socket.on('joinWaitingRoom', (userData) => {
    const user = onlineUsers.get(socket.id);
    
    // Edge case: User already in a race
    const existingRoom = getPlayerActiveRoom(userData.userId);
    if (existingRoom) {
      socket.emit('alreadyInRace', { roomId: existingRoom });
      return;
    }
    
    // Edge case: User already in waiting queue
    if (isPlayerInWaitingQueue(userData.userId)) {
      socket.emit('alreadyWaiting', { message: 'You are already in the matchmaking queue' });
      return;
    }
    
    // Update user status
    if (user) {
      user.status = 'waiting';
      onlineUsers.set(socket.id, user);
    }

    waitingPlayers.push({
      socketId: socket.id,
      username: userData.username,
      userId: userData.userId,
      joinedAt: Date.now()
    });

    socket.emit('waitingForPlayers', { 
      playersWaiting: waitingPlayers.length,
      position: waitingPlayers.length
    });

    broadcastOnlineStats();

    // Matchmaking logic - start immediately when 2+ players are waiting
    if (waitingPlayers.length >= MIN_PLAYERS_TO_START) {
      // Clear any existing timer and start match immediately
      if (matchmakingTimer) {
        clearTimeout(matchmakingTimer);
        matchmakingTimer = null;
      }
      createMatches();
    } else if (waitingPlayers.length === 1) {
      // First player - set a buffer timer in case more players join
      if (matchmakingTimer) {
        clearTimeout(matchmakingTimer);
      }
      
      matchmakingTimer = setTimeout(() => {
        // If still only 1 player after buffer, they'll need to wait for another
        matchmakingTimer = null;
      }, MATCHMAKING_BUFFER);
    }
  });

  // Reconnect to room
  socket.on('reconnectToRoom', (data) => {
    const { roomId, username, userId } = data;
    const room = activeRooms.get(roomId);
    
    if (!room) {
      socket.emit('reconnectFailed', { message: 'Race has ended or does not exist' });
      disconnectedPlayers.delete(userId);
      return;
    }
    
    if (room.status === 'finished') {
      socket.emit('reconnectFailed', { message: 'Race has already finished' });
      disconnectedPlayers.delete(userId);
      return;
    }
    
    // Find the player in the room
    const playerIndex = room.players.findIndex(p => p.userId === userId);
    
    if (playerIndex === -1) {
      socket.emit('reconnectFailed', { message: 'You are not part of this race' });
      return;
    }
    
    // Update player's socket ID
    room.players[playerIndex].socketId = socket.id;
    room.players[playerIndex].isConnected = true;
    activeRooms.set(roomId, room);
    
    // Remove from disconnected players
    disconnectedPlayers.delete(userId);
    
    // Update online users
    onlineUsers.set(socket.id, {
      socketId: socket.id,
      username: username,
      userId: userId,
      status: 'racing',
      isGuest: false,
      connectedAt: Date.now()
    });
    
    // Rejoin the room
    socket.join(roomId);
    
    // Send current room state to reconnected player
    socket.emit('reconnectSuccess', {
      roomId,
      players: room.players.map(p => ({
        socketId: p.socketId,
        username: p.username,
        progress: p.progress,
        wpm: p.wpm,
        accuracy: p.accuracy,
        finished: p.finished
      })),
      text: room.text,
      status: room.status,
      startTime: room.startTime
    });
    
    // Notify other players
    socket.to(roomId).emit('playerReconnected', {
      username,
      message: `${username} has reconnected`
    });
    
    broadcastOnlineStats();
  });

  // Leave current race
  socket.on('leaveRace', (roomId) => {
    const room = activeRooms.get(roomId);
    
    if (!room) {
      socket.emit('raceLeft');
      return;
    }
    
    const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
    
    if (playerIndex !== -1) {
      const player = room.players[playerIndex];
      const username = player.username;
      
      // Remove from disconnected players tracking
      disconnectedPlayers.delete(player.userId);
      
      // Remove player from room
      room.players.splice(playerIndex, 1);
      
      // Update user status
      const user = onlineUsers.get(socket.id);
      if (user) {
        user.status = 'online';
        onlineUsers.set(socket.id, user);
      }
      
      socket.leave(roomId);
      socket.emit('raceLeft');
      
      if (room.players.length === 0) {
        clearRoomCountdown(roomId);
        activeRooms.delete(roomId);
      } else {
        activeRooms.set(roomId, room);
        io.to(roomId).emit('playerLeft', { 
          username,
          remainingPlayers: room.players.length
        });
        
        // Handle single player left
        if (room.status === 'racing') {
          handleSinglePlayerLeft(roomId);
        }
      }
      
      broadcastOnlineStats();
    }
  });

  // Update typing progress
  socket.on('updateProgress', (data) => {
    const { roomId, progress, wpm, accuracy, typed } = data;
    const room = activeRooms.get(roomId);

    if (!room || room.status !== 'racing') return;
    
    const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
    
    if (playerIndex === -1) return;
    
    room.players[playerIndex].progress = progress;
    room.players[playerIndex].wpm = wpm;
    room.players[playerIndex].accuracy = accuracy;

    // Check if player finished
    if (progress >= 100 && !room.players[playerIndex].finished) {
      room.players[playerIndex].finished = true;
      const finishedCount = room.players.filter(p => p.finished).length;
      room.players[playerIndex].position = finishedCount;

      io.to(roomId).emit('playerFinished', {
        username: room.players[playerIndex].username,
        position: finishedCount,
        wpm: wpm,
        accuracy: accuracy
      });

      // Check if all connected players finished
      const connectedPlayers = room.players.filter(p => isSocketConnected(p.socketId));
      const finishedPlayers = connectedPlayers.filter(p => p.finished);
      
      if (finishedPlayers.length === connectedPlayers.length) {
        room.status = 'finished';
        
        // Update all players status back to online
        room.players.forEach(p => {
          const playerUser = onlineUsers.get(p.socketId);
          if (playerUser) {
            playerUser.status = 'online';
            onlineUsers.set(p.socketId, playerUser);
          }
        });
        
        io.to(roomId).emit('raceFinished', {
          results: room.players.map(p => ({
            username: p.username,
            userId: p.userId,
            position: p.position || 999,
            wpm: p.wpm,
            accuracy: p.accuracy,
            finished: p.finished
          })).sort((a, b) => {
            if (a.finished && !b.finished) return -1;
            if (!a.finished && b.finished) return 1;
            return a.position - b.position;
          })
        });
        
        broadcastOnlineStats();
      }
    }

    activeRooms.set(roomId, room);

    // Broadcast progress to all players in room
    io.to(roomId).emit('progressUpdate', {
      players: room.players.map(p => ({
        socketId: p.socketId,
        username: p.username,
        progress: p.progress,
        wpm: p.wpm,
        accuracy: p.accuracy,
        finished: p.finished,
        isConnected: isSocketConnected(p.socketId)
      }))
    });
  });

  // Leave waiting room
  socket.on('leaveWaitingRoom', () => {
    removeFromWaitingQueue(socket.id);
    
    const user = onlineUsers.get(socket.id);
    if (user) {
      user.status = 'online';
      onlineUsers.set(socket.id, user);
    }
    broadcastOnlineStats();
  });

  // Handle graceful disconnect (user clicks leave/close)
  socket.on('gracefulDisconnect', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      // Don't store for reconnection - user explicitly left
      disconnectedPlayers.delete(user.userId);
    }
    handleDisconnect(socket, false);
  });

  // Disconnect handler
  const handleDisconnect = (socket, allowReconnect = true) => {
    const user = onlineUsers.get(socket.id);
    
    // Remove from waiting players
    removeFromWaitingQueue(socket.id);

    // Handle disconnect in active rooms
    activeRooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        player.isConnected = false;
        
        if (allowReconnect && room.status !== 'finished') {
          // Store for potential reconnection
          disconnectedPlayers.set(player.userId, {
            roomId,
            username: player.username,
            userId: player.userId,
            disconnectedAt: Date.now(),
            progress: player.progress,
            wpm: player.wpm,
            accuracy: player.accuracy
          });
          
          io.to(roomId).emit('playerDisconnected', {
            username: player.username,
            willReconnect: true,
            gracePeriod: RECONNECTION_GRACE_PERIOD / 1000
          });
          
          // Set timeout to remove player if they don't reconnect
          setTimeout(() => {
            const currentRoom = activeRooms.get(roomId);
            const stillDisconnected = disconnectedPlayers.get(player.userId);
            
            if (stillDisconnected && currentRoom) {
              const pIndex = currentRoom.players.findIndex(p => p.userId === player.userId);
              if (pIndex !== -1 && !isSocketConnected(currentRoom.players[pIndex].socketId)) {
                // Player didn't reconnect, remove them
                currentRoom.players.splice(pIndex, 1);
                disconnectedPlayers.delete(player.userId);
                
                io.to(roomId).emit('playerRemovedTimeout', {
                  username: player.username
                });
                
                if (currentRoom.players.length === 0) {
                  clearRoomCountdown(roomId);
                  activeRooms.delete(roomId);
                } else {
                  activeRooms.set(roomId, currentRoom);
                  handleSinglePlayerLeft(roomId);
                }
                
                broadcastOnlineStats();
              }
            }
          }, RECONNECTION_GRACE_PERIOD);
        } else {
          // Immediate removal
          room.players.splice(playerIndex, 1);
          
          io.to(roomId).emit('playerDisconnected', {
            username: player.username,
            willReconnect: false
          });
          
          if (room.players.length === 0) {
            clearRoomCountdown(roomId);
            activeRooms.delete(roomId);
          } else {
            activeRooms.set(roomId, room);
            handleSinglePlayerLeft(roomId);
          }
        }
      }
    });
    
    // Remove from online users
    onlineUsers.delete(socket.id);
    broadcastOnlineStats();
  };

  socket.on('disconnect', () => {
    handleDisconnect(socket, true);
  });
});

const PORT = process.env.PORT || 5000;

// Only start server if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless (REST APIs only - Socket.io won't work on Vercel)
module.exports = app;
