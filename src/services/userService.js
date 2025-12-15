import axios from 'axios';
import { getCachedProfile, setCachedProfile, clearProfileCache, updateCachedProfile } from './profileCache';

const backendBaseUrl = 'https://specs-nexus.onrender.com';

const API_URL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : backendBaseUrl);

export async function getProfile(token, forceRefresh = false) {
  // Check cache first (unless forced refresh)
  if (!forceRefresh) {
    const cached = getCachedProfile(token);
    if (cached) {
      return cached;
    }
  }

  const response = await axios.get(`${API_URL}/auth/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    timeout: 10000, // 10 second timeout
  });
  
  // Cache the profile
  setCachedProfile(token, response.data);
  return response.data;
}

export async function updateProfile(token, profileData) {
  const response = await axios.put(`${API_URL}/auth/profile`, profileData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  // Update cache with new profile data
  updateCachedProfile(response.data);
  return response.data;
}

// Export cache utilities for use in logout
export { clearProfileCache };