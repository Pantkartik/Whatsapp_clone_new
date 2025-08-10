import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.get('/accounts/me/')
      .then(res => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/accounts/login/', { email, password });
    setUser(res.data.user);
  };

  const register = async (username, email, password, password_confirm) => {
    const res = await api.post('/accounts/register/', {
      username,
      email,
      password,
      password_confirm
    });
    setUser(res.data.user);
  };

  const logout = async () => {
    await api.post('/accounts/logout/');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
