import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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
  const [keystrokes, setKeystrokes] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [hasInputError, setHasInputError] = useState(false);
  const [totalCompletedWords, setTotalCompletedWords] = useState(0);
  const [totalTypedPosition, setTotalTypedPosition] = useState(0);
  const [totalCorrectChars, setTotalCorrectChars] = useState(0);
  const [raceCompletionTime, setRaceCompletionTime] = useState(0);
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

  // Clear input field on mount/reload
  useEffect(() => {
    // Only clear if not reconnecting to an active race
    if (!isRacing && !userFinished) {
      setTypedText('');
    }
  }, []);

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
    const socket = socketService.connect();

    // Register user first if logged in
    if (user) {
      socketService.registerUser({
        username: user.username,
        userId: user.id,
        isGuest: false
      });
    }

    // Small delay to ensure registration completes before reconnection
    const reconnectTimeout = setTimeout(() => {
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
    }, 100); // 100ms delay to ensure registration is sent

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
      
      // Stop the 30-second timer countdown
      setWaitingTimer(0);
      
      // Keep waiting state true until countdown starts
      // This prevents flickering to lobby screen
      dispatch(setRaceReady(data));
      
      // Save roomId to localStorage for reconnection
      if (data.roomId) {
        localStorage.setItem('activeRaceRoom', data.roomId);
      }
    });

    socketService.onPlayerJoinedCountdown((data) => {
      // Update players list when someone joins during countdown
      dispatch(updatePlayers(data.players));
    });

    socketService.onCountdown((count) => {
      // First countdown event, stop showing waiting screen
      if (count === 10) {
        dispatch(setWaiting(false));
        // Clear waiting timer
        if (waitingTimeoutRef.current) {
          clearInterval(waitingTimeoutRef.current);
          waitingTimeoutRef.current = null;
        }
      }
      
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
        remainingPlayers: data.remainingPlayers || 'unknown',
        reason: 'timeout'
      });
      setTimeout(() => setPlayerLeftInfo(null), 3000);
    });

    socketService.onRaceCountdownCancelled((data) => {
      // Race cancelled during countdown
      localStorage.removeItem('activeRaceRoom');
      dispatch(resetRace());
      alert(data.message || 'Race was cancelled');
    });

    socketService.onReconnectSuccess((data) => {
      console.log('Reconnection successful:', data);
      
      // Restore race state from server
      dispatch(setRaceReady({
        roomId: data.roomId,
        players: data.players,
        text: data.text
      }));
      
      // Check if user has already finished in this race
      const userPlayer = data.players?.find(p => p.username === user?.username);
      if (userPlayer?.finished) {
        // User already finished, show results instead of racing
        setUserFinished(true);
        dispatch(updateProgress({
          progress: 100,
          wpm: userPlayer.wpm || 0,
          accuracy: userPlayer.accuracy || 100
        }));
        
        // Restore completion time from localStorage or calculate from server data
        const savedTime = localStorage.getItem('raceCompletionTime');
        if (savedTime) {
          setRaceCompletionTime(parseInt(savedTime, 10));
        } else if (data.startTime && userPlayer.finishTime) {
          setRaceCompletionTime(userPlayer.finishTime - data.startTime);
        } else if (data.startTime) {
          // Estimate from current time minus start time (fallback)
          setRaceCompletionTime(Date.now() - data.startTime);
        }
        
        // Don't restore typed text for finished users
        setTypedText('');
        return;
      }
      
      if (data.status === 'countdown') {
        // Restore countdown state
        if (data.countdown !== undefined) {
          dispatch(setCountdown(data.countdown));
        }
      } else if (data.status === 'racing') {
        dispatch(startRace());
        // Only restore progress state, NOT the typed text
        // This avoids input field issues on reload
        if (data.userProgress !== undefined) {
          dispatch(updateProgress({
            progress: data.userProgress,
            wpm: data.userWPM || 0,
            accuracy: data.userAccuracy || 100
          }));
          
          // Calculate position but don't restore typed text
          // User will need to continue from current word
          const normalizedText = data.text.replace(/\s+/g, ' ').trim();
          const chars = Math.floor((data.userProgress / 100) * normalizedText.length);
          setTotalTypedPosition(chars);
          
          // Find completed words count
          const words = normalizedText.split(' ');
          let charCount = 0;
          let wordCount = 0;
          for (let i = 0; i < words.length; i++) {
            charCount += words[i].length + 1; // +1 for space
            if (charCount <= chars) {
              wordCount = i + 1;
            } else {
              break;
            }
          }
          setTotalCompletedWords(wordCount);
          
          // Clear typed text - user starts fresh on current word
          setTypedText('');
        }
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } else if (data.status === 'finished') {
        // Race already finished
        setUserFinished(true);
        dispatch(finishRace(data.results || []));
      }
    });

    socketService.onReconnectFailed((data) => {
      console.log('Reconnection failed:', data.message);
      localStorage.removeItem('activeRaceRoom');
      dispatch(resetRace());
      // Show message to user
      if (data.message) {
        alert(data.message);
      }
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
      toast.error('Session expired. Please sign in again.', { icon: '🔒' });
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
      clearTimeout(reconnectTimeout);
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
      socketService.off('raceCountdownCancelled');
      socketService.off('playerJoinedCountdown');
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
    // Clear any existing timer first
    if (waitingTimeoutRef.current) {
      clearInterval(waitingTimeoutRef.current);
      waitingTimeoutRef.current = null;
    }

    // Set waiting state immediately to prevent flickering
    dispatch(setWaiting(true));
    setWaitingTimer(30); // Reset to 30 seconds
    
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
    
    // Normalize raceText - replace newlines and multiple spaces with single space
    const normalizedRaceText = raceText.replace(/\s+/g, ' ').trim();
    const raceWords = normalizedRaceText.split(' ');
    
    // Get the current word we're typing (based on completed words count)
    const currentExpectedWord = raceWords[totalCompletedWords] || '';
    const isLastWord = totalCompletedWords === raceWords.length - 1;
    
    // Track keystrokes and errors for new characters
    if (value.length > typedText.length) {
      const newCharIndex = value.length - 1;
      const newChar = value[newCharIndex];
      const expectedChar = currentExpectedWord[newCharIndex];
      
      setKeystrokes(prev => prev + 1);
      
      // Track errors - if typed char doesn't match expected
      if (newChar !== expectedChar) {
        setErrorCount(prev => prev + 1);
      } else {
        setTotalCorrectChars(prev => prev + 1);
      }
    }
    
    // Check ENTIRE typed text against expected word for error state
    // This handles the edge case where first char is wrong but second is correct
    const currentTyped = value.replace(/\s+$/, '');
    let hasError = false;
    for (let i = 0; i < currentTyped.length; i++) {
      if (currentTyped[i] !== currentExpectedWord[i]) {
        hasError = true;
        break;
      }
    }
    setHasInputError(hasError);
    
    const typedWord = value.trimEnd();
    
    // Check if user typed the LAST word completely (no space needed)
    if (isLastWord && typedWord === currentExpectedWord && typedWord.length === currentExpectedWord.length) {
      // Race finished!
      const completionTime = Date.now() - startTime;
      setRaceCompletionTime(completionTime);
      // Store for persistence on reload
      localStorage.setItem('raceCompletionTime', completionTime.toString());
      
      // Calculate final stats
      const timeElapsedMinutes = completionTime / 1000 / 60;
      const grossWPM = timeElapsedMinutes > 0 ? Math.round((normalizedRaceText.length / 5) / timeElapsedMinutes) : 0;
      const wpm = Math.max(0, grossWPM);
      const accuracy = keystrokes > 0 ? Math.floor(((keystrokes - errorCount) / keystrokes) * 100) : 100;
      
      setUserFinished(true);
      setHasInputError(false);
      
      dispatch(updateProgress({ progress: 100, wpm, accuracy }));
      
      socketService.updateProgress({
        roomId,
        progress: 100,
        wpm,
        accuracy,
        typed: ''
      });
      
      socketService.playerFinished({
        roomId,
        wpm,
        accuracy,
        completionTime
      });
      return;
    }
    
    // Check if user typed a complete word with space (not last word)
    if (!isLastWord && value.endsWith(' ') && typedWord.length > 0) {
      if (typedWord === currentExpectedWord) {
        // Correct word typed! Clear input and update progress
        const newTotalCompleted = totalCompletedWords + 1;
        setTotalCompletedWords(newTotalCompleted);
        setKeystrokes(prev => prev + 1); // Count the space as keystroke
        
        // Calculate completed characters (all words up to this point)
        let completedChars = 0;
        for (let i = 0; i < newTotalCompleted; i++) {
          completedChars += raceWords[i].length;
          if (i < raceWords.length - 1) completedChars += 1; // Add space between words
        }
        
        // Update total typed position (including the space)
        setTotalTypedPosition(completedChars);
        
        const progress = Math.min((completedChars / normalizedRaceText.length) * 100, 100);
        
        // Standard WPM calculation: (Characters / 5) / Time in minutes
        const timeElapsedMinutes = (Date.now() - startTime) / 1000 / 60;
        const grossWPM = timeElapsedMinutes > 0 ? Math.round((completedChars / 5) / timeElapsedMinutes) : 0;
        const wpm = Math.max(0, grossWPM);
        
        // Accuracy = (Total keystrokes - Errors) / Total keystrokes * 100
        const totalKeystrokes = keystrokes + 1; // Include current space
        const accuracy = totalKeystrokes > 0 ? Math.floor(((totalKeystrokes - errorCount) / totalKeystrokes) * 100) : 100;
        
        // Clear input
        e.target.value = '';
        setTypedText('');
        setHasInputError(false);
        
        dispatch(updateProgress({ progress, wpm, accuracy }));
        
        socketService.updateProgress({
          roomId,
          progress,
          wpm,
          accuracy,
          typed: ''
        });
        return;
      }
    }
    
    // Update typed text for current word in progress
    setTypedText(value);
    
    // Progress is calculated only based on completed words (not partial characters)
    // This keeps progress stable and only updates on word completion
    
    const progress = Math.min((completedChars / normalizedRaceText.length) * 100, 100);
    
    // Standard WPM calculation
    const timeElapsedMinutes = (Date.now() - startTime) / 1000 / 60;
    const grossWPM = timeElapsedMinutes > 0 ? Math.round((completedChars / 5) / timeElapsedMinutes) : 0;
    const wpm = Math.max(0, grossWPM);
    
    // Accuracy = (Total keystrokes - Errors) / Total keystrokes * 100
    const accuracy = keystrokes > 0 ? Math.floor(((keystrokes - errorCount) / keystrokes) * 100) : 100;
    
    dispatch(updateProgress({ progress, wpm, accuracy }));
    
    socketService.updateProgress({
      roomId,
      progress,
      wpm,
      accuracy,
      typed: value
    });
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (chatInput.trim() && roomId) {
      socketService.sendRaceChat(roomId, chatInput.trim());
      setChatInput('');
    }
  };

  const handleNewRace = () => {
    // First leave the current race if any
    if (roomId) {
      socketService.leaveRace(roomId);
    }
    dispatch(resetRace());
    setTypedText('');
    setKeystrokes(0);
    setErrorCount(0);
    setHasInputError(false);
    setTotalCompletedWords(0);
    setTotalTypedPosition(0);
    setTotalCorrectChars(0);
    setRaceCompletionTime(0);
    setUserFinished(false);
    setChatMessages([]);
    setRaceEndReason(null);
    setDisconnectedPlayer(null);
    setReconnectedPlayer(null);
    setPlayerLeftInfo(null);
    setTrafficLight(null);
    localStorage.removeItem('activeRaceRoom');
    localStorage.removeItem('raceCompletionTime');
    
    // Small delay to ensure server processes the leave before joining new queue
    setTimeout(() => {
      handleFindMatch();
    }, 100);
  };

  const handleLeaveRace = () => {
    if (roomId) {
      socketService.leaveRace(roomId);
      localStorage.removeItem('activeRaceRoom');
      localStorage.removeItem('raceCompletionTime');
      dispatch(resetRace());
      setTypedText('');
      setKeystrokes(0);
      setErrorCount(0);
      setHasInputError(false);
      setTotalCompletedWords(0);
      setTotalTypedPosition(0);
      setTotalCorrectChars(0);
      setRaceCompletionTime(0);
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
      localStorage.removeItem('raceCompletionTime');
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
                    strokeDashoffset: roomId ? 0 : 283 - (283 * waitingTimer) / 30
                  }}
                />
              </svg>
              <div className="timer-content">
                <div className="timer-number">{roomId ? '✓' : waitingTimer}</div>
                <div className="timer-label">{roomId ? 'Matched!' : 'seconds'}</div>
              </div>
            </div>
            <h2>{roomId ? 'Match Found! Preparing race...' : 'Finding opponents...'}</h2>
            <p>{roomId ? 'Get ready, countdown starting soon!' : 'Please wait while we match you with other players'}</p>
            {!roomId && <p className="waiting-info">⏱️ Maximum wait time: 30 seconds</p>}
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
            <div className={`countdown-number ${countdown <= 1 ? 'go' : ''}`}>
              {countdown === 0 ? 'GO!' : countdown === 1 ? 'GO!' : countdown}
            </div>
            <p>{countdown <= 1 ? 'Race starting now!' : 'Get ready to race!'}</p>
            {players.length < 4 && countdown > 0 && (
              <div className="joining-notice">
                <span>🎮 {players.length}/4 players</span>
                <span className="joining-subtext">More players can join during countdown!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show countdown or race prep screen if roomId exists (prevents lobby flashing)
  if (roomId && !isRacing && !raceResults && !userFinished) {
    return (
      <div className="race-page">
        <div className="container">
          <div className="race-starting-screen">
            <div className="starting-animation">
              <div className="racing-car-animation">🏎️</div>
              <div className="speed-lines">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div className="starting-text-container">
              <h1 className="starting-title">GET READY!</h1>
              <div className="starting-subtitle">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (raceResults || userFinished) {
    // Sort players by WPM for display order (highest first)
    const sortedPlayers = [...players].sort((a, b) => b.wpm - a.wpm);
    const carEmojis = ['🏎️', '🏎️', '🏎️', '🏎️'];
    
    // Calculate time display
    const timeMs = raceCompletionTime || 0;
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    const timeDisplay = `${minutes}:${String(seconds).padStart(2, '0')}`;
    
    // Find user's position
    const userPosition = sortedPlayers.findIndex(p => p.username === user?.username) + 1;
    const positionText = userPosition === 1 ? '1st' : userPosition === 2 ? '2nd' : userPosition === 3 ? '3rd' : `${userPosition}th`;
    
    const finishedCount = players.filter(p => p.finished).length;
    const totalPlayers = players.length;
    const isWaitingForOthers = userFinished && !raceResults;
    const allPlayersFinished = finishedCount === totalPlayers;
    
    // Helper function to format player name with (you)
    const formatPlayerName = (playerUsername, isCurrentUser, maxLen = 8) => {
      if (isCurrentUser) {
        const suffix = ' (you)';
        const availableLen = maxLen - 3; // Leave room for "..."
        if (playerUsername.length > availableLen) {
          return playerUsername.slice(0, availableLen) + '...' + suffix;
        }
        return playerUsername + suffix;
      }
      if (playerUsername.length > maxLen) {
        return playerUsername.slice(0, maxLen) + '...';
      }
      return playerUsername;
    };
    
    return (
      <div className="race-page">
        <div className="container">
          <div className="final-results-screen fade-in">
            <div className="final-header">
              <h2 className="final-title">
                {allPlayersFinished ? 'The race has ended.' : `You finished ${positionText}!`}
              </h2>
              <div className="final-time">{timeDisplay}</div>
            </div>
            
            {raceEndReason && (
              <div className="race-end-reason">
                <p>{raceEndReason}</p>
              </div>
            )}
            
            <div className="final-race-lanes">
              {sortedPlayers.map((player, index) => {
                // Position car: finished players at 85%, others progress from 10% to 85%
                const carPosition = player.finished 
                  ? 85
                  : 10 + ((player.progress / 100) * 75);
                return (
                  <div key={player.socketId || player.username} className="final-lane">
                    <div className="lane-track">
                      <span className="lane-player-name" title={player.username}>
                        {formatPlayerName(player.username, player.username === user?.username)}
                      </span>
                      <div 
                        className={`lane-car lane-car-${index + 1}`}
                        style={{ left: `${carPosition}%` }}
                      >
                        {carEmojis[index] || '🏎️'}
                      </div>
                      <div className="lane-stats">
                        {player.finished ? (
                          <>
                            <span className="lane-position">
                              {index + 1 === 1 ? '1st Place!' : index + 1 === 2 ? '2nd Place.' : index + 1 === 3 ? '3rd Place.' : `${index + 1}th Place.`}
                            </span>
                            <span className="lane-wpm">{player.wpm} wpm</span>
                          </>
                        ) : (
                          <span className="lane-wpm">{player.wpm} wpm</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {isWaitingForOthers && (
              <div className="waiting-indicator">
                <div className="waiting-spinner"></div>
                <span>Waiting for others ({finishedCount}/{totalPlayers} finished)</span>
              </div>
            )}
            
            <div className="final-actions">
              <button onClick={handleBackToHome} className="btn btn-warning btn-large">
                Main menu (leave race)
              </button>
              <button onClick={handleNewRace} className="btn btn-success btn-large">
                Race again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isRacing) {
    const carEmojis = ['🏎️', '🏎️', '🏎️', '🏎️'];
    
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
            <div className="race-lanes-container">
              <h3 className="race-lanes-title">Race Progress</h3>
              <div className="final-race-lanes">
                {players.map((player, index) => {
                  // Position car: finished at 85%, others progress from 10% to 85%
                  const carPosition = player.finished 
                    ? 85
                    : 10 + ((player.progress / 100) * 75);
                  return (
                    <div key={player.socketId} className={`final-lane ${player.isConnected === false ? 'disconnected' : ''}`}>
                      <div className="lane-track">
                        <span className="lane-player-name" title={player.username}>
                          {player.username === user?.username 
                            ? (player.username.length > 5 ? player.username.slice(0, 5) + '...(you)' : player.username + ' (you)')
                            : (player.username.length > 8 ? player.username.slice(0, 8) + '...' : player.username)}
                          {player.isConnected === false && ' 🔴'}
                        </span>
                        <div 
                          className={`lane-car lane-car-${index + 1} ${player.finished ? 'finished' : ''}`}
                          style={{ left: `${carPosition}%` }}
                        >
                          {carEmojis[index] || '🏎️'}
                        </div>
                        <div className="lane-stats">
                          {player.finished ? (
                            <>
                              <span className="lane-position">
                                {players.filter(p => p.finished).findIndex(p => p.socketId === player.socketId) + 1 === 1 ? '1st' : 
                                 players.filter(p => p.finished).findIndex(p => p.socketId === player.socketId) + 1 === 2 ? '2nd' : 
                                 players.filter(p => p.finished).findIndex(p => p.socketId === player.socketId) + 1 === 3 ? '3rd' : 
                                 `${players.filter(p => p.finished).findIndex(p => p.socketId === player.socketId) + 1}th`}
                              </span>
                              <span className="lane-wpm">{player.wpm} wpm</span>
                            </>
                          ) : (
                            <span className="lane-wpm">{player.wpm} wpm</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="typing-area">
              <div className="text-display">
                {raceText.replace(/\s+/g, ' ').trim().split('').map((char, index) => {
                  let className = 'char';
                  const currentPos = totalTypedPosition + typedText.length;
                  if (index < totalTypedPosition) {
                    // Already completed characters
                    className += ' correct';
                  } else if (index < currentPos) {
                    // Currently typing characters
                    const typedIndex = index - totalTypedPosition;
                    className += typedText[typedIndex] === char ? ' correct' : ' incorrect';
                  } else if (index === currentPos) {
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
                className={`typing-input ${hasInputError ? 'input-error' : ''}`}
                placeholder="Start typing..."
                autoFocus
                spellCheck={false}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                name="typeracer-input-field"
                id="typeracer-input-field"
                disabled={userFinished}
              />
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
