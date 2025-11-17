import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Simple Settings Icon
const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const PrintersPage = () => {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPrinters = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/printers/');
        setPrinters(response.data);
      } catch (err) {
        setError('Failed to fetch printers. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrinters();
  }, []);

  if (loading) {
    return <div>Loading your printers...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Your Printers</h2>
        <button
  style={{
    width: 'auto',
    backgroundColor: '#007bff',
    color: 'white',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  }}
  onClick={() => navigate('/printers/new')}
>
          + Add New Printer
        </button>
      </div>
      
      {printers.length === 0 ? (
        <p>You have not registered any printers yet.</p>
      ) : (
        <table className="printers-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Brand</th>
              <th>Model</th>
              <th>Serial Number</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {printers.map((printer) => (
              <tr key={printer.id}>
                <td>
                  <Link to={`/printers/${printer.id}`}>
                    {printer.printer_name}
                  </Link>
                </td>
                <td>{printer.brand}</td>
                <td>{printer.model}</td>
                <td>{printer.serial_number}</td>
                <td>{printer.status}</td>
                <td style={{ textAlign: 'center' }}>
                  <Link 
                    to={`/printers/edit/${printer.id}`}
                    title="Edit Printer Settings"
                    style={{ color: '#555', cursor: 'pointer' }}
                  >
                    <SettingsIcon />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PrintersPage;