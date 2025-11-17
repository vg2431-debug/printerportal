import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null); // Will hold { cost_coefficient, currency_symbol }
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const response = await api.get('/settings/');
      setSettings(response.data);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Function to save new settings
  const saveSettings = async (newSettings) => {
    // newSettings object should be { cost_coefficient, currency_symbol }
    try {
      const response = await api.post('/settings/', newSettings);
      setSettings(response.data); // Update state with saved data
      return response.data;
    } catch (error) {
      console.error("Failed to save settings:", error);
      throw error;
    }
  };

  const value = {
    settings,
    loading,
    saveSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  return useContext(SettingsContext);
};