// Centralized API URL configuration
// Supports localhost development and production deployment

const getApiUrl = () => {
  // 1. Check for explicit environment variable override
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // 2. Auto-detect based on hostname
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    
    // Production on Vercel
    if (hostname.includes('vercel.app') || hostname.includes('specs-nexus')) {
      return 'https://specs-nexus-backend.onrender.com';
    }
  }

  // 3. Fallback to production
  return 'https://specs-nexus-backend.onrender.com';
};

export const API_URL = getApiUrl();

// Legacy support - keep the old pattern for backward compatibility
export const backendBaseUrl = API_URL;

export default API_URL;
