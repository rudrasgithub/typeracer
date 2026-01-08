import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import toast, { Toaster } from 'react-hot-toast';
import store from './store/store';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Race from './pages/Race';
import Practice from './pages/Practice';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#333',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/race" element={<ProtectedRoute><Race /></ProtectedRoute>} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </div>
      </Router>
    </Provider>
  );
}

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const token = localStorage.getItem('token');
  const location = useLocation();
  
  useEffect(() => {
    if (!token && !user) {
      toast.error('Please sign in to access this page', {
        id: 'auth-required', // Prevent duplicate toasts
        icon: '🔒',
      });
    }
  }, [token, user]);
  
  if (!token && !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  return children;
};

export default App;
