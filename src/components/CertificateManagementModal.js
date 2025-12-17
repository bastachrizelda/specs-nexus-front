import React, { useState, useEffect, useRef } from 'react';
import {
  getCertificateTemplate,
  uploadCertificateTemplate,
  getEligibleCount,
  generateBulkCertificates,
} from '../services/certificateService';
import '../styles/CertificateManagementModal.css';

const CertificateManagementModal = ({ show, onClose, event, token, onStatusUpdate }) => {
  const [activeTab, setActiveTab] = useState('template');
  const [template, setTemplate] = useState(null);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateFile, setTemplateFile] = useState(null);
  const [templatePreview, setTemplatePreview] = useState(null);
  const [nameX, setNameX] = useState(500);
  const [nameY, setNameY] = useState(300);
  const [fontSize, setFontSize] = useState(48);
  const [fontColor, setFontColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontWeight, setFontWeight] = useState('400');
  const [generationResult, setGenerationResult] = useState(null);
  const [previewName, setPreviewName] = useState('Juan Dela Cruz');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const textBoxRef = useRef(null);

  useEffect(() => {
    if (show && event?.id) {
      fetchTemplateAndEligible();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, event?.id]);

  const fetchTemplateAndEligible = async () => {
    setIsLoading(true);
    try {
      const [templateData, eligibleData] = await Promise.all([
        getCertificateTemplate(event.id, token).catch(() => null),
        getEligibleCount(event.id, token).catch(() => ({ eligible_count: 0 })),
      ]);

      if (templateData) {
        setTemplate(templateData);
        setNameX(templateData.name_x || 500);
        setNameY(templateData.name_y || 300);
        setFontSize(templateData.font_size || 48);
        setFontColor(templateData.font_color || '#000000');
        setFontFamily(templateData.font_family || 'Arial');
        setFontWeight(templateData.font_weight || '400');
      }

      setEligibleCount(eligibleData?.eligible_count || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        onStatusUpdate({
          type: 'error',
          title: 'Invalid File',
          message: 'Please select a valid image file (PNG, JPG, etc.).',
        });
        return;
      }
      setTemplateFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTemplatePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTemplateUpload = async () => {
    if (!templateFile) {
      onStatusUpdate({
        type: 'error',
        title: 'No File Selected',
        message: 'Please select a template image to upload.',
      });
      return;
    }

    if (!nameX || !nameY) {
      onStatusUpdate({
        type: 'error',
        title: 'Position Not Set',
        message: 'Please click on the template to set the name position.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('template_file', templateFile);
      formData.append('name_x', nameX);
      formData.append('name_y', nameY);
      formData.append('font_size', fontSize);
      formData.append('font_color', fontColor);
      formData.append('font_family', fontFamily);
      formData.append('font_weight', fontWeight);

      const result = await uploadCertificateTemplate(event.id, formData, token);
      setTemplate(result);
      setTemplateFile(null);
      setTemplatePreview(null);

      onStatusUpdate({
        type: 'success',
        title: 'Template Uploaded',
        message: 'Certificate template has been uploaded successfully. You can now generate certificates.',
      });
      
      // Refresh eligible count
      const eligibleData = await getEligibleCount(event.id, token).catch(() => ({ eligible_count: 0 }));
      setEligibleCount(eligibleData?.eligible_count || 0);
    } catch (error) {
      onStatusUpdate({
        type: 'error',
        title: 'Upload Failed',
        message: error.message || 'Failed to upload template.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCertificates = async () => {
    if (!template) {
      onStatusUpdate({
        type: 'error',
        title: 'No Template',
        message: 'Please upload a certificate template first.',
      });
      return;
    }

    if (eligibleCount === 0) {
      onStatusUpdate({
        type: 'error',
        title: 'No Eligible Users',
        message: 'There are no eligible users for certificate generation.',
      });
      return;
    }

    setIsGenerating(true);
    setGenerationResult(null);
    try {
      const result = await generateBulkCertificates(event.id, token);
      setGenerationResult(result);

      if (result.generated_count > 0) {
        onStatusUpdate({
          type: 'success',
          title: 'Certificates Generated Successfully',
          message: `Successfully generated ${result.generated_count} personalized certificate${result.generated_count > 1 ? 's' : ''}. ${result.failed_count > 0 ? `${result.failed_count} failed.` : 'All certificates have been sent to students.'}`,
        });
      } else if (result.failed_count > 0) {
        onStatusUpdate({
          type: 'error',
          title: 'Generation Failed',
          message: `Failed to generate ${result.failed_count} certificates. Please check the template and try again.`,
        });
      } else {
        onStatusUpdate({
          type: 'success',
          title: 'All Certificates Already Generated',
          message: 'All eligible users already have certificates for this event.',
        });
      }

      // Refresh eligible count
      const eligibleData = await getEligibleCount(event.id, token).catch(() => ({ eligible_count: 0 }));
      setEligibleCount(eligibleData?.eligible_count || 0);
    } catch (error) {
      onStatusUpdate({
        type: 'error',
        title: 'Generation Failed',
        message: error.message || 'Failed to generate certificates.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMouseDown = (e) => {
    if (!textBoxRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = textBoxRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !imageRef.current) return;
    
    const imageRect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - imageRect.left - dragOffset.x;
    const y = e.clientY - imageRect.top - dragOffset.y;
    
    const scaleX = imageRef.current.naturalWidth / imageRect.width;
    const scaleY = imageRef.current.naturalHeight / imageRect.height;
    
    const actualX = Math.round(x * scaleX);
    const actualY = Math.round(y * scaleY);
    
    const clampedX = Math.max(0, Math.min(actualX, imageRef.current.naturalWidth));
    const clampedY = Math.max(0, Math.min(actualY, imageRef.current.naturalHeight));
    
    setNameX(clampedX);
    setNameY(clampedY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  if (!show) return null;

  return (
    <div className="cert-modal-overlay" onClick={onClose}>
      <div className="cert-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="cert-modal-header">
          <h2>
            <i className="fas fa-certificate"></i>
            Certificate Management
          </h2>
          <span className="cert-event-title">{event?.title}</span>
          <button className="cert-close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="cert-modal-tabs">
          <button
            className={`cert-tab ${activeTab === 'template' ? 'active' : ''}`}
            onClick={() => setActiveTab('template')}
          >
            <i className="fas fa-image"></i>
            Template
          </button>
          <button
            className={`cert-tab ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            <i className="fas fa-magic"></i>
            Generate
          </button>
        </div>

        <div className="cert-modal-content">
          {isLoading ? (
            <div className="cert-loading">
              <i className="fas fa-spinner fa-spin"></i>
              <span>Loading...</span>
            </div>
          ) : activeTab === 'template' ? (
            <div className="cert-template-tab">
              <div className="cert-template-section">
                <h3>Certificate Template</h3>
                <p className="cert-hint">
                  <i className="fas fa-info-circle"></i>
                  Upload a certificate template image, then click on it to set where the name should appear.
                </p>

                <div className="cert-template-preview">
                  {templatePreview || template?.template_url ? (
                    <div className="cert-image-container">
                      <img
                        ref={imageRef}
                        src={templatePreview || template?.template_url}
                        alt="Certificate Template"
                        className="cert-template-image"
                        draggable={false}
                      />
                      <div
                        ref={textBoxRef}
                        className={`cert-draggable-textbox ${isDragging ? 'dragging' : ''}`}
                        style={{
                          left: `${imageRef.current ? (nameX / imageRef.current.naturalWidth) * 100 : 50}%`,
                          top: `${imageRef.current ? (nameY / imageRef.current.naturalHeight) * 100 : 50}%`,
                          fontSize: `${fontSize / 4}px`,
                          color: fontColor,
                          fontFamily: fontFamily.includes('Poppins') ? '"Poppins", sans-serif' : fontFamily.includes('Montserrat') ? '"Montserrat", sans-serif' : fontFamily,
                          fontWeight: fontWeight,
                        }}
                        onMouseDown={handleMouseDown}
                      >
                        <div className="cert-textbox-handle">
                          <i className="fas fa-arrows-alt"></i>
                        </div>
                        <div className="cert-textbox-text">
                          {previewName}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="cert-no-template">
                      <i className="fas fa-image"></i>
                      <span>No template uploaded</span>
                      <p className="cert-hint-small">Click &quot;Select Template Image&quot; below to get started</p>
                    </div>
                  )}
                </div>

                <div className="cert-upload-section">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <button
                    className="cert-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <i className="fas fa-upload"></i>
                    Select Template Image
                  </button>
                  {templateFile && (
                    <span className="cert-file-name">{templateFile.name}</span>
                  )}
                </div>
              </div>

              <div className="cert-settings-section">
                <h3>Text Settings</h3>
                <div className="cert-preview-name-section">
                  <label>Preview Name</label>
                  <input
                    type="text"
                    value={previewName}
                    onChange={(e) => setPreviewName(e.target.value)}
                    placeholder="Enter a sample name"
                    className="cert-preview-name-input"
                  />
                  <span className="cert-hint-small">This name will be shown in the preview</span>
                </div>
                <div className="cert-settings-grid">
                  <div className="cert-setting">
                    <label>Name X Position</label>
                    <input
                      type="number"
                      value={nameX}
                      onChange={(e) => setNameX(parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  <div className="cert-setting">
                    <label>Name Y Position</label>
                    <input
                      type="number"
                      value={nameY}
                      onChange={(e) => setNameY(parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  <div className="cert-setting">
                    <label>Font Size</label>
                    <input
                      type="number"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value) || 48)}
                      min="12"
                      max="200"
                    />
                  </div>
                  <div className="cert-setting">
                    <label>Font Color</label>
                    <input
                      type="color"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                    />
                  </div>
                  <div className="cert-setting">
                    <label>Font Family</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                    >
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Montserrat">Montserrat</option>
                    </select>
                  </div>
                  <div className="cert-setting">
                    <label>Font Weight</label>
                    <select
                      value={fontWeight}
                      onChange={(e) => setFontWeight(e.target.value)}
                    >
                      <option value="400">Regular</option>
                      <option value="700">Bold</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="cert-actions">
                <button
                  className="cert-save-btn"
                  onClick={handleTemplateUpload}
                  disabled={isLoading || !templateFile}
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      Save Template
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="cert-generate-tab">
              <div className="cert-status-cards">
                <div className="cert-status-card">
                  <i className="fas fa-file-alt"></i>
                  <div className="cert-status-info">
                    <span className="cert-status-label">Template Status</span>
                    <span className={`cert-status-value ${template ? 'ready' : 'missing'}`}>
                      {template ? 'Ready' : 'Not Uploaded'}
                    </span>
                  </div>
                </div>
                <div className="cert-status-card">
                  <i className="fas fa-users"></i>
                  <div className="cert-status-info">
                    <span className="cert-status-label">Eligible Users</span>
                    <span className="cert-status-value">{eligibleCount}</span>
                  </div>
                </div>
              </div>

              {!template && (
                <div className="cert-warning">
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>Please upload a certificate template first before generating certificates.</span>
                </div>
              )}

              {eligibleCount === 0 && template && (
                <div className="cert-info">
                  <i className="fas fa-info-circle"></i>
                  <span>
                    No eligible users found. Users must have checked in or completed evaluation to receive certificates.
                  </span>
                </div>
              )}

              {generationResult && (
                <div className="cert-result">
                  <h4>Generation Results</h4>
                  <div className="cert-result-stats">
                    <div className="cert-result-stat success">
                      <i className="fas fa-check-circle"></i>
                      <span>{generationResult.generated_count} Generated</span>
                    </div>
                    {generationResult.failed_count > 0 && (
                      <div className="cert-result-stat error">
                        <i className="fas fa-times-circle"></i>
                        <span>{generationResult.failed_count} Failed</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="cert-generate-actions">
                <button
                  className="cert-generate-btn"
                  onClick={handleGenerateCertificates}
                  disabled={isGenerating || !template || eligibleCount === 0}
                >
                  {isGenerating ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Generating {eligibleCount} Certificate{eligibleCount !== 1 ? 's' : ''}...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-magic"></i>
                      Generate {eligibleCount} Personalized Certificate{eligibleCount !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
              {template && eligibleCount > 0 && (
                <div className="cert-info-note">
                  <i className="fas fa-info-circle"></i>
                  <span>
                    Each certificate will be personalized with the student&apos;s name and automatically sent to their account.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateManagementModal;
