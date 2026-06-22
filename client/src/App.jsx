import { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import './App.css';

import InstructionsPage from './pages/InstructionsPage';
import LoginPage from './pages/LoginPage';
import RankingPage from './pages/RankingPage';
import GamePage from './pages/GamePage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCurrentSession = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/sessions/current', {
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkCurrentSession();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3001/api/sessions/current', {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch (error) {
      // do nothing for now
    }

    setUser(null);
  };

  if (loading) {
    return <div className="container py-4">Loading...</div>;
  }

  return (
    <>
      <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom px-3 sticky-top">
        <Link className="navbar-brand fw-bold" to="/">
          Last Race
        </Link>

        <div className="navbar-nav me-auto">
          <Link className="nav-link" to="/">
            Instructions
          </Link>

          {user && (
            <>
              <Link className="nav-link" to="/ranking">
                Ranking
              </Link>
              <Link className="nav-link" to="/game">
                Game
              </Link>
            </>
          )}
        </div>

        <div className="d-flex align-items-center gap-2">
          {user ? (
            <>
              <span className="small text-muted">Hello, {user.username}</span>
              <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <Link className="btn btn-outline-primary btn-sm" to="/login">
              Login
            </Link>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<InstructionsPage />} />
        <Route path="/login" element={<LoginPage user={user} onLogin={handleLogin} />} />
        <Route
          path="/ranking"
          element={
            <ProtectedRoute user={user}>
              <RankingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game"
          element={
            <ProtectedRoute user={user}>
              <GamePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;