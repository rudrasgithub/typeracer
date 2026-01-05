import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.isIntentionalDisconnect = false;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });

      this.socket.on('connect', () => {
        this.reconnectAttempts = 0;
        // Silently connected
      });

      this.socket.on('disconnect', (reason) => {
        // Handle different disconnect reasons
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          if (!this.isIntentionalDisconnect) {
            this.socket.connect();
          }
        }
      });

      this.socket.on('connect_error', (error) => {
        this.reconnectAttempts++;
        // Connection error - silently handle
      });

      this.socket.on('reconnect', (attemptNumber) => {
        // Reconnected after disconnect
      });

      this.socket.on('reconnect_failed', () => {
        // All reconnection attempts failed
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.isIntentionalDisconnect = true;
      this.socket.disconnect();
      this.socket = null;
      this.isIntentionalDisconnect = false;
    }
  }

  // Graceful disconnect - tells server not to wait for reconnection
  gracefulDisconnect() {
    if (this.socket) {
      this.socket.emit('gracefulDisconnect');
      this.isIntentionalDisconnect = true;
      this.socket.disconnect();
      this.socket = null;
      this.isIntentionalDisconnect = false;
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }

  // Register user when authenticated
  registerUser(userData) {
    if (this.socket) {
      this.socket.emit('registerUser', userData);
    }
  }

  // Get online stats
  getOnlineStats() {
    if (this.socket) {
      this.socket.emit('getOnlineStats');
    }
  }

  // Online stats listener
  onOnlineStats(callback) {
    if (this.socket) {
      this.socket.on('onlineStats', callback);
    }
  }

  // Global chat
  sendGlobalChat(message) {
    if (this.socket) {
      this.socket.emit('globalChat', { text: message });
    }
  }

  onGlobalChatMessage(callback) {
    if (this.socket) {
      this.socket.on('globalChatMessage', callback);
    }
  }

  // Race chat
  sendRaceChat(roomId, message) {
    if (this.socket) {
      this.socket.emit('raceChat', { roomId, message });
    }
  }

  onRaceChatMessage(callback) {
    if (this.socket) {
      this.socket.on('raceChatMessage', callback);
    }
  }

  // Private chat
  startPrivateChat(targetUserId) {
    if (this.socket) {
      this.socket.emit('startPrivateChat', targetUserId);
    }
  }

  sendPrivateChat(targetSocketId, message) {
    if (this.socket) {
      this.socket.emit('privateChat', { targetSocketId, message });
    }
  }

  onPrivateChatStarted(callback) {
    if (this.socket) {
      this.socket.on('privateChatStarted', callback);
    }
  }

  onPrivateChatMessage(callback) {
    if (this.socket) {
      this.socket.on('privateChatMessage', callback);
    }
  }

  // Race events
  joinWaitingRoom(userData) {
    if (this.socket) {
      this.socket.emit('joinWaitingRoom', userData);
    }
  }

  reconnectToRoom(data) {
    if (this.socket) {
      this.socket.emit('reconnectToRoom', data);
    }
  }

  leaveRace(roomId) {
    if (this.socket) {
      this.socket.emit('leaveRace', roomId);
    }
  }

  leaveWaitingRoom() {
    if (this.socket) {
      this.socket.emit('leaveWaitingRoom');
    }
  }

  updateProgress(data) {
    if (this.socket) {
      this.socket.emit('updateProgress', data);
    }
  }

  playerFinished(data) {
    if (this.socket) {
      this.socket.emit('playerFinished', data);
    }
  }

  // Event listeners
  onWaitingForPlayers(callback) {
    if (this.socket) {
      this.socket.on('waitingForPlayers', callback);
    }
  }

  onRaceReady(callback) {
    if (this.socket) {
      this.socket.on('raceReady', callback);
    }
  }

  onReconnectSuccess(callback) {
    if (this.socket) {
      this.socket.on('reconnectSuccess', callback);
    }
  }

  onReconnectFailed(callback) {
    if (this.socket) {
      this.socket.on('reconnectFailed', callback);
    }
  }

  onCountdown(callback) {
    if (this.socket) {
      this.socket.on('countdown', callback);
    }
  }

  onRaceStart(callback) {
    if (this.socket) {
      this.socket.on('raceStart', callback);
    }
  }

  onProgressUpdate(callback) {
    if (this.socket) {
      this.socket.on('progressUpdate', callback);
    }
  }

  onPlayerFinished(callback) {
    if (this.socket) {
      this.socket.on('playerFinished', callback);
    }
  }

  onRaceFinished(callback) {
    if (this.socket) {
      this.socket.on('raceFinished', callback);
    }
  }

  onPlayerDisconnected(callback) {
    if (this.socket) {
      this.socket.on('playerDisconnected', callback);
    }
  }

  onPlayerReconnected(callback) {
    if (this.socket) {
      this.socket.on('playerReconnected', callback);
    }
  }

  onPlayerLeft(callback) {
    if (this.socket) {
      this.socket.on('playerLeft', callback);
    }
  }

  onRaceLeft(callback) {
    if (this.socket) {
      this.socket.on('raceLeft', callback);
    }
  }

  // New edge case handlers
  onSessionInvalidated(callback) {
    if (this.socket) {
      this.socket.on('sessionInvalidated', callback);
    }
  }

  onPendingRaceReconnect(callback) {
    if (this.socket) {
      this.socket.on('pendingRaceReconnect', callback);
    }
  }

  onAlreadyInRace(callback) {
    if (this.socket) {
      this.socket.on('alreadyInRace', callback);
    }
  }

  onAlreadyWaiting(callback) {
    if (this.socket) {
      this.socket.on('alreadyWaiting', callback);
    }
  }

  onPlayerRemovedTimeout(callback) {
    if (this.socket) {
      this.socket.on('playerRemovedTimeout', callback);
    }
  }

  // Remove listeners
  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  // Remove all listeners
  offAll() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export default new SocketService();
