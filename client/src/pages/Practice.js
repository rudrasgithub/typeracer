import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import './Practice.css';

// Practice texts collection
const practiceTexts = [
  "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.",
  "Programming is the art of telling a computer what to do. It requires patience, logic, and creativity.",
  "In the world of technology, those who can type quickly have a significant advantage over others.",
  "Practice makes perfect. The more you type, the faster and more accurate you will become.",
  "JavaScript is a versatile programming language used for web development and much more.",
  "The best way to learn typing is through consistent practice and proper finger placement.",
  "React is a popular JavaScript library for building user interfaces and single-page applications.",
  "Coding bootcamps have become a popular way for people to learn programming skills quickly.",
  "Artificial intelligence is transforming the way we work, live, and interact with technology.",
  "The internet has revolutionized communication and made information accessible to everyone.",
  "Cloud computing allows users to access data and applications from anywhere in the world.",
  "Cybersecurity is crucial in protecting sensitive information from hackers and malicious attacks.",
  "Mobile applications have changed how we shop, communicate, and entertain ourselves.",
  "Data science combines statistics, programming, and domain expertise to extract insights.",
  "Version control systems like Git help developers track changes and collaborate effectively."
];

const Practice = () => {
  const [practiceText, setPracticeText] = useState('');
  const [typedText, setTypedText] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const inputRef = useRef(null);

  // Update current time every second
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Get random text
  const getRandomText = () => {
    const randomIndex = Math.floor(Math.random() * practiceTexts.length);
    return practiceTexts[randomIndex];
  };

  // Start practice
  const handleStart = () => {
    const newText = getRandomText();
    setPracticeText(newText);
    setTypedText('');
    setIsStarted(true);
    setIsFinished(false);
    setStartTime(Date.now());
    setWpm(0);
    setAccuracy(100);
    setErrors(0);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    
    toast.success('Practice started! Begin typing...');
  };

  // Handle typing
  const handleTyping = (e) => {
    if (!isStarted || isFinished) return;

    const value = e.target.value;
    
    // Calculate correct characters typed so far
    let correctChars = 0;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === practiceText[i]) {
        correctChars++;
      } else {
        break;
      }
    }

    // Calculate completed words - only count words that are fully typed correctly
    const typedWords = value.split(' ');
    const practiceWords = practiceText.split(' ');
    let completedWords = 0;

    for (let i = 0; i < typedWords.length - 1; i++) {
      if (typedWords[i] === practiceWords[i]) {
        completedWords++;
      } else {
        break;
      }
    }
    
    // Track errors
    if (value.length > typedText.length) {
      const lastChar = value[value.length - 1];
      const expectedChar = practiceText[value.length - 1];
      
      if (lastChar !== expectedChar) {
        setErrors(prev => prev + 1);
      }
    }
    
    setTypedText(value);

    // Calculate WPM based on completed words
    const timeElapsed = (Date.now() - startTime) / 1000 / 60;
    const calculatedWpm = timeElapsed > 0 ? Math.floor(completedWords / timeElapsed) : 0;
    setWpm(calculatedWpm);

    // Calculate accuracy
    const calculatedAccuracy = value.length > 0 ? Math.floor((correctChars / value.length) * 100) : 100;
    setAccuracy(calculatedAccuracy);

    // Check if finished
    if (value === practiceText) {
      setIsFinished(true);
      setIsStarted(false);
      toast.success(`Practice completed! WPM: ${calculatedWpm}, Accuracy: ${calculatedAccuracy}%`);
    }
  };

  // Reset practice
  const handleReset = () => {
    setPracticeText('');
    setTypedText('');
    setIsStarted(false);
    setIsFinished(false);
    setStartTime(null);
    setWpm(0);
    setAccuracy(100);
    setErrors(0);
  };

  // Calculate progress based on completed words
  const calculateProgress = () => {
    if (practiceText.length === 0) return 0;
    
    const typedWords = typedText.split(' ');
    const practiceWords = practiceText.split(' ');
    let completedWords = 0;
    let completedChars = 0;

    for (let i = 0; i < typedWords.length - 1; i++) {
      if (typedWords[i] === practiceWords[i]) {
        completedWords++;
        completedChars += practiceWords[i].length + 1; // +1 for space
      } else {
        break;
      }
    }

    // Check if current word being typed is correct so far
    const currentWordIndex = typedWords.length - 1;
    const currentTypedWord = typedWords[currentWordIndex] || '';
    const currentPracticeWord = practiceWords[currentWordIndex] || '';
    
    if (currentTypedWord && currentPracticeWord.startsWith(currentTypedWord)) {
      completedChars += currentTypedWord.length;
    }

    return (completedChars / practiceText.length) * 100;
  };

  const progress = calculateProgress();

  return (
    <div className="practice-page">
      <div className="container">
        {/* Time Display */}
        <div className="time-display">
          <span className="time-icon">🕐</span>
          <span className="time-text">{formatTime(currentTime)}</span>
        </div>

        <div className="practice-header">
          <h1>⌨️ Practice Typing</h1>
          <p>Improve your typing speed and accuracy with random texts</p>
        </div>

        {!isStarted && !isFinished && (
          <div className="practice-start-section fade-in">
            <div className="start-card">
              <h2>Ready to Practice?</h2>
              <p>Click the button below to start typing practice with a random text.</p>
              <button onClick={handleStart} className="btn btn-primary btn-large pulse">
                Start Practice
              </button>
            </div>
          </div>
        )}

        {(isStarted || isFinished) && (
          <div className="practice-area fade-in">
            {/* Stats Bar */}
            <div className="practice-stats">
              <div className="stat-item">
                <div className="stat-label">Progress</div>
                <div className="stat-value">{Math.floor(progress)}%</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">WPM</div>
                <div className="stat-value">{wpm}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Accuracy</div>
                <div className="stat-value">{accuracy}%</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Errors</div>
                <div className="stat-value">{errors}</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>

            {/* Text Display */}
            <div className="practice-text-display">
              {practiceText.split('').map((char, index) => {
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

            {/* Input */}
            {!isFinished && (
              <input
                ref={inputRef}
                type="text"
                value={typedText}
                onChange={handleTyping}
                className="practice-input"
                placeholder="Start typing here..."
                autoFocus
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
            )}

            {/* Results */}
            {isFinished && (
              <div className="practice-results">
                <h2>🎉 Practice Complete!</h2>
                <div className="results-grid">
                  <div className="result-card">
                    <span className="result-icon">⚡</span>
                    <span className="result-label">Speed</span>
                    <span className="result-value">{wpm} WPM</span>
                  </div>
                  <div className="result-card">
                    <span className="result-icon">🎯</span>
                    <span className="result-label">Accuracy</span>
                    <span className="result-value">{accuracy}%</span>
                  </div>
                  <div className="result-card">
                    <span className="result-icon">❌</span>
                    <span className="result-label">Errors</span>
                    <span className="result-value">{errors}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="practice-actions">
              <button onClick={handleStart} className="btn btn-primary">
                {isFinished ? 'Practice Again' : 'New Text'}
              </button>
              <button onClick={handleReset} className="btn btn-secondary">
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Practice;
