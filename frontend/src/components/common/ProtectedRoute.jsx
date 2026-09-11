import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect based on user's actual role
    if (user.role === 'kitchen_staff') return <Navigate to="/kitchen" replace />;
    if (user.role === 'local_admin') return <Navigate to="/admin" replace />;
    if (user.role === 'super_admin') return <Navigate to="/super-admin" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};
