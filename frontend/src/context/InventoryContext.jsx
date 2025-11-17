import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const InventoryContext = createContext(null);

export const InventoryProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchInventory = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const response = await api.get('/inventory/');
      setInventory(response.data);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      setInventory([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch inventory when user is authenticated
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Function to ADD a new item
  const addInventoryItem = async (itemData) => {
    try {
      const response = await api.post('/inventory/', itemData);
      // Add new item to the local state
      setInventory(prev => [...prev, response.data]);
      return response.data;
    } catch (error) {
      console.error("Failed to add inventory item:", error);
      throw error; // Let the component handle the error
    }
  };

  // Function to UPDATE an item
  const updateInventoryItem = async (id, updateData) => {
    try {
      const response = await api.put(`/inventory/${id}`, updateData);
      // Find and replace the item in local state
      setInventory(prev => 
        prev.map(item => (item.id === id ? response.data : item))
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update inventory item:", error);
      throw error;
    }
  };

  // Function to DELETE an item
  const deleteInventoryItem = async (id) => {
    try {
      await api.delete(`/inventory/${id}`);
      // Remove the item from local state
      setInventory(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Failed to delete inventory item:", error);
      throw error;
    }
  };

  const value = {
    inventory,
    loading,
    fetchInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};

// Custom hook to use the inventory
export const useInventory = () => {
  return useContext(InventoryContext);
};