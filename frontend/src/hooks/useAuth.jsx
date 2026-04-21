import { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟检查本地 token
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ name: 'Admin', role: 'admin' });
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    // 模拟登录
    localStorage.setItem('token', 'fake-jwt-token');
    setUser({ name: 'Admin', role: 'admin' });
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
