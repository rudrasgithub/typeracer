import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import socketService from '../services/socketService';
import './Home.css';

const Home = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [onlineStats, setOnlineStats] = useState({
    onlineCount: 0,
    racingCount: 0,
    waitingCount: 0
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef(null);

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time with AM/PM
  const formatTime = (date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Socket connection for online stats and chat
  useEffect(() => {
    socketService.connect();

    // Listen for online stats updates
    socketService.onOnlineStats((stats) => {
      setOnlineStats(stats);
    });

    // Listen for global chat messages
    socketService.onGlobalChatMessage((message) => {
      setChatMessages(prev => [...prev.slice(-49), message]); // Keep last 50 messages
    });

    return () => {
      socketService.off('onlineStats');
      socketService.off('globalChatMessage');
    };
  }, []);

  // Register user when auth state changes (login/logout)
  useEffect(() => {
    // Register user (authenticated or anonymous visitor)
    if (isAuthenticated && user) {
      socketService.registerUser({
        username: user.username,
        userId: user.id
      });
    } else {
      // Register as anonymous visitor
      socketService.registerUser({
        username: `Guest_${Math.random().toString(36).substr(2, 6)}`,
        userId: null,
        isGuest: true
      });
    }

    // Get stats immediately after registration
    socketService.getOnlineStats();
  }, [isAuthenticated, user]);

  // Poll for stats more frequently for real-time feel
  useEffect(() => {
    const statsInterval = setInterval(() => {
      socketService.getOnlineStats();
    }, 2000); // Poll every 2 seconds

    return () => {
      clearInterval(statsInterval);
      socketService.off('onlineStats');
      socketService.off('globalChatMessage');
    };
  }, [isAuthenticated, user]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Send chat message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatInput.trim() && isAuthenticated) {
      socketService.sendGlobalChat(chatInput.trim());
      setChatInput('');
    }
  };

  // Format chat timestamp
  const formatChatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="home-page">
      {/* Time Display */}
      <div className="time-display-home">
        <span className="time-icon">🕐</span>
        <span className="time-text">{formatTime(currentTime)}</span>
      </div>

      {/* Online Stats Bar - Only online count */}
      <div className="online-stats-bar">
        <div className="online-stat">
          <span className="online-dot"></span>
          <span>{onlineStats.onlineCount} Online</span>
        </div>
      </div>

      <div className="hero-section">
        <div className="hero-content fade-in">
          <h1 className="hero-title">
            🏁 Welcome to TypeRacer
          </h1>
          <p className="hero-subtitle">
            Compete with others in real-time typing races. Improve your speed and accuracy!
          </p>
          
          <div className="hero-actions">
            <Link to="/race" className="btn btn-primary btn-large pulse">
              🎮 Start Racing
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/practice" className="btn btn-secondary btn-large">
                  ⌨️ Practice
                </Link>
                <Link to="/leaderboard" className="btn btn-secondary btn-large">
                  🏆 Leaderboard
                </Link>
              </>
            )}
            {!isAuthenticated && (
              <>
                <Link to="/register" className="btn btn-secondary btn-large">
                  Get Started
                </Link>
                <Link to="/login" className="btn btn-secondary btn-large">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {isAuthenticated && user && (
        <div className="stats-section container fade-in">
          <h2 className="section-title">Your Stats</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🏁</div>
              <div className="stat-value">{user.stats?.totalRaces || 0}</div>
              <div className="stat-label">Total Races</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <div className="stat-value">{user.stats?.totalWins || 0}</div>
              <div className="stat-label">Total Wins</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-value">{user.stats?.highestWPM || 0}</div>
              <div className="stat-label">Highest WPM</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-value">{user.stats?.averageWPM || 0}</div>
              <div className="stat-label">Average WPM</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-value">{user.stats?.averageAccuracy || 0}%</div>
              <div className="stat-label">Accuracy</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-value">Level {user.level || 1}</div>
              <div className="stat-label">Current Level</div>
            </div>
          </div>
        </div>
      )}

      <div className="features-section container">
        <h2 className="section-title">Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Real-Time Racing</h3>
            <p>Compete with up to 4 players in real-time typing races</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏆</div>
            <h3>Global Leaderboard</h3>
            <p>Climb the ranks and become the top typer</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Track Progress</h3>
            <p>Monitor your WPM, accuracy, and race history</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Live Chat</h3>
            <p>Chat with other players while racing</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⭐</div>
            <h3>Level System</h3>
            <p>Gain experience and level up as you race</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Practice Mode</h3>
            <p>Improve your skills with practice typing</p>
          </div>
        </div>
      </div>

      <div className="cta-section">
        <div className="cta-content">
          <h2>Ready to Race?</h2>
          <p>Join thousands of players improving their typing skills</p>
          {!isAuthenticated && (
            <Link to="/register" className="btn btn-primary btn-large">
              Sign Up Now
            </Link>
          )}
        </div>
      </div>

      {/* Global Chat Button */}
      {isAuthenticated && (
        <button 
          className={`chat-toggle-btn ${showChat ? 'active' : ''}`}
          onClick={() => setShowChat(!showChat)}
        >
          💬
          {chatMessages.length > 0 && <span className="chat-badge">{chatMessages.length}</span>}
        </button>
      )}

      {/* Global Chat Panel */}
      {showChat && isAuthenticated && (
        <div className="chat-panel fade-in">
          <div className="chat-header">
            <h3>💬 Global Chat</h3>
            <button onClick={() => setShowChat(false)} className="close-btn">✕</button>
          </div>
          <div className="chat-messages">
            {chatMessages.length > 0 ? (
              chatMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`chat-message ${msg.username === user.username ? 'own' : ''}`}
                >
                  <div className="chat-message-header">
                    <span className="chat-username">{msg.username}</span>
                    <span className="chat-time">{formatChatTime(msg.timestamp)}</span>
                  </div>
                  <div className="chat-message-text">{msg.message}</div>
                </div>
              ))
            ) : (
              <p className="no-messages">No messages yet. Start the conversation!</p>
            )}
            <div ref={chatEndRef}></div>
          </div>
          <form onSubmit={handleSendMessage} className="chat-input-form">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              maxLength={200}
            />
            <button type="submit" disabled={!chatInput.trim()}>Send</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Home;
