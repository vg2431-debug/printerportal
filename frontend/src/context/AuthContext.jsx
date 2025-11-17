import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'; // 1. Import useCallback
import { loginUser, registerUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken') || null);
  const [isLoading, setIsLoading] = useState(true);

  // 2. Wrap the logout function in useCallback
  // This ensures the function is stable and doesn't change on re-renders
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userEmail');
  }, []); // Empty dependency array means it's created once

  // Check for existing token
  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    const storedEmail = localStorage.getItem('userEmail');
    if (storedToken && storedEmail) {
      setToken(storedToken);
      setUser({ email: storedEmail });
    }
    setIsLoading(false);
  }, []);

  // Listen for the 'auth-error' event from api.js
  useEffect(() => {
    const handleAuthError = () => {
      logout();
    };

    window.addEventListener('auth-error', handleAuthError);

    return () => {
      window.removeEventListener('auth-error', handleAuthError);
    };
  }, [logout]); // This dependency is now safe because logout is stable

  // 3. Wrap login in useCallback
  const login = useCallback(async (email, password) => {
    try {
      const response = await loginUser(email, password);
      const { access_token } = response.data;
      
      setToken(access_token);
      setUser({ email: email });
      
      localStorage.setItem('accessToken', access_token);
      localStorage.setItem('userEmail', email);
      
      return response;
    } catch (error) {
      logout();
      throw error;
    }
  }, [logout]); // This now depends on the stable logout function

  // 4. Wrap register in useCallback
  const register = useCallback(async (email, password) => {
    try {
      const response = await registerUser(email, password);
      if (response.status === 201) {
        await login(email, password);
      }
      return response;
    } catch (error) {
      throw error;
    }
  }, [login]); // This depends on the stable login function

  // 5. Value provided to all child components
  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook (unchanged)
export const useAuth = () => {
  return useContext(AuthContext);
};