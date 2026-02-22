import { useState } from 'react'
import './App.css'
import { Login } from './components/Login'
import { Lobby } from './components/Lobby'
import { GameBoard } from './components/GameBoard'
import { GameFinished } from './components/GameFinished'
import { Leaderboard } from './components/Leaderboard'
import { api } from './services/api'

type ScreenMode = 'LOGIN' | 'LOBBY' | 'GAME' | 'FINISHED' | 'LEADERBOARD';

function App() {
  const [user, setUser] = useState<{ id: string; phone: string } | null>(null);
  const [lastServerState, setLastServerState] = useState<any>(null);
  const [lastEndedState, setLastEndedState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync screen mode based on lastServerState
  const getScreenMode = (): ScreenMode => {
    if (!user) return 'LOGIN';
    if (!lastServerState) return 'LOBBY';

    // Leaderboard detection
    if (lastServerState.top10) return 'LEADERBOARD';

    // Game status detection
    if (lastServerState.status === 'ACTIVE') return 'GAME';
    if (['WON', 'FAILED_GUESSES', 'FAILED_HINTS', 'FAILED_TIMEOUT', 'ENDED_EXIT'].includes(lastServerState.status)) {
      return 'FINISHED';
    }

    // Default to Lobby for theme selection
    return 'LOBBY';
  };

  const screen = getScreenMode();

  const handleStateUpdate = (newState: any) => {
    setLastServerState(newState);
    setError(null);

    // Cache ENDED state for leaderboard "Back" button
    if (['WON', 'FAILED_GUESSES', 'FAILED_HINTS', 'FAILED_TIMEOUT', 'ENDED_EXIT'].includes(newState.status)) {
      setLastEndedState(newState);
    }
  };

  const handleLogin = (u: { id: string; phone: string }) => {
    setUser(u);
    setLastServerState(null); // Reset state so Lobby can fetch fresh menu
  };

  const handleDtmf = async (digit: number) => {
    if (!user) return;

    // Explicit exit redirection
    if (digit === 9) {
      handleLogout();
      return;
    }

    setIsLoading(true);
    try {
      let res;
      if (lastServerState?.session_id) {
        res = await api.gameInput(lastServerState.session_id, digit);
      } else {
        res = await api.lobbyInput(user.id, digit);
      }

      if (res.status === 'ENDED_EXIT') {
        handleLogout();
      } else {
        handleStateUpdate(res);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuess = async (text: string) => {
    if (!lastServerState?.session_id) return;
    const normalized = text.trim().replace(/\s+/g, ' ');
    if (!normalized || normalized.length > 80) {
      setError('Enter a valid guess (1-80 characters).');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.gameGuess(lastServerState.session_id, normalized);
      handleStateUpdate(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };


  const handleLogout = () => {
    setUser(null);
    setLastServerState(null);
    setLastEndedState(null);
    setError(null);
  };

  return (
    <div className="app-shell">
      {error && (
        <div className="error-banner" style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: '#ef4444', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}

      {screen === 'LOGIN' && <Login onLogin={handleLogin} />}

      {screen === 'LOBBY' && user && (
        <Lobby
          userId={user.id}
          onGameStart={handleStateUpdate}
          externalState={lastServerState}
          onAction={handleDtmf}
          loading={isLoading}
        />
      )}

      {screen === 'GAME' && lastServerState && (
        <GameBoard
          session={lastServerState}
          onDtmf={handleDtmf}
          onGuess={handleGuess}
          loading={isLoading}
        />
      )}

      {screen === 'FINISHED' && lastServerState && (
        <GameFinished
          session={lastServerState}
          onNavigate={handleDtmf}
          loading={isLoading}
        />
      )}

      {screen === 'LEADERBOARD' && lastServerState && (
        <Leaderboard
          data={lastServerState}
          onBack={() => setLastServerState(lastEndedState)}
        />
      )}

      {/* Footer info */}
      <div style={{ position: 'fixed', bottom: '1rem', left: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {user && (
          <button
            onClick={handleLogout}
            style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Logout ({user.phone})
          </button>
        )}
      </div>
      <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
        AI-Genie v1.0.0
      </div>
    </div>
  )
}

export default App
