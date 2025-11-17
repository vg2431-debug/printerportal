import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import './InventoryPage.css'; // We will create this CSS file

// This is the "Edit" modal component
const EditModal = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...item });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(item.id, formData);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Edit Ink: {item.ink_name}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Ink Name</label>
            <input 
              name="ink_name" 
              value={formData.ink_name} 
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Unit Volume (ml)</label>
            <input 
              name="unit_volume_ml" 
              type="number"
              value={formData.unit_volume_ml} 
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Stock on Hand (Units)</label>
            <input 
              name="stock_on_hand" 
              type="number"
              value={formData.stock_on_hand} 
              onChange={handleChange}
              required
            />
          </div>
          <div className="button-row">
            <button type="submit">Save Changes</button>
            <button type="button" className="cancel-button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};


// This is the main page component
const InventoryPage = () => {
  const { inventory, loading, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventory();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    ink_name: '',
    unit_volume_ml: 1000,
    stock_on_hand: 0
  });
  const [editingItem, setEditingItem] = useState(null); // Holds the item being edited
  const [error, setError] = useState(null);

  const handleNewChange = (e) => {
    const { name, value, type } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value
    }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await addInventoryItem(newItem);
      // Reset form and hide it
      setNewItem({ ink_name: '', unit_volume_ml: 1000, stock_on_hand: 0 });
      setShowAddForm(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add item.");
    }
  };

  const handleSaveEdit = async (id, data) => {
    setError(null);
    try {
      // We only send the fields that can be updated
      const updateData = {
        ink_name: data.ink_name,
        unit_volume_ml: data.unit_volume_ml,
        stock_on_hand: data.stock_on_hand
      };
      await updateInventoryItem(id, updateData);
      setEditingItem(null); // Close the modal
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update item.");
      // Don't close modal on error
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this inventory item? This cannot be undone.")) {
      setError(null);
      try {
        await deleteInventoryItem(id);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to delete item.");
      }
    }
  };

  return (
    <div className="inventory-page">
      <div className="page-header">
        <h2>Ink Inventory (Stock on Shelf)</h2>
        <button onClick={() => setShowAddForm(true)} style={{ width: 'auto' }}>
          + Add New Ink Type
        </button>
      </div>
      
      {error && <div className="error">{error}</div>}

      {/* --- Add New Item Form --- */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="add-form form-section">
          <h3>Add New Ink Type</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Ink Name</label>
              <input 
                name="ink_name" 
                placeholder="e.g., UV Cyan (1L Bottle)"
                value={newItem.ink_name}
                onChange={handleNewChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Unit Volume (ml)</label>
              <input 
                name="unit_volume_ml"
                type="number"
                value={newItem.unit_volume_ml}
                onChange={handleNewChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Initial Stock (Units)</label>
              <input 
                name="stock_on_hand" 
                type="number"
                value={newItem.stock_on_hand}
                onChange={handleNewChange}
                required
              />
            </div>
          </div>
          <div className="button-row">
            <button type="submit">Save</button>
            <button type="button" className="cancel-button" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* --- Inventory Table --- */}
      <h3>Current Stock</h3>
      {loading ? (
        <p>Loading inventory...</p>
      ) : (
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Ink Name</th>
              <th>Unit Volume</th>
              <th>Stock on Hand (Units)</th>
              <th>Total Volume (Liters)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>No ink inventory items found.</td>
              </tr>
            ) : (
              inventory.map(item => (
                <tr key={item.id}>
                  <td>{item.ink_name}</td>
                  <td>{item.unit_volume_ml} ml</td>
                  <td>{item.stock_on_hand}</td>
                  <td>{(item.unit_volume_ml * item.stock_on_hand / 1000).toFixed(2)} L</td>
                  <td className="actions-cell">
                    <button className="edit-button" onClick={() => setEditingItem(item)}>Edit</button>
                    <button className="delete-button" onClick={() => handleDelete(item.id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* --- Edit Modal --- */}
      {editingItem && (
        <EditModal 
          item={editingItem} 
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default InventoryPage;