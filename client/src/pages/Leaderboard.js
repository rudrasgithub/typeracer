import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getGlobalLeaderboard, getWPMLeaderboard, getWinsLeaderboard } from '../store/slices/leaderboardSlice';
import './Leaderboard.css';

const Leaderboard = () => {
  const dispatch = useDispatch();
  const { globalLeaderboard, wpmLeaderboard, winsLeaderboard, loading } = useSelector(
    (state) => state.leaderboard
  );
  const [activeTab, setActiveTab] = useState('global');

  useEffect(() => {
    dispatch(getGlobalLeaderboard({ page: 1, limit: 100 }));
    dispatch(getWPMLeaderboard(100));
    dispatch(getWinsLeaderboard(100));
  }, [dispatch]);

  const renderLeaderboard = () => {
    let data = [];
    let columns = [];

    switch (activeTab) {
      case 'global':
        data = globalLeaderboard;
        columns = ['Rank', 'Username', 'Score', 'Avg WPM', 'Wins', 'Races'];
        break;
      case 'wpm':
        data = wpmLeaderboard;
        columns = ['Rank', 'Username', 'Highest WPM', 'Avg WPM', 'Accuracy'];
        break;
      case 'wins':
        data = winsLeaderboard;
        columns = ['Rank', 'Username', 'Total Wins', 'Win Rate', 'Total Races'];
        break;
      default:
        data = globalLeaderboard;
    }

    if (loading) {
      return <div className="loading">Loading leaderboard...</div>;
    }

    if (data.length === 0) {
      return <div className="no-data">No data available</div>;
    }

    return (
      <div className="leaderboard-table">
        <table>
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={index}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((entry, index) => (
              <tr key={entry._id} className={index < 3 ? `top-${index + 1}` : ''}>
                {activeTab === 'global' && (
                  <>
                    <td className="rank-cell">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `#${index + 1}`}
                    </td>
                    <td className="username-cell">
                      {entry.user?.username || entry.username}
                    </td>
                    <td>{entry.score}</td>
                    <td>{entry.averageWPM}</td>
                    <td>{entry.totalWins}</td>
                    <td>{entry.totalRaces}</td>
                  </>
                )}
                {activeTab === 'wpm' && (
                  <>
                    <td className="rank-cell">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `#${index + 1}`}
                    </td>
                    <td className="username-cell">
                      {entry.user?.username || entry.username}
                    </td>
                    <td className="highlight-cell">{entry.highestWPM}</td>
                    <td>{entry.averageWPM}</td>
                    <td>{entry.averageAccuracy}%</td>
                  </>
                )}
                {activeTab === 'wins' && (
                  <>
                    <td className="rank-cell">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `#${index + 1}`}
                    </td>
                    <td className="username-cell">
                      {entry.user?.username || entry.username}
                    </td>
                    <td className="highlight-cell">{entry.totalWins}</td>
                    <td>{entry.winRate?.toFixed(1)}%</td>
                    <td>{entry.totalRaces}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="leaderboard-page">
      <div className="container">
        <div className="leaderboard-header fade-in">
          <h1>🏆 Leaderboard</h1>
          <p>See how you rank against other players</p>
        </div>

        <div className="leaderboard-tabs">
          <button
            className={`tab-button ${activeTab === 'global' ? 'active' : ''}`}
            onClick={() => setActiveTab('global')}
          >
            🌍 Global
          </button>
          <button
            className={`tab-button ${activeTab === 'wpm' ? 'active' : ''}`}
            onClick={() => setActiveTab('wpm')}
          >
            ⚡ Highest WPM
          </button>
          <button
            className={`tab-button ${activeTab === 'wins' ? 'active' : ''}`}
            onClick={() => setActiveTab('wins')}
          >
            🏆 Most Wins
          </button>
        </div>

        <div className="leaderboard-content card fade-in">
          {renderLeaderboard()}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
