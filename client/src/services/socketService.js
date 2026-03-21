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
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        upgrade: true
      });

      this.socket.on('connect', () => {
        this.reconnectAttempts = 0;
      });

      this.socket.on('disconnect', (reason) => {
        if (reason === 'io server disconnect') {
          if (!this.isIntentionalDisconnect) {
            this.socket.connect();
          }
        }
      });

      this.socket.on('connect_error', () => {
        this.reconnectAttempts++;
      });
    }
    return this.socket;
  }

  // Register user when authenticated
  registerUser(userData) {
    if (this.socket) {
      this.socket.emit('registerUser', userData);
    }
  }

  // Notify server when user logs out
  logoutUser() {
    if (this.socket) {
      this.socket.emit('userLogout');
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

  // Edge case handlers
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



  onPlayerRemovedTimeout(callback) {
    if (this.socket) {
      this.socket.on('playerRemovedTimeout', callback);
    }
  }

  onRaceCountdownCancelled(callback) {
    if (this.socket) {
      this.socket.on('raceCountdownCancelled', callback);
    }
  }

  onPlayerJoinedCountdown(callback) {
    if (this.socket) {
      this.socket.on('playerJoinedCountdown', callback);
    }
  }

  // Remove listeners
  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

export default new SocketService();
