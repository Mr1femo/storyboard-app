import { computed } from 'vue';
import { token, user } from '../api/authToken';

const STORAGE_KEY = 'raccoon_session';

function loadSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    user.value = data.user;
    token.value = data.token;
  } catch {
    clearSession();
  }
}

function saveSession(session) {
  user.value = session.user;
  token.value = session.token;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  user.value = null;
  token.value = null;
  sessionStorage.removeItem(STORAGE_KEY);
}

loadSession();

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isClient = computed(() => user.value?.role === 'client');

  function login(session) {
    saveSession(session);
  }

  function logout() {
    clearSession();
  }

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    isClient,
    login,
    logout,
  };
}
