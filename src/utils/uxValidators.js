/**
 * Real-time validation functions for Prevention over Correction principle
 * These validators provide immediate feedback as users type
 */

export const validators = {
  // Email validation
  email: (value) => {
    if (!value) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    return null;
  },

  // Password validation with strength indicator
  password: (value) => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(value)) return 'Password must contain a number';
    return null;
  },

  // Student number validation
  studentNumber: (value) => {
    if (!value) return 'Student number is required';
    const studentNumberRegex = /^\d{2}-\d{5}$/;
    if (!studentNumberRegex.test(value)) return 'Format: XX-XXXXX (e.g., 21-12345)';
    return null;
  },

  // Name validation
  name: (value) => {
    if (!value) return 'Name is required';
    if (value.length < 2) return 'Name must be at least 2 characters';
    if (!/^[a-zA-Z\s\-\.]+$/.test(value)) return 'Name can only contain letters, spaces, hyphens, and periods';
    return null;
  },

  // Required field
  required: (fieldName) => (value) => {
    if (!value || value.trim() === '') return `${fieldName} is required`;
    return null;
  },

  // Minimum length
  minLength: (min) => (value) => {
    if (value && value.length < min) return `Must be at least ${min} characters`;
    return null;
  },

  // Maximum length
  maxLength: (max) => (value) => {
    if (value && value.length > max) return `Must be no more than ${max} characters`;
    return null;
  },

  // Phone number validation
  phone: (value) => {
    if (!value) return null; // Optional field
    const phoneRegex = /^(\+63|0)?9\d{9}$/;
    if (!phoneRegex.test(value.replace(/[\s\-]/g, ''))) {
      return 'Please enter a valid Philippine mobile number';
    }
    return null;
  },

  // URL validation
  url: (value) => {
    if (!value) return null; // Optional field
    try {
      new URL(value);
      return null;
    } catch {
      return 'Please enter a valid URL (e.g., https://example.com)';
    }
  },

  // Date validation
  date: (value) => {
    if (!value) return 'Date is required';
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Please enter a valid date';
    return null;
  },

  // Future date validation
  futureDate: (value) => {
    if (!value) return 'Date is required';
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Please enter a valid date';
    if (date < new Date()) return 'Date must be in the future';
    return null;
  },

  // Number validation
  number: (value) => {
    if (value === '' || value === null || value === undefined) return null;
    if (isNaN(Number(value))) return 'Please enter a valid number';
    return null;
  },

  // Positive number validation
  positiveNumber: (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const num = Number(value);
    if (isNaN(num)) return 'Please enter a valid number';
    if (num <= 0) return 'Number must be positive';
    return null;
  },

  // Match field validation (for password confirmation)
  match: (otherValue, fieldName) => (value) => {
    if (value !== otherValue) return `${fieldName} does not match`;
    return null;
  },
};

/**
 * Password strength calculator
 * Returns: weak, medium, strong
 */
export const getPasswordStrength = (password) => {
  if (!password) return { strength: 'none', score: 0 };
  
  let score = 0;
  
  // Length
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  
  if (score <= 2) return { strength: 'weak', score, color: '#EF4444' };
  if (score <= 4) return { strength: 'medium', score, color: '#F59E0B' };
  return { strength: 'strong', score, color: '#10B981' };
};

/**
 * Debounce function for async validation (e.g., checking if email exists)
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Compose multiple validators
 */
export const composeValidators = (...validators) => (value) => {
  for (const validator of validators) {
    const error = validator(value);
    if (error) return error;
  }
  return null;
};

export default validators;
