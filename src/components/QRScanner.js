import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import '../styles/QRScanner.css';

const defaultBackendBaseUrl = 'https://specs-nexus.onrender.com';
const API_URL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : defaultBackendBaseUrl);

// Duplicate prevention: ignore same code within this time window (ms)
const DUPLICATE_SCAN_COOLDOWN = 3000;
// Success overlay display duration (ms)
const SUCCESS_OVERLAY_DURATION = 1000;

const QRScanner = ({ show, onClose, eventId, onCheckInSuccess }) => {
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  // Visual feedback states
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [showErrorOverlay, setShowErrorOverlay] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState('');
  const [lastScannedStudent, setLastScannedStudent] = useState(null);
  
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const lastScannedCodeRef = useRef(null);
  const lastScanTimeRef = useRef(0);
  const processingRef = useRef(false);
  const isMountedRef = useRef(true);
  const isStoppingRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    
    if (html5QrCodeRef.current) {
      try {
        const scanner = html5QrCodeRef.current;
        html5QrCodeRef.current = null; // Clear ref first to prevent race conditions
        
        // Check state safely
        let state = 0;
        try {
          state = scanner.getState();
        } catch (e) {
          // Scanner may already be in invalid state
        }
        
        if (state === 2) { // SCANNING state
          await scanner.stop().catch(() => {}); // Ignore stop errors
        }
        
        try {
          scanner.clear();
        } catch (e) {
          // Ignore clear errors
        }
      } catch (err) {
        // Silently handle cleanup errors
        console.debug('Scanner cleanup:', err.message);
      }
    }
    
    isStoppingRef.current = false;
  }, []);

  const processCheckIn = useCallback(async (studentNumber) => {
    try {
      const token = localStorage.getItem('officerAccessToken');
      if (!token) {
        setOverlayMessage('Auth required');
        setShowErrorOverlay(true);
        setTimeout(() => setShowErrorOverlay(false), SUCCESS_OVERLAY_DURATION);
        return;
      }

      const formData = new FormData();
      formData.append('student_number', studentNumber);

      const response = await fetch(`${API_URL}/events/${eventId}/check-in-by-student-number`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setLastScannedStudent({
          name: data.student_name,
          studentNumber: data.student_number,
          alreadyCheckedIn: data.already_checked_in
        });
        
        if (data.already_checked_in) {
          setOverlayMessage(`${data.student_name} - Already In`);
          setShowErrorOverlay(true);
          setTimeout(() => setShowErrorOverlay(false), SUCCESS_OVERLAY_DURATION);
        } else {
          setOverlayMessage(data.student_name);
          setShowSuccessOverlay(true);
          setScanCount(prev => prev + 1);
          setTimeout(() => setShowSuccessOverlay(false), SUCCESS_OVERLAY_DURATION);
          
          // Notify parent to refresh participants list
          if (onCheckInSuccess) {
            onCheckInSuccess();
          }
        }
      } else {
        setOverlayMessage(data.detail || 'Not Found');
        setShowErrorOverlay(true);
        setTimeout(() => setShowErrorOverlay(false), SUCCESS_OVERLAY_DURATION);
      }
    } catch (err) {
      console.error('Check-in API error:', err);
      setOverlayMessage('Network Error');
      setShowErrorOverlay(true);
      setTimeout(() => setShowErrorOverlay(false), SUCCESS_OVERLAY_DURATION);
    }
  }, [eventId, onCheckInSuccess]);

  const onScanSuccess = useCallback(async (decodedText) => {
    const currentTime = Date.now();
    const studentNumber = decodedText.trim();
    
    // Duplicate prevention: ignore same code within cooldown period
    if (
      studentNumber === lastScannedCodeRef.current &&
      currentTime - lastScanTimeRef.current < DUPLICATE_SCAN_COOLDOWN
    ) {
      return;
    }
    
    // Prevent concurrent processing
    if (processingRef.current) return;
    
    processingRef.current = true;
    setIsProcessing(true);
    
    // Update last scanned tracking
    lastScannedCodeRef.current = studentNumber;
    lastScanTimeRef.current = currentTime;
    
    await processCheckIn(studentNumber);
    
    processingRef.current = false;
    setIsProcessing(false);
  }, [processCheckIn]);

  const startScanner = useCallback(async () => {
    if (!scannerRef.current || !isMountedRef.current) return;
    
    // Clean up any existing scanner first
    if (html5QrCodeRef.current) {
      await stopScanner();
    }

    try {
      setError(null);
      
      // Check if element still exists
      const readerElement = document.getElementById('qr-reader');
      if (!readerElement || !isMountedRef.current) return;
      
      html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      
      // Optimized settings for high-contrast standard QR codes
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 30,                          // High FPS for instant detection
          qrbox: { width: 280, height: 280 }, // Larger scan area
          aspectRatio: 1.0,                 // Square aspect for QR codes
          disableFlip: false,               // Allow flipped codes
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true  // Use native detector if available
          }
        },
        onScanSuccess,
        () => {} // Silent failure handler
      );
    } catch (err) {
      console.error('Failed to start scanner:', err);
      if (isMountedRef.current) {
        setError('Failed to access camera. Please ensure camera permissions are granted.');
      }
    }
  }, [onScanSuccess, stopScanner]);

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle visibility - keep DOM until scanner is stopped
  useEffect(() => {
    if (show) {
      setIsVisible(true);
    }
  }, [show]);

  useEffect(() => {
    if (isVisible && !html5QrCodeRef.current && !isStoppingRef.current) {
      startScanner();
    }
  }, [isVisible, startScanner]);

  // Cleanup when show becomes false
  useEffect(() => {
    if (!show && isVisible) {
      const cleanup = async () => {
        await stopScanner();
        if (isMountedRef.current) {
          setIsVisible(false);
        }
      };
      cleanup();
    }
  }, [show, isVisible, stopScanner]);

  const handleClose = async () => {
    await stopScanner();
    setError(null);
    setShowSuccessOverlay(false);
    setShowErrorOverlay(false);
    setScanCount(0);
    setLastScannedStudent(null);
    lastScannedCodeRef.current = null;
    lastScanTimeRef.current = 0;
    setIsVisible(false);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-container">
        <button className="qr-scanner-close" onClick={handleClose}>×</button>
        
        <div className="qr-scanner-header">
          <h2>Scan Student QR Code</h2>
          <div className="qr-scan-counter">
            <span className="qr-counter-number">{scanCount}</span>
            <span className="qr-counter-label">Checked In</span>
          </div>
        </div>
        
        <p className="qr-scanner-subtitle">Point camera at student&apos;s QR code for instant check-in</p>

        {error && (
          <div className="qr-scanner-error">
            <p>{error}</p>
            <button className="qr-retry-btn" onClick={startScanner}>
              Try Again
            </button>
          </div>
        )}

        {!error && (
          <div className="qr-reader-container">
            <div id="qr-reader" ref={scannerRef}></div>
            
            {/* Success Overlay */}
            {showSuccessOverlay && (
              <div className="qr-feedback-overlay success">
                <div className="qr-feedback-checkmark">
                  <svg viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="25" fill="none" />
                    <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                  </svg>
                </div>
                <p className="qr-feedback-name">{overlayMessage}</p>
                <p className="qr-feedback-status">Checked In!</p>
              </div>
            )}
            
            {/* Error/Already Checked In Overlay */}
            {showErrorOverlay && (
              <div className="qr-feedback-overlay error">
                <div className="qr-feedback-icon error">
                  <svg viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="25" fill="none" />
                    <path fill="none" d="M16 16 36 36 M36 16 16 36" />
                  </svg>
                </div>
                <p className="qr-feedback-name">{overlayMessage}</p>
              </div>
            )}
            
            {/* Processing indicator */}
            {isProcessing && !showSuccessOverlay && !showErrorOverlay && (
              <div className="qr-processing-indicator">
                <div className="qr-processing-dot"></div>
              </div>
            )}
            
            {/* Scan guide corners */}
            <div className="qr-scan-guide">
              <div className="qr-corner top-left"></div>
              <div className="qr-corner top-right"></div>
              <div className="qr-corner bottom-left"></div>
              <div className="qr-corner bottom-right"></div>
            </div>
          </div>
        )}

        {lastScannedStudent && (
          <div className="qr-last-scan">
            <span className="qr-last-label">Last:</span>
            <span className="qr-last-name">{lastScannedStudent.name}</span>
            <span className="qr-last-id">({lastScannedStudent.studentNumber})</span>
          </div>
        )}

        <div className="qr-scanner-footer">
          <button className="qr-done-btn" onClick={handleClose}>
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
