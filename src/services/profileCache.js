/**
 * Simple in-memory profile cache to avoid redundant API calls
 * when navigating between pages.
 */

let cachedProfile = null;
let cacheToken = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedProfile(token) {
  if (!token || token !== cacheToken) {
    return null;
  }
  if (Date.now() - cacheTimestamp > CACHE_TTL) {
    clearProfileCache();
    return null;
  }
  return cachedProfile;
}

export function setCachedProfile(token, profile) {
  cachedProfile = profile;
  cacheToken = token;
  cacheTimestamp = Date.now();
}

export function clearProfileCache() {
  cachedProfile = null;
  cacheToken = null;
  cacheTimestamp = 0;
}

export function updateCachedProfile(updates) {
  if (cachedProfile) {
    cachedProfile = { ...cachedProfile, ...updates };
  }
}
