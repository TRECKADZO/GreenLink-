/**
 * Centralized token management service.
 * Abstracts storage mechanism for auth tokens.
 * Currently uses sessionStorage (safer than localStorage for XSS).
 * Can be migrated to httpOnly cookies in the future.
 */

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const USER_TYPE_KEY = 'userType';

// Use sessionStorage for sensitive data (cleared on tab close)
// Falls back to localStorage for backward compatibility during migration
const storage = typeof window !== 'undefined' ? window.sessionStorage : null;
const legacyStorage = typeof window !== 'undefined' ? window.localStorage : null;

export const tokenService = {
  getToken: () => {
    // Try sessionStorage first, fall back to localStorage for migration
    const token = storage?.getItem(TOKEN_KEY) || legacyStorage?.getItem(TOKEN_KEY);
    return token;
  },

  setToken: (token) => {
    storage?.setItem(TOKEN_KEY, token);
    // Also set in localStorage for backward compatibility during migration
    legacyStorage?.setItem(TOKEN_KEY, token);
  },

  removeToken: () => {
    storage?.removeItem(TOKEN_KEY);
    legacyStorage?.removeItem(TOKEN_KEY);
  },

  getUser: () => {
    try {
      const raw = storage?.getItem(USER_KEY) || legacyStorage?.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setUser: (user) => {
    const raw = JSON.stringify(user);
    storage?.setItem(USER_KEY, raw);
    legacyStorage?.setItem(USER_KEY, raw);
  },

  getUserType: () => {
    return storage?.getItem(USER_TYPE_KEY) || legacyStorage?.getItem(USER_TYPE_KEY);
  },

  setUserType: (type) => {
    storage?.setItem(USER_TYPE_KEY, type);
    legacyStorage?.setItem(USER_TYPE_KEY, type);
  },

  clearAll: () => {
    [TOKEN_KEY, USER_KEY, USER_TYPE_KEY].forEach(key => {
      storage?.removeItem(key);
      legacyStorage?.removeItem(key);
    });
  },

  isAuthenticated: () => {
    return !!tokenService.getToken();
  },
};

export default tokenService;
