import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const UserAuthGuard = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem('access_token');
  let isAuthenticated = !!token;

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;
      if (Date.now() > expiry) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_id');
        isAuthenticated = false;
      }
    } catch (error) {
      isAuthenticated = false;
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default UserAuthGuard;