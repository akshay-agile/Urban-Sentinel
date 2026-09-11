import { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { TOKEN_KEY } from '../api/client';
import * as api from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app start, check for a stored token and try to restore the session.
  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        try {
          const me = await api.getMe();
          setUser(me);
        } catch {
          // Token expired/invalid — clear it and fall through to login.
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const handleLogin = async ({ email, password }) => {
    const data = await api.login({ email, password });
    await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
    setUser(data.user);
  };

  const handleRegister = async ({ fullName, email, password, phoneNumber }) => {
    const data = await api.register({ fullName, email, password, phoneNumber });
    await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
    setUser(data.user);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await api.getMe();
    setUser(me);
    return me;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
