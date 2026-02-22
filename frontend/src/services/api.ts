const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const request = async (endpoint: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'API Request failed' }));
    throw new Error(error.message || 'API Request failed');
  }
  return res.json();
};

export const api = {
  login: (phone: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  getThemes: () => request('/game/themes'),

  getLobbyMenu: (user_id: string) =>
    request('/lobby/menu', {
      method: 'POST',
      body: JSON.stringify({ user_id }),
    }),

  lobbyInput: (user_id: string, digit: number) =>
    request('/lobby/input/dtmf', {
      method: 'POST',
      body: JSON.stringify({ user_id, digit }),
    }),

  startGame: (theme_id: string, user_id: string) =>
    request('/game/start', {
      method: 'POST',
      body: JSON.stringify({ theme_id, user_id }),
    }),

  gameInput: (session_id: string, digit: number) =>
    request('/game/input/dtmf', {
      method: 'POST',
      body: JSON.stringify({ session_id, digit }),
    }),

  gameGuess: (session_id: string, text: string) =>
    request('/game/guess', {
      method: 'POST',
      body: JSON.stringify({ session_id, text }),
    }),
};
