import React, { useState, useEffect } from 'react';
import '../styles/UXEnhancements.css';

/**
 * Loading Overlay - Instant Reaction Principle
 * Shows immediate feedback when async operations are in progress
 */
export const LoadingOverlay = ({ isLoading, message = 'Loading...' }) => {
  if (!isLoading) return null;

  return (
    <div className="loading-overlay">
      <div style={{ textAlign: 'center' }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: '16px', color: '#2d5641', fontWeight: 600 }}>
          {message}
        </p>
      </div>
    </div>
  );
};

/**
 * Confirmation Dialog - Prevention over Correction Principle
 * Prevents accidental destructive actions
 */
export const ConfirmationDialog = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm, 
  onCancel,
  isDangerous = false 
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="confirmation-backdrop" onClick={onCancel}></div>
      <div className="confirmation-dialog">
        <h3 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '20px', 
          fontWeight: 700,
          color: isDangerous ? '#EF4444' : '#1a2a44'
        }}>
          {isDangerous && <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>}
          {title}
        </h3>
        <p style={{ 
          margin: '0 0 24px 0', 
          fontSize: '14px', 
          color: '#555',
          lineHeight: 1.5
        }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              border: '2px solid #e5e7eb',
              background: 'white',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#555'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: isDangerous ? '#EF4444' : '#2d5641',
              color: 'white',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </>
  );
};

/**
 * Validated Input - Prevention over Correction Principle
 * Real-time validation feedback
 */
export const ValidatedInput = ({ 
  type = 'text',
  value, 
  onChange, 
  onBlur,
  placeholder,
  error,
  success,
  touched,
  label,
  helpText,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const showValidation = touched && !isFocused;
  const isValid = showValidation && success && !error;
  const isInvalid = showValidation && error;

  return (
    <div className="input-wrapper" style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          marginBottom: '6px', 
          fontSize: '14px',
          fontWeight: 600,
          color: '#333'
        }}>
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur && onBlur(e);
        }}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        className={`${isValid ? 'input-valid' : ''} ${isInvalid ? 'input-invalid' : ''}`}
        style={{
          width: '100%',
          padding: '12px',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          fontSize: '14px',
          transition: 'all 0.15s ease'
        }}
        {...props}
      />
      {helpText && !error && !isFocused && (
        <div className="contextual-help" style={{ 
          position: 'static', 
          opacity: 0.7,
          marginTop: '4px',
          fontSize: '12px',
          color: '#666'
        }}>
          {helpText}
        </div>
      )}
      {showValidation && error && (
        <div className="validation-message error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}
      {showValidation && success && !error && (
        <div className="validation-message success">
          <i className="fas fa-check-circle"></i>
          {success}
        </div>
      )}
    </div>
  );
};

/**
 * Progressive Disclosure Toggle - Focus Principle
 * Hide advanced options until needed
 */
export const ProgressiveDisclosure = ({ 
  label = 'Show More Options',
  children,
  defaultExpanded = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div style={{ marginTop: '16px' }}>
      <div 
        className={`show-more-toggle ${isExpanded ? 'expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>{isExpanded ? label.replace('Show', 'Hide') : label}</span>
        <i className={`fas fa-chevron-down`}></i>
      </div>
      <div className={`advanced-options ${isExpanded ? 'expanded' : ''}`}>
        {children}
      </div>
    </div>
  );
};

/**
 * Skeleton Loader - Focus Principle
 * Maintain layout during loading
 */
export const SkeletonLoader = ({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '4px',
  count = 1,
  style = {}
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="skeleton"
          style={{
            width,
            height,
            borderRadius,
            marginBottom: count > 1 ? '8px' : 0,
            ...style
          }}
        />
      ))}
    </>
  );
};

/**
 * Animated List Item - Continuity Principle
 * Smooth item additions and removals
 */
export const AnimatedListItem = ({ 
  children, 
  isAdding = false, 
  isRemoving = false,
  onRemoveComplete 
}) => {
  useEffect(() => {
    if (isRemoving) {
      const timer = setTimeout(() => {
        onRemoveComplete && onRemoveComplete();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isRemoving, onRemoveComplete]);

  return (
    <div className={`${isAdding ? 'item-adding' : ''} ${isRemoving ? 'item-deleting' : ''}`}>
      {children}
    </div>
  );
};

/**
 * Touch-Friendly Button - Thumb Zone Principle
 * Optimized for mobile ergonomics
 */
export const TouchButton = ({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  icon,
  ...props 
}) => {
  const variants = {
    primary: {
      background: '#2d5641',
      color: 'white',
    },
    secondary: {
      background: '#f1f1f1',
      color: '#2d5641',
    },
    danger: {
      background: '#EF4444',
      color: 'white',
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant],
        border: 'none',
        borderRadius: '12px',
        padding: '14px 20px',
        fontSize: '16px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        minHeight: '48px',
        width: fullWidth ? '100%' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease'
      }}
      {...props}
    >
      {icon && <i className={`fas fa-${icon}`}></i>}
      {children}
    </button>
  );
};

/**
 * Bottom Sheet - Thumb Zone Principle (Mobile)
 * Mobile-optimized modal at bottom of screen
 */
export const BottomSheet = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="confirmation-backdrop" 
        onClick={onClose}
        style={{ display: window.innerWidth <= 768 ? 'block' : 'none' }}
      ></div>
      <div className={`mobile-bottom-sheet ${isOpen ? 'open' : ''}`}>
        <div className="bottom-sheet-handle"></div>
        {title && (
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '20px', 
            fontWeight: 700 
          }}>
            {title}
          </h3>
        )}
        {children}
      </div>
    </>
  );
};

/**
 * Floating Action Button - Thumb Zone Principle (Mobile)
 * Primary action always accessible
 */
export const FloatingActionButton = ({ onClick, icon = 'plus', label }) => {
  return (
    <button
      className="mobile-fab"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <i className={`fas fa-${icon}`} style={{ fontSize: '24px' }}></i>
    </button>
  );
};

/**
 * Toast Notification - Instant Reaction Principle
 * Non-intrusive feedback
 */
export const Toast = ({ message, type = 'success', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6'
  };

  const icons = {
    success: 'check-circle',
    error: 'exclamation-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle'
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: `translateX(-50%) translateY(${isVisible ? '0' : '100px'})`,
        background: 'white',
        padding: '16px 24px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 10000,
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        minWidth: '300px',
        maxWidth: '90vw'
      }}
    >
      <i 
        className={`fas fa-${icons[type]}`} 
        style={{ 
          color: colors[type], 
          fontSize: '20px' 
        }}
      ></i>
      <span style={{ 
        flex: 1, 
        fontSize: '14px', 
        fontWeight: 500,
        color: '#333'
      }}>
        {message}
      </span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          color: '#999'
        }}
      >
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

/**
 * Pull to Refresh - Continuity Principle (Mobile)
 * Natural refresh gesture
 */
export const PullToRefresh = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = React.useRef(0);

  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (window.scrollY === 0 && !isRefreshing) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY.current);
      setPullDistance(Math.min(distance, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative' }}
    >
      <div 
        className={`pull-to-refresh ${pullDistance > 60 ? 'active' : ''}`}
        style={{
          opacity: pullDistance / 100,
          transform: `translateY(${Math.min(pullDistance, 60)}px)`
        }}
      >
        {isRefreshing ? (
          <div className="loading-spinner" style={{ width: '24px', height: '24px' }}></div>
        ) : (
          <i className="fas fa-arrow-down" style={{ fontSize: '24px', color: '#2d5641' }}></i>
        )}
      </div>
      {children}
    </div>
  );
};

export default {
  LoadingOverlay,
  ConfirmationDialog,
  ValidatedInput,
  ProgressiveDisclosure,
  SkeletonLoader,
  AnimatedListItem,
  TouchButton,
  BottomSheet,
  FloatingActionButton,
  Toast,
  PullToRefresh,
};
