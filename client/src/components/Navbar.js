import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import './Navbar.css';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          🏁 TypeRacer
        </Link>
        
        <div className="navbar-menu">
          <Link to="/" className="navbar-link">Home</Link>
          {isAuthenticated && (
            <Link to="/race" className="navbar-link">Race</Link>
          )}
          <Link to="/practice" className="navbar-link">Practice</Link>
          <Link to="/leaderboard" className="navbar-link">Leaderboard</Link>
          
          {isAuthenticated ? (
            <>
              <Link to={`/profile/${user?.username}`} className="navbar-link">
                Profile
              </Link>
              <Link to="/settings" className="navbar-link">
                ⚙️
              </Link>
              <button onClick={handleLogout} className="btn btn-secondary">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
