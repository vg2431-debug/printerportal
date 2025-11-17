import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Show a loading spinner or message while checking auth
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    // Redirect to the login page if not authenticated
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;