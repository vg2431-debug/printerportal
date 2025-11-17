import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

const SettingsPage = () => {
  const { settings, loading, saveSettings } = useSettings();
  const [coefficient, setCoefficient] = useState(1.0);
  const [currency, setCurrency] = useState("₹");
  const [message, setMessage] = useState(null);

  // Your requested list of currencies
  const currencySymbols = {
    "₹": "Indian Rupee (₹)",
    "AED": "UAE Dirham (AED)",
    "$": "US Dollar ($)",
    "€": "Euro (€)",
    "LKR": "Sri Lankan Rupee (LKR)"
  };

  useEffect(() => {
    if (settings) {
      setCoefficient(settings.cost_coefficient || 1.0);
      setCurrency(settings.currency_symbol || "₹");
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      await saveSettings({
        cost_coefficient: coefficient,
        currency_symbol: currency,
      });
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      <h2>Global Settings</h2>
      <p>These settings apply to your entire account.</p>
      
      {message && (
        <div className={message.type === 'success' ? 'success' : 'error'}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <h3>Cost Co-efficient</h3>
        <p>A global multiplier for all job costs. (Default is 1).</p>
        <div className="form-group" style={{ maxWidth: '200px' }}>
          <label htmlFor="coefficient">Co-efficient</label>
          <input
            type="number"
            id="coefficient"
            value={coefficient}
            onChange={(e) => setCoefficient(parseFloat(e.target.value) || 1.0)}
            step="0.01"
          />
        </div>

        <h3>Currency Symbol</h3>
        <p>Select the default currency to display for all costs.</p>
        <div className="form-group" style={{ maxWidth: '300px' }}>
            <label htmlFor="currency">Currency</label>
            <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
            >
                {Object.entries(currencySymbols).map(([symbol, name]) => (
                    <option key={symbol} value={symbol}>{name}</option>
                ))}
            </select>
        </div>

        <button type="submit" style={{ width: 'auto', marginTop: '20px' }}>
          Save Settings
        </button>
      </form>
    </div>
  );
};

export default SettingsPage;