import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const OfficerAuthGuard = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem('officerAccessToken');
  let isAuthenticated = !!token;

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;
      if (Date.now() > expiry) {
        localStorage.removeItem('officerAccessToken');
        localStorage.removeItem('officerInfo');
        isAuthenticated = false;
      }
      if (!payload.sub) {
        localStorage.removeItem('officerAccessToken');
        localStorage.removeItem('officerInfo');
        isAuthenticated = false;
      }
    } catch (error) {
      localStorage.removeItem('officerAccessToken');
      localStorage.removeItem('officerInfo');
      isAuthenticated = false;
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/officer-login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default OfficerAuthGuard;