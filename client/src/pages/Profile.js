import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getRaceHistory } from '../store/slices/raceSlice';
import axios from 'axios';
import './Profile.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Profile = () => {
  const { username } = useParams();
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.auth);
  const { history } = useSelector((state) => state.race);
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUser && currentUser.username === username;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/api/user/profile/${username}`);
        setProfileUser(response.data.user);

        if (isOwnProfile) {
          dispatch(getRaceHistory());
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, isOwnProfile, dispatch]);

  if (loading) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="loading">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="error-message">User not found</div>
          <Link to="/" className="btn btn-primary">Back to Home</Link>
        </div>
      </div>
    );
  }

  const xpForNextLevel = (profileUser.level) * 100;
  const xpProgress = (profileUser.experience % 100);

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-header fade-in">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {profileUser.username.charAt(0).toUpperCase()}
            </div>
            <div className="level-badge">Lv. {profileUser.level}</div>
          </div>
          <div className="profile-info">
            <h1 className="profile-username">{profileUser.username}</h1>
            <div className="experience-bar">
              <div className="xp-label">
                {xpProgress} / 100 XP to Level {profileUser.level + 1}
              </div>
              <div className="xp-bar">
                <div 
                  className="xp-progress" 
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="profile-stats fade-in">
          <h2 className="section-title">Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🏁</div>
              <div className="stat-value">{profileUser.stats?.totalRaces || 0}</div>
              <div className="stat-label">Total Races</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <div className="stat-value">{profileUser.stats?.totalWins || 0}</div>
              <div className="stat-label">Total Wins</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-value">{profileUser.stats?.highestWPM || 0}</div>
              <div className="stat-label">Highest WPM</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-value">{profileUser.stats?.averageWPM || 0}</div>
              <div className="stat-label">Average WPM</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-value">{profileUser.stats?.averageAccuracy || 0}%</div>
              <div className="stat-label">Avg Accuracy</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-value">{profileUser.stats?.totalWordsTyped || 0}</div>
              <div className="stat-label">Words Typed</div>
            </div>
          </div>
        </div>

        {isOwnProfile && history && history.length > 0 && (
          <div className="profile-history fade-in">
            <h2 className="section-title">Race History</h2>
            <div className="history-card card">
              <div className="history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Position</th>
                      <th>WPM</th>
                      <th>Accuracy</th>
                      <th>Players</th>
                      <th>Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 10).map((race) => {
                      const raceDate = new Date(race.date);
                      const dateStr = raceDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });
                      const timeStr = raceDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                      });
                      
                      return (
                        <tr key={race.id} className={race.position === 1 ? 'win-row' : ''}>
                          <td>
                            <div className="date-time-cell">
                              <div className="date-part">{dateStr}</div>
                              <div className="time-part">{timeStr}</div>
                            </div>
                          </td>
                          <td className="position-cell">
                            {race.position === 1 && '🥇'}
                            {race.position === 2 && '🥈'}
                            {race.position === 3 && '🥉'}
                            {race.position > 3 && `#${race.position}`}
                          </td>
                          <td>{race.wpm}</td>
                          <td>{race.accuracy}%</td>
                          <td>{race.participants}</td>
                          <td>{race.winner}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="profile-actions">
          {isOwnProfile ? (
            <Link to="/race" className="btn btn-primary">
              Start Racing
            </Link>
          ) : (
            <Link to="/leaderboard" className="btn btn-primary">
              View Leaderboard
            </Link>
          )}
          <Link to="/" className="btn btn-secondary">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Profile;
