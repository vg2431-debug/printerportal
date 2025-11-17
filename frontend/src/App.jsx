import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { InventoryProvider } from './context/InventoryContext';

// Import Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PrintersPage from './pages/PrintersPage';
import PrinterDetailPage from './pages/PrinterDetailPage';
import SettingsPage from './pages/SettingsPage';
import JobDetailPage from './pages/JobDetailPage';
import PrinterEditPage from './pages/PrinterEditPage';
import PrinterAddPage from './pages/PrinterAddPage';
import InventoryPage from './pages/InventoryPage';

// Import Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import './components/Layout.css';

// Import CSS
import './App.css';
import './pages/PrinterDetailPage.css';
import './pages/JobDetailPage.css';
import './pages/PrinterEditPage.css';
import './pages/InventoryPage.css';
import './pages/DashboardPage.css'; // <-- ADD THIS LINE

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <InventoryProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/printers" element={<PrintersPage />} />
                  <Route path="/printers/new" element={<PrinterAddPage />} />
                  <Route path="/printers/edit/:printerId" element={<PrinterEditPage />} />
                  <Route path="/printers/:printerId" element={<PrinterDetailPage />} />
                  <Route path="/jobs/:jobId" element={<JobDetailPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                </Route>
              </Route>

              <Route path="*" element={<div><h2>404 Page Not Found</h2></div>} />
            </Routes>
          </BrowserRouter>
        </InventoryProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;