/**
 * Date and Time Utilities for Philippine Time (Asia/Manila, UTC+8)
 * 
 * All functions in this module enforce Philippine Time Zone (Asia/Manila)
 * to ensure consistent time handling across the application regardless of
 * user's device timezone or server location.
 */

const PHILIPPINES_TZ = 'Asia/Manila';

/**
 * Get current date and time in Philippine Time
 * @returns {Date} Date object representing current PH time
 */
export const getPhilippineNow = () => {
  const now = new Date();
  const phString = now.toLocaleString('en-US', { timeZone: PHILIPPINES_TZ });
  return new Date(phString);
};

/**
 * Convert any date to Philippine Time
 * @param {Date|string} dateInput - Date to convert
 * @returns {Date} Date object in Philippine timezone
 */
export const toPhilippineTime = (dateInput) => {
  const date = new Date(dateInput);
  const phString = date.toLocaleString('en-US', { timeZone: PHILIPPINES_TZ });
  return new Date(phString);
};

/**
 * Format date for datetime-local input (YYYY-MM-DDTHH:mm)
 * Ensures the date is interpreted in Philippine Time
 * @param {Date|string} dateInput - Date to format
 * @returns {string} Formatted string for datetime-local input
 */
export const formatDateTimeForInput = (dateInput) => {
  if (!dateInput) return '';
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: PHILIPPINES_TZ
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;
  
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

/**
 * Format date and time for display (e.g., "Dec 20, 2025 at 1:55 AM")
 * @param {Date|string} dateInput - Date to format
 * @param {object} options - Additional formatting options
 * @returns {string} Formatted date string
 */
export const formatDateTimeDisplay = (dateInput, options = {}) => {
  if (!dateInput) return 'No date provided';
  
  const date = new Date(dateInput);
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: PHILIPPINES_TZ,
    ...options
  };
  
  return date.toLocaleString('en-US', defaultOptions);
};

/**
 * Format date only (e.g., "December 20, 2025")
 * @param {Date|string} dateInput - Date to format
 * @param {object} options - Additional formatting options
 * @returns {string} Formatted date string
 */
export const formatDateDisplay = (dateInput, options = {}) => {
  if (!dateInput) return 'No date';
  
  const date = new Date(dateInput);
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: PHILIPPINES_TZ,
    ...options
  };
  
  return date.toLocaleDateString('en-US', defaultOptions);
};

/**
 * Format time only (e.g., "1:55 AM")
 * @param {Date|string} dateInput - Date to format
 * @param {object} options - Additional formatting options
 * @returns {string} Formatted time string
 */
export const formatTimeDisplay = (dateInput, options = {}) => {
  if (!dateInput) return 'No time';
  
  const date = new Date(dateInput);
  
  const defaultOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: PHILIPPINES_TZ,
    ...options
  };
  
  return date.toLocaleTimeString('en-US', defaultOptions);
};

/**
 * Format full date and time for header display (e.g., "Saturday, December 20, 2025 at 1:55 AM")
 * @param {Date|string} dateInput - Date to format
 * @returns {string} Formatted string
 */
export const formatHeaderDateTime = (dateInput = new Date()) => {
  const date = new Date(dateInput);
  
  const options = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: PHILIPPINES_TZ
  };
  
  return date.toLocaleString('en-US', options).replace(',', ' at');
};

/**
 * Get Philippine Time date parts for card displays
 * @param {Date|string} dateInput - Date to parse
 * @returns {object} Object with day, month, date, time, year properties
 */
export const getPhilippineDateParts = (dateInput) => {
  if (!dateInput) return { day: '', month: '', date: '', time: '', year: '' };
  
  const date = new Date(dateInput);
  const phDate = toPhilippineTime(date);
  
  return {
    day: phDate.getDate(),
    month: date.toLocaleDateString('en-US', { month: 'short', timeZone: PHILIPPINES_TZ }),
    date: date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      timeZone: PHILIPPINES_TZ 
    }),
    time: date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true,
      timeZone: PHILIPPINES_TZ 
    }),
    year: phDate.getFullYear()
  };
};

/**
 * Check if a date is today in Philippine Time
 * @param {Date|string} dateInput - Date to check
 * @returns {boolean} True if date is today in PH time
 */
export const isToday = (dateInput) => {
  const date = toPhilippineTime(dateInput);
  const today = getPhilippineNow();
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

/**
 * Get ISO string for Philippine Time (for API requests)
 * @param {Date|string} dateInput - Date to convert
 * @returns {string} ISO 8601 string
 */
export const toPhilippineISOString = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  return date.toISOString();
};

export default {
  PHILIPPINES_TZ,
  getPhilippineNow,
  toPhilippineTime,
  formatDateTimeForInput,
  formatDateTimeDisplay,
  formatDateDisplay,
  formatTimeDisplay,
  formatHeaderDateTime,
  getPhilippineDateParts,
  isToday,
  toPhilippineISOString
};
