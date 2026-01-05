import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import socketService from '../services/socketService';
import soundService from '../services/soundService';
import {
  setWaiting,
  setRaceReady,
  setCountdown,
  startRace,
  updateProgress,
  updatePlayers,
  finishRace,
  resetRace,
  saveRaceResults
} from '../store/slices/raceSlice';
import './Race.css';

const Race = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const {
    roomId,
    players,
    raceText,
    isWaiting,
    isRacing,
    countdown,
    userProgress,
    userWPM,
    userAccuracy,
    startTime,
    raceResults
  } = useSelector((state) => state.race);

  const [typedText, setTypedText] = useState('');
  const [errors, setErrors] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userFinished, setUserFinished] = useState(false);
  const [trafficLight, setTrafficLight] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [waitingTimer, setWaitingTimer] = useState(30);
  const [onlineStats, setOnlineStats] = useState({
    onlineCount: 0,
    racingCount: 0,
    waitingCount: 0
  });
  const [disconnectedPlayer, setDisconnectedPlayer] = useState(null);
  const [reconnectedPlayer, setReconnectedPlayer] = useState(null);
  const [playerLeftInfo, setPlayerLeftInfo] = useState(null);
  const [raceEndReason, setRaceEndReason] = useState(null);
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const waitingTimeoutRef = useRef(null);
  const hasReconnectedRef = useRef(false);

  // Handle browser close/tab close - warn user if in race
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isRacing || (countdown !== null && countdown >= 0)) {
        e.preventDefault();
        e.returnValue = 'You are in an active race. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRacing, countdown]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => {
    socketService.connect();

    // Check for active race in localStorage (reconnection logic) - only once
    const savedRoomId = localStorage.getItem('activeRaceRoom');
    if (savedRoomId && user && !hasReconnectedRef.current) {
      hasReconnectedRef.current = true;
      // Attempt to reconnect to saved room
      socketService.reconnectToRoom({
        roomId: savedRoomId,
        username: user.username,
        userId: user.id
      });
      // Don't clear localStorage here - let server response handle it
    }

    // Get online stats periodically
    socketService.getOnlineStats();
    const statsInterval = setInterval(() => {
      socketService.getOnlineStats();
    }, 3000);

    socketService.onOnlineStats((stats) => {
      setOnlineStats(stats);
    });

    socketService.onWaitingForPlayers((data) => {
      // Players in queue
    });

    socketService.onRaceReady((data) => {
      // Clear waiting timeout when match is found
      if (waitingTimeoutRef.current) {
        clearInterval(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
      dispatch(setRaceReady(data));
      
      // Save roomId to localStorage for reconnection
      if (data.roomId) {
        localStorage.setItem('activeRaceRoom', data.roomId);
      }
    });

    socketService.onCountdown((count) => {
      dispatch(setCountdown(count));
      
      // Traffic light logic for 10-second countdown
      if (count >= 7) {
        setTrafficLight('red');
      } else if (count >= 4) {
        setTrafficLight('yellow');
      } else if (count >= 1) {
        setTrafficLight('green');
      } else if (count === 0) {
        setTrafficLight('green');
      }
    });

    socketService.onRaceStart(() => {
      dispatch(startRace());
      setTrafficLight(null);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    });

    socketService.onProgressUpdate((data) => {
      dispatch(updatePlayers(data.players));
    });

    socketService.onPlayerFinished((data) => {
      // Player finished - could show notification
    });

    socketService.onRaceFinished((data) => {
      dispatch(finishRace(data.results));
      
      // Clear active race from localStorage
      localStorage.removeItem('activeRaceRoom');
      
      // Handle early race end reasons
      if (data.reason === 'opponent_left') {
        setRaceEndReason('Your opponent left the race. You win!');
      } else if (data.reason === 'timeout') {
        setRaceEndReason('Race timed out.');
      } else if (data.reason === 'all_players_disconnected') {
        setRaceEndReason('All players disconnected.');
      }
      
      if (roomId && user) {
        const raceData = {
          roomId,
          text: raceText,
          participants: data.results.map(r => ({
            user: r.userId,
            username: r.username,
            wpm: r.wpm,
            accuracy: r.accuracy,
            position: r.position,
            completionTime: Math.floor((Date.now() - startTime) / 1000)
          })),
          startTime: startTime,
          endTime: Date.now()
        };
        dispatch(saveRaceResults(raceData));
      }
    });

    socketService.onPlayerDisconnected((data) => {
      setDisconnectedPlayer({
        username: data.username,
        willReconnect: data.willReconnect,
        gracePeriod: data.gracePeriod
      });
      
      // Clear after showing
      setTimeout(() => setDisconnectedPlayer(null), 5000);
    });

    socketService.onPlayerReconnected((data) => {
      setDisconnectedPlayer(null);
      setReconnectedPlayer(data.username);
      setTimeout(() => setReconnectedPlayer(null), 3000);
    });

    socketService.onPlayerLeft((data) => {
      setPlayerLeftInfo({
        username: data.username,
        remainingPlayers: data.remainingPlayers
      });
      setTimeout(() => setPlayerLeftInfo(null), 3000);
    });

    socketService.onPlayerRemovedTimeout((data) => {
      setPlayerLeftInfo({
        username: data.username,
        reason: 'timeout'
      });
      setTimeout(() => setPlayerLeftInfo(null), 3000);
    });

    socketService.onReconnectSuccess((data) => {
      // Restore race state from server
      dispatch(setRaceReady({
        roomId: data.roomId,
        players: data.players,
        text: data.text
      }));
      
      if (data.status === 'racing') {
        dispatch(startRace());
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    });

    socketService.onReconnectFailed((data) => {
      localStorage.removeItem('activeRaceRoom');
    });

    // Handle edge cases
    socketService.onAlreadyInRace((data) => {
      // User already in a race, attempt to reconnect
      socketService.reconnectToRoom({
        roomId: data.roomId,
        username: user.username,
        userId: user.id
      });
    });

    socketService.onAlreadyWaiting((data) => {
      // Already in queue, do nothing
    });

    socketService.onSessionInvalidated((data) => {
      // Logged in from another location
      localStorage.removeItem('activeRaceRoom');
      dispatch(resetRace());
      navigate('/login');
    });

    socketService.onPendingRaceReconnect((data) => {
      // Auto-reconnect to pending race
      socketService.reconnectToRoom({
        roomId: data.roomId,
        username: user.username,
        userId: user.id
      });
    });

    socketService.onRaceLeft(() => {
      localStorage.removeItem('activeRaceRoom');
    });

    socketService.onRaceChatMessage((message) => {
      setChatMessages(prev => [...prev.slice(-29), message]);
    });

    return () => {
      clearInterval(statsInterval);
      if (isWaiting || isRacing) {
        socketService.leaveWaitingRoom();
      }
      socketService.off('onlineStats');
      socketService.off('waitingForPlayers');
      socketService.off('raceReady');
      socketService.off('countdown');
      socketService.off('raceStart');
      socketService.off('progressUpdate');
      socketService.off('playerFinished');
      socketService.off('raceFinished');
      socketService.off('playerDisconnected');
      socketService.off('playerReconnected');
      socketService.off('playerLeft');
      socketService.off('playerRemovedTimeout');
      socketService.off('raceChatMessage');
      socketService.off('alreadyInRace');
      socketService.off('alreadyWaiting');
      socketService.off('sessionInvalidated');
      socketService.off('pendingRaceReconnect');
      socketService.off('raceLeft');
      socketService.off('reconnectSuccess');
      socketService.off('reconnectFailed');
    };
  }, [dispatch, roomId, raceText, startTime, user, isWaiting, isRacing, navigate]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleFindMatch = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    dispatch(setWaiting(true));
    setWaitingTimer(30);
    
    socketService.joinWaitingRoom({
      username: user.username,
      userId: user.id
    });

    // Start 30-second countdown timer
    const timerInterval = setInterval(() => {
      setWaitingTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          handleCancelMatch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    waitingTimeoutRef.current = timerInterval;
  };

  const handleCancelMatch = () => {
    if (waitingTimeoutRef.current) {
      clearInterval(waitingTimeoutRef.current);
      waitingTimeoutRef.current = null;
    }
    dispatch(setWaiting(false));
    socketService.leaveWaitingRoom();
  };

  const handleTyping = (e) => {
    if (!isRacing || userFinished) return;

    const value = e.target.value;
    
    // Calculate correct characters typed so far
    let correctChars = 0;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === raceText[i]) {
        correctChars++;
      } else {
        break;
      }
    }

    // Calculate completed words - only count words that are fully typed correctly
    const typedWords = value.split(' ');
    const raceWords = raceText.split(' ');
    let completedWords = 0;
    let completedChars = 0;

    for (let i = 0; i < typedWords.length - 1; i++) {
      if (typedWords[i] === raceWords[i]) {
        completedWords++;
        completedChars += raceWords[i].length + 1; // +1 for space
      } else {
        break;
      }
    }

    // Check if current word being typed is correct so far
    const currentWordIndex = typedWords.length - 1;
    const currentTypedWord = typedWords[currentWordIndex] || '';
    const currentRaceWord = raceWords[currentWordIndex] || '';
    
    if (currentTypedWord && currentRaceWord.startsWith(currentTypedWord)) {
      // Current word is being typed correctly so far
      completedChars += currentTypedWord.length;
    }

    // Only progress based on correctly completed words
    const progress = Math.min((completedChars / raceText.length) * 100, 100);

    // Track errors
    if (value.length > typedText.length) {
      const lastIndex = value.length - 1;
      if (value[lastIndex] !== raceText[lastIndex]) {
        setErrors(prev => prev + 1);
      }
    }

    // Check if user completed a word correctly (typed word + space)
    // Clear input after correctly typing a word followed by space
    if (value.endsWith(' ') && value.trim().length > 0) {
      const trimmedValue = value.trim();
      const wordsTypedSoFar = trimmedValue.split(' ');
      const lastWordTyped = wordsTypedSoFar[wordsTypedSoFar.length - 1];
      const expectedWord = raceWords[completedWords];
      
      if (lastWordTyped === expectedWord) {
        // User correctly typed the word, clear input for next word
        e.target.value = '';
        setTypedText('');
      } else {
        setTypedText(value);
      }
    } else {
      setTypedText(value);
    }

    const timeElapsed = (Date.now() - startTime) / 1000 / 60;
    const wordsTyped = completedChars / 5; // Use completed chars for WPM
    const wpm = timeElapsed > 0 ? Math.floor(wordsTyped / timeElapsed) : 0;

    const totalTyped = value.length;
    const accuracy = totalTyped > 0 ? Math.floor((correctChars / totalTyped) * 100) : 100;

    dispatch(updateProgress({ progress, wpm, accuracy }));

    socketService.updateProgress({
      roomId,
      progress,
      wpm,
      accuracy,
      typed: value
    });

    if (value === raceText) {
      setUserFinished(true);
      
      socketService.playerFinished({
        roomId,
        wpm,
        accuracy,
        completionTime: Date.now() - startTime
      });
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (chatInput.trim() && roomId) {
      socketService.sendRaceChat(roomId, chatInput.trim());
      setChatInput('');
    }
  };

  const handleNewRace = () => {
    dispatch(resetRace());
    setTypedText('');
    setErrors(0);
    setUserFinished(false);
    setChatMessages([]);
    setRaceEndReason(null);
    setDisconnectedPlayer(null);
    setReconnectedPlayer(null);
    setPlayerLeftInfo(null);
    localStorage.removeItem('activeRaceRoom');
    handleFindMatch();
  };

  const handleLeaveRace = () => {
    if (roomId) {
      socketService.leaveRace(roomId);
      localStorage.removeItem('activeRaceRoom');
      dispatch(resetRace());
      setTypedText('');
      setErrors(0);
      setUserFinished(false);
      setChatMessages([]);
      setRaceEndReason(null);
      setDisconnectedPlayer(null);
      setReconnectedPlayer(null);
      setPlayerLeftInfo(null);
    }
  };

  const handleBackToHome = () => {
    if (roomId) {
      socketService.leaveRace(roomId);
      localStorage.removeItem('activeRaceRoom');
    }
    dispatch(resetRace());
    navigate('/');
  };

  const RaceChat = () => (
    <div className={`race-chat ${showChat ? 'open' : ''}`}>
      <button className="chat-toggle" onClick={() => setShowChat(!showChat)}>
        💬 {showChat ? 'Hide' : 'Chat'}
      </button>
      {showChat && (
        <div className="chat-content">
          <div className="chat-messages-race">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`chat-msg ${msg.username === user.username ? 'own' : ''}`}>
                <span className="chat-user">{msg.username}:</span>
                <span className="chat-text">{msg.message}</span>
              </div>
            ))}
            <div ref={chatEndRef}></div>
          </div>
          <form onSubmit={handleSendChat} className="chat-form">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type message..."
              maxLength={100}
            />
            <button type="submit">➤</button>
          </form>
        </div>
      )}
    </div>
  );

  if (isWaiting) {
    return (
      <div className="race-page">
        <div className="container">
          <div className="online-stats-bar">
            <div className="stat-badge">
              <span className="stat-icon">🟢</span>
              <span className="stat-text">{onlineStats.onlineCount} Online</span>
            </div>
            <div className="stat-badge">
              <span className="stat-icon">🏁</span>
              <span className="stat-text">{onlineStats.racingCount} Racing</span>
            </div>
            <div className="stat-badge">
              <span className="stat-icon">⏳</span>
              <span className="stat-text">{onlineStats.waitingCount} Waiting</span>
            </div>
          </div>
          <div className="time-display">
            <span className="time-icon">🕐</span>
            <span className="time-text">{formatTime(currentTime)}</span>
          </div>
          <div className="waiting-screen fade-in">
            <div className="waiting-timer-circle">
              <svg className="timer-svg" viewBox="0 0 100 100">
                <circle className="timer-bg" cx="50" cy="50" r="45" />
                <circle 
                  className="timer-progress" 
                  cx="50" 
                  cy="50" 
                  r="45"
                  style={{
                    strokeDashoffset: 283 - (283 * waitingTimer) / 30
                  }}
                />
              </svg>
              <div className="timer-content">
                <div className="timer-number">{waitingTimer}</div>
                <div className="timer-label">seconds</div>
              </div>
            </div>
            <h2>Finding opponents...</h2>
            <p>Please wait while we match you with other players</p>
            <p className="waiting-info">⏱️ Maximum wait time: 30 seconds</p>
            <button onClick={handleCancelMatch} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (countdown !== null && countdown >= 0) {
    return (
      <div className="race-page">
        <div className="container">
          <div className="time-display">
            <span className="time-icon">🕐</span>
            <span className="time-text">{formatTime(currentTime)}</span>
          </div>
          <div className="countdown-screen fade-in">
            <div className="traffic-lights">
              <div className={`traffic-light red ${trafficLight === 'red' ? 'active' : ''}`}></div>
              <div className={`traffic-light yellow ${trafficLight === 'yellow' ? 'active' : ''}`}></div>
              <div className={`traffic-light green ${trafficLight === 'green' ? 'active' : ''}`}></div>
            </div>
            <div className={`countdown-number ${countdown === 0 ? 'go' : ''}`}>
              {countdown === 0 ? 'GO!' : countdown}
            </div>
            <p>Get ready to race!</p>
          </div>
        </div>
      </div>
    );
  }

  if (raceResults || userFinished) {
    if (userFinished && !raceResults) {
      return (
        <div className="race-page">
          <div className="container">
            <div className="time-display">
              <span className="time-icon">🕐</span>
              <span className="time-text">{formatTime(currentTime)}</span>
            </div>
            <div className="results-screen fade-in">
              <h2 className="results-title">🎉 You Finished!</h2>
              <div className="user-result-card">
                <h3>Your Performance</h3>
                <div className="user-result-stats">
                  <div className="stat">
                    <span className="stat-label">WPM:</span>
                    <span className="stat-value">{userWPM}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Accuracy:</span>
                    <span className="stat-value">{userAccuracy}%</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Errors:</span>
                    <span className="stat-value">{errors}</span>
                  </div>
                </div>
              </div>
              <p className="waiting-text">Waiting for other players to finish...</p>
              <div className="race-track mini-track">
                {players.map((player) => (
                  <div key={player.socketId} className="racer-lane">
                    <div className="racer-info">
                      <span className="racer-name">
                        {player.username}
                        {player.finished && ' ✅'}
                      </span>
                      <span className="racer-wpm">{player.wpm} WPM</span>
                    </div>
                    <div className="progress-track">
                      <div 
                        className={`racer-car ${player.finished ? 'finished' : ''}`}
                        style={{ left: `${player.progress}%` }}
                      >
                        🏎️
                      </div>
                      <div className="finish-line">🏁</div>
                    </div>
                  </div>
                ))}
              </div>
              <RaceChat />
              <div className="results-actions">
                <button onClick={handleNewRace} className="btn btn-primary">
                  Race Again
                </button>
                <button onClick={handleBackToHome} className="btn btn-secondary">
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const sortedResults = [...raceResults].sort((a, b) => a.position - b.position);
    const userResult = sortedResults.find(r => r.username === user.username);

    return (
      <div className="race-page">
        <div className="container">
          <div className="time-display">
            <span className="time-icon">🕐</span>
            <span className="time-text">{formatTime(currentTime)}</span>
          </div>
          <div className="results-screen fade-in">
            <h2 className="results-title">🏁 Race Finished!</h2>
            {raceEndReason && (
              <div className="race-end-reason">
                <p>{raceEndReason}</p>
              </div>
            )}
            <div className="podium">
              {sortedResults.slice(0, 3).map((result, index) => (
                <div key={index} className={`podium-place place-${index + 1}`}>
                  <div className="podium-position">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className="podium-username">{result.username}</div>
                  <div className="podium-stats">
                    <div>{result.wpm} WPM</div>
                    <div>{result.accuracy}% Accuracy</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="results-table">
              <h3>Full Results</h3>
              <table>
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Player</th>
                    <th>WPM</th>
                    <th>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((result) => (
                    <tr key={result.username} className={result.username === user.username ? 'user-row' : ''}>
                      <td>#{result.position}</td>
                      <td>{result.username}</td>
                      <td>{result.wpm}</td>
                      <td>{result.accuracy}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {userResult && (
              <div className="user-result-card">
                <h3>Your Performance</h3>
                <div className="user-result-stats">
                  <div className="stat">
                    <span className="stat-label">Position:</span>
                    <span className="stat-value">#{userResult.position}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">WPM:</span>
                    <span className="stat-value">{userResult.wpm}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Accuracy:</span>
                    <span className="stat-value">{userResult.accuracy}%</span>
                  </div>
                </div>
              </div>
            )}
            <RaceChat />
            <div className="results-actions">
              <button onClick={handleNewRace} className="btn btn-primary">
                Race Again
              </button>
              <button onClick={handleBackToHome} className="btn btn-secondary">
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isRacing) {
    return (
      <div className="race-page">
        <div className="container">
          {/* Notification banners */}
          {disconnectedPlayer && (
            <div className="notification-banner warning">
              <span className="notification-icon">⚠️</span>
              <span>
                {disconnectedPlayer.username} disconnected
                {disconnectedPlayer.willReconnect && ` (${disconnectedPlayer.gracePeriod}s to reconnect)`}
              </span>
            </div>
          )}
          {reconnectedPlayer && (
            <div className="notification-banner success">
              <span className="notification-icon">✅</span>
              <span>{reconnectedPlayer} reconnected</span>
            </div>
          )}
          {playerLeftInfo && (
            <div className="notification-banner info">
              <span className="notification-icon">🚪</span>
              <span>
                {playerLeftInfo.username} {playerLeftInfo.reason === 'timeout' ? 'was removed (timeout)' : 'left the race'}
              </span>
            </div>
          )}
          
          <div className="time-display">
            <span className="time-icon">🕐</span>
            <span className="time-text">{formatTime(currentTime)}</span>
          </div>
          <div className="race-screen fade-in">
            <div className="race-track">
              <h3>Race Progress</h3>
              {players.map((player) => (
                <div key={player.socketId} className={`racer-lane ${player.isConnected === false ? 'disconnected' : ''}`}>
                  <div className="racer-info">
                    <span className="racer-name">
                      {player.username}
                      {player.username === user.username && ' (You)'}
                      {player.isConnected === false && ' 🔴'}
                    </span>
                    <span className="racer-wpm">{player.wpm} WPM</span>
                  </div>
                  <div className="progress-track">
                    <div 
                      className={`racer-car ${player.finished ? 'finished' : ''} ${player.isConnected === false ? 'paused' : ''}`}
                      style={{ left: `${player.progress}%` }}
                    >
                      🏎️
                    </div>
                    <div className="finish-line">🏁</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="typing-area">
              <div className="text-display">
                {raceText.split('').map((char, index) => {
                  let className = 'char';
                  if (index < typedText.length) {
                    className += typedText[index] === char ? ' correct' : ' incorrect';
                  } else if (index === typedText.length) {
                    className += ' current';
                  }
                  return (
                    <span key={index} className={className}>
                      {char}
                    </span>
                  );
                })}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={typedText}
                onChange={handleTyping}
                className="typing-input"
                placeholder="Start typing..."
                autoFocus
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                disabled={userFinished}
              />
            </div>
            <div className="race-stats">
              <div className="stat-item">
                <div className="stat-label">Progress</div>
                <div className="stat-value">{Math.floor(userProgress)}%</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">WPM</div>
                <div className="stat-value">{userWPM}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Accuracy</div>
                <div className="stat-value">{userAccuracy}%</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Errors</div>
                <div className="stat-value">{errors}</div>
              </div>
            </div>
            <div className="race-actions">
              <button 
                className="btn btn-danger" 
                onClick={handleLeaveRace}
                title="Leave current race"
              >
                🚪 Leave Race
              </button>
            </div>
            <RaceChat />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="race-page">
      <div className="container">
        <div className="time-display">
          <span className="time-icon">🕐</span>
          <span className="time-text">{formatTime(currentTime)}</span>
        </div>
        <div className="race-lobby fade-in">
          <h2>🏁 Ready to Race?</h2>
          <p>Click the button below to find opponents and start racing!</p>
          <button onClick={handleFindMatch} className="btn btn-primary btn-large pulse">
            Find Match
          </button>
        </div>
      </div>
    </div>
  );
};

export default Race;
