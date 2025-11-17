import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useInventory } from '../context/InventoryContext';
import './PrinterEditPage.css';

// List of available inks for dropdown
const INK_COLOR_OPTIONS = [
  'Select', 'Cyan', 'Magenta', 'Yellow', 'Black', 
  'Lc', 'Lm', 'Lk', 'Orange', 'Red', 'Green', 
  'White', 'white2', 'Varnish'
];

const PrinterEditPage = () => {
  const { printerId } = useParams();
  const navigate = useNavigate();
  
  const [printer, setPrinter] = useState(null); // Start as null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  
  const { inventory, loading: inventoryLoading } = useInventory();

  // Fetch printer data
  useEffect(() => {
    const fetchPrinter = async () => {
      try {
        const { data } = await api.get(`/printers/${printerId}`);
        
        // --- THIS IS THE FIX ---
        // Ensure all nested objects/arrays exist *before* setting state
        // This prevents the page from crashing on render
        data.inks = data.inks || []; 
        data.specification = data.specification || {};
        data.ink_costs = data.ink_costs || {};
        data.ink_link = data.ink_link || {}; 
        // --- END FIX ---
        
        // Format date for input field
        if (data.install_date) {
          data.install_date = data.install_date.split('T')[0];
        }
        setPrinter(data);
      } catch (err) {
        setError('Failed to load printer data.');
      } finally {
        setLoading(false);
      }
    };
    fetchPrinter();
  }, [printerId]);

  // General change handler for nested fields
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name === 'color_nos') {
      const newCount = parseInt(value, 10) || 0;
      updateInkArray(newCount);
      return;
    }
    
    const val = type === 'number' ? parseFloat(value) || 0 : value;
    
    if (name.startsWith('specification.')) {
      const specField = name.split('.')[1];
      setPrinter(prev => ({
        ...prev,
        specification: { ...prev.specification, [specField]: val }
      }));
    } else {
      setPrinter(prev => ({ ...prev, [name]: val }));
    }
  };

  // --- Dynamic Ink Logic ---
  const updateInkArray = (newCount) => {
    setPrinter(prev => {
      const currentInks = prev.inks || [];
      const newInks = [...currentInks];
      
      if (newCount > currentInks.length) {
        for (let i = currentInks.length; i < newCount; i++) {
          newInks.push('select');
        }
      } else if (newCount < currentInks.length) {
        newInks.length = newCount;
      }
      
      return { ...prev, color_nos: newCount, inks: newInks };
    });
  };

  const handleInkColorChange = (index, newColor) => {
    setPrinter(prev => {
      const newInks = [...prev.inks];
      newInks[index] = newColor.toLowerCase();
      return { ...prev, inks: newInks };
    });
  };

  const handlePriceChange = (color, price) => {
    setPrinter(prev => ({
      ...prev,
      ink_costs: {
        ...prev.ink_costs,
        [color.toLowerCase()]: parseFloat(price) || 0
      }
    }));
  };
  
  const handleInkLinkChange = (color, inventoryId) => {
    setPrinter(prev => ({
      ...prev,
      ink_link: {
        ...prev.ink_link,
        [color.toLowerCase()]: inventoryId || null
      }
    }));
  };
  // --- End Ink Logic ---

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    const finalPrinter = { ...printer };
    
    const finalInks = [...new Set(finalPrinter.inks.filter(ink => ink && ink !== 'select'))];
    finalPrinter.inks = finalInks;
    finalPrinter.color_nos = finalInks.length;
    
    const finalInkCosts = {};
    const finalInkLinks = {};
    finalPrinter.inks.forEach(color => {
      finalInkCosts[color] = finalPrinter.ink_costs[color] || 0;
      finalInkLinks[color] = finalPrinter.ink_link[color] || null;
    });
    finalPrinter.ink_costs = finalInkCosts;
    finalPrinter.ink_link = finalInkLinks;

    try {
      await api.put(`/printers/${printerId}`, finalPrinter);
      setMessage('Printer saved successfully! Redirecting...');
      setTimeout(() => navigate('/printers'), 2000);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save printer.');
    }
  };

  // This section now works and prevents the crash
  if (loading) return <div>Loading printer settings...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!printer) return null; // Don't render form until printer is loaded

  // This is now safe because we know `printer` and `printer.inks` exist
  const activeInks = printer.inks.filter(ink => ink && ink !== 'select');

  return (
    <div className="printer-edit-page">
      <h2>Edit Printer Settings</h2>
      
      {message && <div className="success">{message}</div>}

      <form onSubmit={handleSubmit}>
        {/* --- Main Details --- */}
        <div className="form-section">
          <h3>Main Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Printer Name</label>
              <input name="printer_name" value={printer.printer_name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Serial Number</label>
              <input name="serial_number" value={printer.serial_number} onChange={handleChange} required disabled />
            </div>
            <div className="form-group">
              <label>Brand</label>
              <input name="brand" value={printer.brand} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Model</label>
              <input name="model" value={printer.model} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Main Category</label>
              <input name="printer_main_category" value={printer.printer_main_category} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Sub Category</label>
              <input name="printer_sub_category" value={printer.printer_sub_category || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input name="location" value={printer.location} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Department</label>
              <input name="department" value={printer.department || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Vendor</label>
              <input name="vendor" value={printer.vendor || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Installation Date</label>
              <input name="install_date" type="date" value={printer.install_date || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={printer.status} onChange={handleChange}>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Error">Error</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>
        </div>

        {/* --- Specifications --- */}
        <div className="form-section">
          <h3>Specifications</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Printer Width (mm)</label>
              <input name="specification.printer_width" type="number" value={printer.specification.printer_width} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Printer Length (mm)</label>
              <input name="specification.printer_length" type="number" value={printer.specification.printer_length || 0} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Print Head</label>
              <input name="specification.print_head" value={printer.specification.print_head} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Head Count</label>
              <input name="specification.head_nos" type="number" value={printer.specification.head_nos} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Control System</label>
              <input name="specification.printer_control_system" value={printer.specification.printer_control_system} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>RIP Software</label>
              <input name="specification.rip_software" value={printer.specification.rip_software || ''} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* --- Ink Setup & Costs --- */}
        <div className="form-section">
          <h3>Ink Setup & Costs</h3>
          <div className="form-group" style={{ maxWidth: '200px' }}>
            <label>Number of Colors</label>
            <input 
              name="color_nos" 
              type="number"
              value={printer.color_nos}
              onChange={handleChange}
              min="0"
            />
          </div>
          
          <h4>Ink Colors</h4>
          <div className="form-grid">
            {Array.from({ length: printer.color_nos }, (_, index) => (
              <div className="form-group" key={index}>
                <label>Ink Slot {index + 1}</label>
                <select
                  value={printer.inks[index] || 'select'}
                  onChange={(e) => handleInkColorChange(index, e.target.value)}
                >
                  {INK_COLOR_OPTIONS.map(color => (
                    <option key={color} value={color.toLowerCase()}>{color}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          
          <h4 style={{marginTop: '20px'}}>Ink Costs</h4>
          <p>Define cost per **Liters** for each ink.</p>
          <div className="form-grid">
            {activeInks.map(color => (
              <div className="form-group" key={color}>
                <label>Cost for '{color}' (per Liters)</label>
                <input
                  type="number"
                  value={printer.ink_costs[color] || 0}
                  onChange={(e) => handlePriceChange(color, e.target.value)}
                  step="0.01"
                />
              </div>
            ))}
          </div>

          {/* --- "LINK TO STOCK" SECTION --- */}
          <h4 style={{marginTop: '20px'}}>Link to Stock Inventory</h4>
          <p>Link each ink channel to an item from your Ink Inventory (Stock on Shelf).</p>
          {inventoryLoading ? (
            <p>Loading inventory...</p>
          ) : (
            <div className="form-grid">
              {activeInks.map(color => (
                <div className="form-group" key={color}>
                  <label>Link for '{color}'</label>
                  <select
                    value={printer.ink_link[color] || ''}
                    onChange={(e) => handleInkLinkChange(color, e.target.value)}
                  >
                    <option value="">-- No Link --</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.ink_name} ({item.stock_on_hand} in stock)
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
          {/* --- END NEW SECTION --- */}

        </div>

        {/* --- BUTTONS (Correct and inside the form) --- */}
        <div className="button-row">
          <button type="submit" disabled={message}>
            Apply Changes
          </button>
          <button type="button" className="cancel-button" onClick={() => navigate('/printers')}>
            Cancel
          </button>
        </div>
        
      </form>
    </div>
  );
};

export default PrinterEditPage;