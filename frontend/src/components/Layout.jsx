import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, Outlet } from 'react-router-dom';
import './Layout.css';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; 

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  useEffect(() => {
    const performLogout = () => {
      console.log("Inactivity timer expired. Logging out.");
      handleLogout();
    };

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(performLogout, INACTIVITY_TIMEOUT_MS);
    };

    const activityEvents = [
      'mousemove',
      'keydown',
      'click',
      'scroll',
      'touchstart',
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
    
  }, [handleLogout]);

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-logo">
          <Link to="/">Printer Portal</Link>
        </div>
        <nav className="app-nav">
          <Link to="/">Dashboard</Link>
          <Link to="/printers">My Printers</Link>
          <Link to="/inventory">Ink Inventory</Link>
          <Link to="/settings">Settings</Link>
        </nav>
        
        <div className="header-user">
          <span>{user ? user.email : 'User'}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;