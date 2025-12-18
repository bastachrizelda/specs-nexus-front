import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/MembershipModal.css';
import { getQRCode, uploadReceiptFile, updateMembershipReceipt, selectCashPayment } from '../services/membershipService';
import StatusModal from './StatusModal';

const MembershipModal = ({ membership, onClose, onReceiptUploaded }) => {
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);
  const [activeTab, setActiveTab] = useState("paymaya");
  const [qrPreviewUrl, setQrPreviewUrl] = useState(null);
  const [qrError, setQrError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentMembership, setCurrentMembership] = useState(membership);
  const [showFullReceiptModal, setShowFullReceiptModal] = useState(false);
  const [fullReceiptUrl, setFullReceiptUrl] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingUpdateResponse, setPendingUpdateResponse] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [refError, setRefError] = useState('');
  const [statusModalConfig, setStatusModalConfig] = useState({
    title: 'Payment Updated',
    message: 'Your action was successful.',
    type: 'success',
  });
  const token = localStorage.getItem('access_token');
  const fileInputRef = useRef(null);

  const paymentMethods = ["paymaya", "gcash"];
  // eslint-disable-next-line no-unused-vars
  const expectedDomain = "specsnexus-images.senya-videos.workers.dev";

  const isPaid = currentMembership.payment_status?.toLowerCase() === "paid";
  const isDenied = currentMembership.payment_status?.toLowerCase() === "not paid" && currentMembership.denial_reason;
  const isPendingCash = currentMembership.payment_method === 'cash' && currentMembership.payment_status?.toLowerCase() === 'pending';

  useEffect(() => {
    setCurrentMembership(membership);
    setReferenceNumber(membership?.reference_number || '');
  }, [membership]);

  const validateReferenceNumber = (value, paymentType) => {
    const trimmed = (value || '').trim().replace(/[\s-]/g, '');
    
    if (paymentType === 'cash') {
      setRefError('');
      return true;
    }
    
    if (!trimmed) {
      setRefError('Reference number is required.');
      return false;
    }
    
    if (paymentType === 'gcash') {
      if (trimmed.length !== 13) {
        setRefError(`GCash reference number must be exactly 13 characters (${trimmed.length}/13).`);
        return false;
      }
      if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
        setRefError('GCash reference number must contain only letters and numbers.');
        return false;
      }
    } else if (paymentType === 'paymaya') {
      if (trimmed.length !== 16) {
        setRefError(`Maya reference number must be exactly 16 digits (${trimmed.length}/16).`);
        return false;
      }
      if (!/^\d+$/.test(trimmed)) {
        setRefError('Maya reference number must contain only numbers.');
        return false;
      }
    }
    
    setRefError('');
    return true;
  };

  const handleReferenceNumberChange = (e) => {
    const value = e.target.value;
    setReferenceNumber(value);
    validateReferenceNumber(value, activeTab);
  };

  const isRefNumberValid = () => {
    if (activeTab === 'cash') return true;
    const trimmed = (referenceNumber || '').trim().replace(/[\s-]/g, '');
    if (!trimmed) return false;
    if (activeTab === 'gcash') {
      return trimmed.length === 13 && /^[a-zA-Z0-9]+$/.test(trimmed);
    } else if (activeTab === 'paymaya') {
      return trimmed.length === 16 && /^\d+$/.test(trimmed);
    }
    return true;
  };

  useEffect(() => {
    // Reset ref no when switching payment method (avoid accidental reuse across methods)
    if (activeTab === 'cash') {
      setReferenceNumber('');
      setRefError('');
    } else {
      // Revalidate when tab changes
      validateReferenceNumber(referenceNumber, activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchQRCodeData = useCallback(async () => {
    setIsLoading(true);
    setQrError(null);
    try {
      const data = await getQRCode(activeTab, token);
      if (data && data.qr_code_url) {
        setQrPreviewUrl(data.qr_code_url.trim());
      } else {
        setQrPreviewUrl(null);
      }
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.error("Failed to fetch QR code:", error);
      }
      setQrPreviewUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, token]);

  useEffect(() => {
    if (!token) return;

    if (!isPaid && activeTab !== "cash") {
      fetchQRCodeData();
    } else if (activeTab === "cash") {
      setQrPreviewUrl(null);
      setQrError(null);
    }
  }, [activeTab, token, isPaid, fetchQRCodeData]);

  const handleSelectCash = async () => {
    try {
      setIsLoading(true);
      const updated = await selectCashPayment(currentMembership.id, token);
      setCurrentMembership(updated);
      setStatusModalConfig({
        title: 'Cash Selected',
        message: 'Pending – Awaiting Officer Confirmation',
        type: 'success',
      });
      setPendingUpdateResponse(updated);
      setShowStatusModal(true);
    } catch (error) {
      setStatusModalConfig({
        title: 'Unable to Select Cash',
        message: error?.response?.data?.detail || 'Failed to select cash payment. Please try again.',
        type: 'error',
      });
      setPendingUpdateResponse(null);
      setShowStatusModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentCompletedClose = () => {
    setShowStatusModal(false);
    if (pendingUpdateResponse) {
      onReceiptUploaded(pendingUpdateResponse);
      setPendingUpdateResponse(null);
    }
  };

  const switchToNext = () => {
    const currentIndex = paymentMethods.indexOf(activeTab);
    const nextIndex = (currentIndex + 1) % paymentMethods.length;
    setActiveTab(paymentMethods[nextIndex]);
  };

  const switchToPrevious = () => {
    const currentIndex = paymentMethods.indexOf(activeTab);
    const prevIndex = (currentIndex - 1 + paymentMethods.length) % paymentMethods.length;
    setActiveTab(paymentMethods[prevIndex]);
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setQrError("File size exceeds 5MB limit.");
        setSelectedReceipt(null);
        if (!currentMembership.receipt_path) {
          setReceiptPreviewUrl(null);
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        setQrError("Only PNG and JPEG images are allowed.");
        setSelectedReceipt(null);
        if (!currentMembership.receipt_path) {
          setReceiptPreviewUrl(null);
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      setSelectedReceipt(file);
      setReceiptPreviewUrl(URL.createObjectURL(file));
      setQrError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReceipt) {
      setQrError("No receipt file selected.");
      return;
    }

    const paymentType = activeTab.toLowerCase();
    const trimmedRef = (referenceNumber || '').trim().replace(/[\s-]/g, '');
    
    if (paymentType !== 'cash') {
      if (!trimmedRef) {
        setQrError('Reference number is required for GCash/PayMaya payments.');
        return;
      }
      
      if (paymentType === 'gcash') {
        if (trimmedRef.length !== 13) {
          setQrError('GCash reference number must be exactly 13 characters.');
          return;
        }
        if (!/^[a-zA-Z0-9]+$/.test(trimmedRef)) {
          setQrError('GCash reference number must contain only letters and numbers.');
          return;
        }
      } else if (paymentType === 'paymaya') {
        if (trimmedRef.length !== 16) {
          setQrError('Maya reference number must be exactly 16 digits.');
          return;
        }
        if (!/^\d+$/.test(trimmedRef)) {
          setQrError('Maya reference number must contain only numbers.');
          return;
        }
      }
    }

    try {
      setIsUploading(true);
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return newProgress;
        });
      }, 300);

      const sanitizedFileName = selectedReceipt.name.replace(/\s+/g, '_');
      const sanitizedFile = new File([selectedReceipt], sanitizedFileName, {
        type: selectedReceipt.type,
        lastModified: selectedReceipt.lastModified,
      });

      const uploadResponse = await uploadReceiptFile(sanitizedFile, token);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const updatePayload = {
        membership_id: currentMembership.id,
        payment_type: paymentType,
        receipt_path: uploadResponse.file_path,
        reference_number: paymentType === 'cash' ? null : trimmedRef,
      };
      const updateResponse = await updateMembershipReceipt(updatePayload, token);
      
      const updatedMembership = {
        ...currentMembership,
        receipt_path: uploadResponse.file_path,
        payment_method: paymentType,
        reference_number: paymentType === 'cash' ? null : trimmedRef,
      };
      setCurrentMembership(updatedMembership);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setSelectedReceipt(null);
        setStatusModalConfig({
          title: 'Payment Updated',
          message: 'Your payment receipt has been successfully uploaded.',
          type: 'success',
        });
        setPendingUpdateResponse(updateResponse);
        setShowStatusModal(true);
      }, 500);
      
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      console.error("Receipt upload error:", error);
      
      const errorDetail = error.response?.data?.detail || '';
      const statusCode = error.response?.status;
      
      if (statusCode === 409 || errorDetail.toLowerCase().includes('already used')) {
        setQrError('This reference number has already been used. Please check your payment details and enter the correct reference number.');
      } else if (errorDetail.includes('13 characters')) {
        setQrError('GCash reference number must be exactly 13 characters.');
      } else if (errorDetail.includes('16 digits')) {
        setQrError('Maya reference number must be exactly 16 digits.');
      } else if (errorDetail) {
        setQrError(errorDetail);
      } else {
        setQrError('Failed to upload receipt. Please try again.');
      }
    }
  };

  const getPaymentMethodLabel = (method) => {
    if (method === "gcash") return "G-Cash";
    if (method === "paymaya") return "PayMaya";
    if (method === "cash") return "Cash";
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  const formatDate = (date) => {
    return date ? new Date(date).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : "N/A";
  };

  const openFullReceiptModal = (url) => {
    if (url) {
      setFullReceiptUrl(url);
      setShowFullReceiptModal(true);
    }
  };

  const closeFullReceiptModal = () => {
    setShowFullReceiptModal(false);
    setFullReceiptUrl(null);
  };

  const handleReceiptImageError = () => {
    console.error("Failed to load receipt image from:", receiptPreviewUrl);
    setQrError("Failed to load receipt image. The image may be corrupted or no longer available.");
    setReceiptPreviewUrl(null);
  };

  const ReceiptPreview = ({ label, receiptUrl }) => (
    <div className="receipt-preview-container">
      <p className="receipt-label"><strong>{label}:</strong></p>
      {isReceiptLoading ? (
        <div className="receipt-loading">Loading receipt...</div>
      ) : receiptUrl ? (
        <div className="receipt-image-container">
          <img 
            src={receiptUrl} 
            alt={label} 
            className="receipt-preview" 
            onClick={() => openFullReceiptModal(receiptUrl)}
            onError={handleReceiptImageError}
          />
          <p className="receipt-hint">Click to view full size</p>
        </div>
      ) : (
        <div className="receipt-placeholder">
          Receipt image not available.
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="modal-overlay" onClick={(e) => {
        if (e.target.className === "modal-overlay" && !showStatusModal) {
          onClose();
        }
      }}>
        <div className="modal-container">
          <div className="payment-header">
            <div className="payment-name">
              {isPaid ? "Membership Details" : getPaymentMethodLabel(activeTab)}
            </div>
            <button className="close-buttons" onClick={onClose} aria-label="Close">×</button>
          </div>
          
          {isPaid ? (
            <div className="membership-details-section">
              <h3 className="details-title">Membership Details</h3>
              <div className="details-grid">
                <div className="detail-card">
                  <span className="detail-label">Requirement:</span>
                  <span className="detail-value">{currentMembership.requirement || "N/A"}</span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Amount:</span>
                  <span className="detail-value">₱{currentMembership.amount || "0"}</span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Payment Method:</span>
                  <span className="detail-value">{currentMembership.payment_method ? getPaymentMethodLabel(currentMembership.payment_method) : "N/A"}</span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Payment Date:</span>
                  <span className="detail-value">{formatDate(currentMembership.payment_date)}</span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Approval Date:</span>
                  <span className="detail-value">{formatDate(currentMembership.approval_date)}</span>
                </div>
              </div>
              
              {currentMembership.receipt_path && (
                <ReceiptPreview label="Receipt" receiptUrl={receiptPreviewUrl || currentMembership.receipt_path} />
              )}
            </div>
          ) : (
            <div className={isDenied ? "denial-section" : ""}>
              {isDenied && (
                <div className="denial-details">
                  <h3 className="details-title">Payment Denied</h3>
                  <div className="details-grid">
                    <div className="detail-card">
                      <span className="detail-label">Requirement:</span>
                      <span className="detail-value">{currentMembership.requirement || "N/A"}</span>
                    </div>
                    <div className="detail-card">
                      <span className="detail-label">Amount:</span>
                      <span className="detail-value">₱{currentMembership.amount || "0"}</span>
                    </div>
                    <div className="detail-card">
                      <span className="detail-label">Denial Reason:</span>
                      <span className="detail-value denial-reason">{currentMembership.denial_reason || "No reason provided"}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {(currentMembership.receipt_path || currentMembership.receipt_number) && !selectedReceipt && (
                <>
                  <div className="membership-details-section">
                    <h3 className="details-title">Payment Details</h3>
                    <div className="details-grid">
                      <div className="detail-card">
                        <span className="detail-label">Requirement:</span>
                        <span className="detail-value">{currentMembership.requirement || "N/A"}</span>
                      </div>
                      <div className="detail-card">
                        <span className="detail-label">Amount:</span>
                        <span className="detail-value">₱{currentMembership.amount || "0"}</span>
                      </div>
                      <div className="detail-card">
                        <span className="detail-label">Payment Method:</span>
                        <span className="detail-value">{currentMembership.payment_method ? getPaymentMethodLabel(currentMembership.payment_method) : "N/A"}</span>
                      </div>
                      {currentMembership.receipt_number && (
                        <div className="detail-card">
                          <span className="detail-label">Receipt Number:</span>
                          <span className="detail-value">{currentMembership.receipt_number}</span>
                        </div>
                      )}
                      <div className="detail-card">
                        <span className="detail-label">Payment Date:</span>
                        <span className="detail-value">{formatDate(currentMembership.payment_date)}</span>
                      </div>
                      <div className="detail-card">
                        <span className="detail-label">Approval Date:</span>
                        <span className="detail-value">{formatDate(currentMembership.approval_date)}</span>
                      </div>
                    </div>
                  </div>
                  {currentMembership.receipt_path && (
                    <ReceiptPreview label="Current Receipt" receiptUrl={receiptPreviewUrl || currentMembership.receipt_path} />
                  )}
                </>
              )}
              
              {/* Payment Method Selector */}
              <div className="payment-method-selector">
                <label className="payment-method-label">Select Payment Method:</label>
                <div className="payment-method-buttons">
                  {paymentMethods.map((method) => (
                    <button
                      key={method}
                      type="button"
                      className={`payment-method-btn ${activeTab === method ? 'active' : ''}`}
                      onClick={() => setActiveTab(method)}
                      disabled={isLoading}
                    >
                      {getPaymentMethodLabel(method)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="qr-container">
                {isLoading ? (
                  <div className="qr-loading">Loading QR code...</div>
                ) : qrError && !receiptPreviewUrl ? (
                  <div className="qr-error">{qrError}</div>
                ) : qrPreviewUrl ? (
                  <>
                    <div className="scan-badge">SCAN ME</div>
                    <img 
                      src={qrPreviewUrl} 
                      alt="QR Code" 
                      className="qr-image" 
                      onError={() => setQrError(`Failed to load QR code image for ${activeTab}.`)} 
                    />
                  </>
                ) : (
                  <div className="qr-placeholder">No QR Code available</div>
                )}
                
                {paymentMethods.length > 1 && (
                  <div className="navigation-arrows">
                    <button 
                      className="nav-arrow left" 
                      onClick={switchToPrevious} 
                      aria-label="Previous" 
                      disabled={isLoading}
                    >
                    &lt;
                    </button>
                    <button 
                      className="nav-arrow right" 
                      onClick={switchToNext} 
                      aria-label="Next" 
                      disabled={isLoading}
                    >
                    &gt;
                    </button>
                  </div>
                )}
              </div>
              
              <div className="instruction-section">
                <h3>Instructions</h3>
                <ol className="instruction-steps">
                  {activeTab === "cash" ? (
                    <>
                      <li>Select Cash as your payment method</li>
                      <li>Pay the officer in cash for {currentMembership.requirement || "membership"}</li>
                      <li>Wait for officer confirmation</li>
                    </>
                  ) : (
                    <>
                      <li>Scan the QR code with your {getPaymentMethodLabel(activeTab)} app</li>
                      <li>Complete the payment for {currentMembership.requirement || "membership"}</li>
                      <li>Take a screenshot of your receipt</li>
                      <li>Upload the receipt below</li>
                    </>
                  )}
                </ol>
              </div>
              
              {activeTab === 'cash' && (
                <div className="upload-section">
                  <div className="upload-label">Cash Payment</div>
                  <p className="upload-hint">
                    Cash payments must be confirmed by an officer. Receipt upload is disabled.
                  </p>
                  <button
                    className="submit-receipt-btn"
                    onClick={handleSelectCash}
                    disabled={isLoading || isUploading || isPaid || isPendingCash}
                    type="button"
                  >
                    {isPendingCash ? 'Awaiting Officer Confirmation' : 'Select Cash & Continue'}
                  </button>
                </div>
              )}
              
              {activeTab !== 'cash' && (
              <div className="upload-section">
                <div className="upload-label">
                  {currentMembership.receipt_path ? 'Upload New Payment Receipt' : 'Upload Payment Receipt'}
                </div>
                <p className="upload-hint">PNG or JPEG only. Max file size: 5MB</p>
                <button 
                  className="upload-button" 
                  onClick={handleUploadClick} 
                  disabled={isUploading || isLoading}
                >
                  <span className="upload-icon">+</span>
                  <span>{selectedReceipt ? 'CHANGE FILE' : 'UPLOAD'}</span>
                </button>
                <input 
                  type="file" 
                  accept="image/png,image/jpeg,image/jpg" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                  ref={fileInputRef} 
                  disabled={isUploading || isLoading}
                />
              </div>
              )}
              
              {selectedReceipt && receiptPreviewUrl && (
                <div className="receipt-preview-container">
                  <p className="receipt-label"><strong>New Receipt Preview:</strong></p>
                  <div className="receipt-image-container">
                    <img 
                      src={receiptPreviewUrl} 
                      alt="Receipt Preview" 
                      className="receipt-preview" 
                      onClick={() => openFullReceiptModal(receiptPreviewUrl)}
                      onError={() => {
                        setQrError("Failed to load receipt preview image.");
                        setReceiptPreviewUrl(null);
                      }} 
                    />
                    <p className="receipt-hint">Click to view full size</p>
                  </div>

                  {activeTab !== 'cash' && (
                    <div className="reference-number-section">
                      <label className="reference-number-label" htmlFor="referenceNumber">
                        Reference No. ({getPaymentMethodLabel(activeTab)})
                      </label>
                      <input
                        id="referenceNumber"
                        className={`reference-number-input ${refError ? 'input-error' : ''}`}
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        value={referenceNumber}
                        onChange={handleReferenceNumberChange}
                        placeholder={activeTab === 'gcash' ? 'Enter 13-character ref no.' : 'Enter 16-digit ref no.'}
                        disabled={isUploading || isLoading}
                        maxLength={activeTab === 'gcash' ? 13 : 16}
                      />
                      {refError ? (
                        <span className="reference-number-error">{refError}</span>
                      ) : (
                        <span className="reference-number-hint">
                          {activeTab === 'gcash' 
                            ? 'GCash reference numbers have 13 characters' 
                            : 'Maya reference numbers have 16 digits'}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {isUploading ? (
                    <div className="upload-progress-container">
                      <div className="upload-progress-bar">
                        <div 
                          className="upload-progress-fill" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <div className="upload-progress-text">
                        Uploading... {uploadProgress}%
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="submit-receipt-btn" 
                      onClick={handleSubmit}
                      disabled={isLoading || !selectedReceipt || !isRefNumberValid()}
                    >
                      Submit Receipt
                    </button>
                  )}
                </div>
              )}
              
              {qrError && (
                <div className="error-message">
                  {qrError}
                </div>
              )}
            </div>
          )}

          {showFullReceiptModal && (
            <div className="modal-overlay full-receipt-overlay" onClick={closeFullReceiptModal}>
              <div className="full-recept-modal">
                <div className="full-receipt-header">
                  <button className="close-buttons" onClick={closeFullReceiptModal} aria-label="Close">×</button>
                </div>
                <img 
                  src={fullReceiptUrl} 
                  alt="Full Receipt" 
                  className="full-receipt-image"
                  onError={() => {
                    setQrError("Failed to load full receipt image.");
                    closeFullReceiptModal();
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <StatusModal 
        isOpen={showStatusModal}
        onClose={handlePaymentCompletedClose}
        title={statusModalConfig.title}
        message={statusModalConfig.message}
        type={statusModalConfig.type}
      />
    </>
  );
};

export default MembershipModal;