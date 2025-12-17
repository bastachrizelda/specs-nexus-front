import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for implementing Apple-like UX enhancements
 * Provides utilities for instant feedback, smooth transitions, and intelligent behaviors
 */
export const useUXEnhancements = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Instant loading feedback
  const withLoadingFeedback = useCallback(async (asyncFunction, message = 'Loading...') => {
    setIsLoading(true);
    setLoadingMessage(message);
    try {
      const result = await asyncFunction();
      return result;
    } finally {
      // Small delay to ensure user sees the feedback
      setTimeout(() => {
        setIsLoading(false);
        setLoadingMessage('');
      }, 150);
    }
  }, []);

  return {
    isLoading,
    loadingMessage,
    withLoadingFeedback,
  };
};

/**
 * Hook for real-time form validation (Prevention over Correction)
 */
export const useFormValidation = (initialValues, validationRules) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValid, setIsValid] = useState(false);

  const validateField = useCallback((name, value) => {
    const rules = validationRules[name];
    if (!rules) return null;

    for (const rule of rules) {
      const error = rule(value);
      if (error) return error;
    }
    return null;
  }, [validationRules]);

  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Real-time validation
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField]);

  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  useEffect(() => {
    const allValid = Object.keys(validationRules).every(
      key => !errors[key] && values[key] !== undefined && values[key] !== ''
    );
    setIsValid(allValid);
  }, [errors, values, validationRules]);

  return {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    setValues,
  };
};

/**
 * Hook for confirmation dialogs (Prevention over Correction)
 */
export const useConfirmation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
    isDangerous: false,
  });
  const resolveRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfig({
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        isDangerous: options.isDangerous || false,
      });
      resolveRef.current = resolve;
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(true);
    }
    setIsOpen(false);
  }, []);

  const handleCancel = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(false);
    }
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    config,
    confirm,
    handleConfirm,
    handleCancel,
  };
};

/**
 * Hook for smooth list animations (Continuity Principle)
 */
export const useListAnimation = () => {
  const [items, setItems] = useState([]);
  const [animatingItems, setAnimatingItems] = useState(new Set());

  const addItem = useCallback((item) => {
    const itemWithId = { ...item, _animationId: Date.now() };
    setAnimatingItems(prev => new Set([...prev, itemWithId._animationId]));
    setItems(prev => [...prev, itemWithId]);
    
    setTimeout(() => {
      setAnimatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemWithId._animationId);
        return next;
      });
    }, 300);
  }, []);

  const removeItem = useCallback((id) => {
    setAnimatingItems(prev => new Set([...prev, id]));
    
    setTimeout(() => {
      setItems(prev => prev.filter(item => item.id !== id));
      setAnimatingItems(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  }, []);

  const isAnimating = useCallback((id) => {
    return animatingItems.has(id);
  }, [animatingItems]);

  return {
    items,
    setItems,
    addItem,
    removeItem,
    isAnimating,
  };
};

/**
 * Hook for progressive disclosure (Focus Principle)
 */
export const useProgressiveDisclosure = (initialState = false) => {
  const [isExpanded, setIsExpanded] = useState(initialState);

  const toggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const expand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return {
    isExpanded,
    toggle,
    expand,
    collapse,
  };
};

/**
 * Hook for touch gestures (Thumb Zone Principle)
 */
export const useTouchGestures = (ref) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    return { isLeftSwipe, isRightSwipe, distance };
  }, [touchStart, touchEnd, minSwipeDistance]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', onTouchStart);
    element.addEventListener('touchmove', onTouchMove);
    element.addEventListener('touchend', onTouchEnd);

    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
    };
  }, [ref, onTouchStart, onTouchMove, onTouchEnd]);

  return { onTouchStart, onTouchMove, onTouchEnd };
};

/**
 * Hook for optimistic UI updates (Instant Reaction)
 */
export const useOptimisticUpdate = () => {
  const [optimisticData, setOptimisticData] = useState(null);
  const [actualData, setActualData] = useState(null);
  const [isReverting, setIsReverting] = useState(false);

  const performOptimisticUpdate = useCallback(async (
    optimisticValue,
    asyncOperation
  ) => {
    // Immediately show optimistic value
    setOptimisticData(optimisticValue);
    
    try {
      // Perform actual operation
      const result = await asyncOperation();
      setActualData(result);
      setOptimisticData(null);
      return result;
    } catch (error) {
      // Revert on error
      setIsReverting(true);
      setTimeout(() => {
        setOptimisticData(null);
        setIsReverting(false);
      }, 300);
      throw error;
    }
  }, []);

  const currentData = optimisticData !== null ? optimisticData : actualData;

  return {
    currentData,
    isReverting,
    performOptimisticUpdate,
  };
};

/**
 * Hook for skeleton loading states (Focus Principle)
 */
export const useSkeletonLoading = (isLoading, minLoadingTime = 500) => {
  const [showSkeleton, setShowSkeleton] = useState(isLoading);
  const loadingStartTime = useRef(null);

  useEffect(() => {
    if (isLoading) {
      loadingStartTime.current = Date.now();
      setShowSkeleton(true);
    } else if (loadingStartTime.current) {
      const elapsed = Date.now() - loadingStartTime.current;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      
      setTimeout(() => {
        setShowSkeleton(false);
        loadingStartTime.current = null;
      }, remaining);
    }
  }, [isLoading, minLoadingTime]);

  return showSkeleton;
};

/**
 * Hook for haptic feedback on mobile (Instant Reaction)
 */
export const useHapticFeedback = () => {
  const triggerHaptic = useCallback((type = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 10],
        error: [50, 100, 50],
      };
      navigator.vibrate(patterns[type] || patterns.light);
    }
  }, []);

  return { triggerHaptic };
};

export default {
  useUXEnhancements,
  useFormValidation,
  useConfirmation,
  useListAnimation,
  useProgressiveDisclosure,
  useTouchGestures,
  useOptimisticUpdate,
  useSkeletonLoading,
  useHapticFeedback,
};
