import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusModal from './StatusModal';
import QRScanner from './QRScanner';
import '../styles/EventParticipantsModal.css';

// Use the same API resolution logic as the rest of the app
const defaultBackendBaseUrl = 'https://specs-nexus.onrender.com';
const API_URL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : defaultBackendBaseUrl);

const EventParticipantsModal = ({ show, participants = [], onClose, isLoading = false, eventId, eventTitle, onRefresh, event }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [evaluationOpen, setEvaluationOpen] = useState(false);
  const [isTogglingEvaluation, setIsTogglingEvaluation] = useState(false);
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
  });
  const [uploading, setUploading] = useState({});
  const [checkingIn, setCheckingIn] = useState({});
  const [certificateData, setCertificateData] = useState({});
  const navigate = useNavigate();

  // Initialize evaluation toggle state from event
  useEffect(() => {
    if (event?.evaluation_open !== undefined) {
      setEvaluationOpen(event.evaluation_open);
    }
  }, [event]);

  // Fetch certificate metadata for each participant
  useEffect(() => {
    if (!show || !eventId || isLoading || !participants.length) return;

    const fetchCertificates = async () => {
      const newCertificateData = {};
      const token = localStorage.getItem('officerAccessToken');
      if (!token) {
        console.log('No officer token found, redirecting to login');
        localStorage.removeItem('officerAccessToken');
        localStorage.removeItem('officerInfo');
        navigate('/officer-login');
        return;
      }

      for (const participant of participants) {
        try {
          const response = await fetch(`${API_URL}/events/${eventId}/certificates/${participant.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            newCertificateData[participant.id] = {
              file_url: data.certificate_url || null,
              file_name: data.file_name || 'Certificate',
              event_title: data.event_title || 'Unknown Event',
            };
          } else if (response.status === 404) {
            // Certificate not found for this user
            newCertificateData[participant.id] = null;
          } else if (response.status === 401) {
            console.log('Authentication failed, redirecting to login');
            localStorage.removeItem('officerAccessToken');
            localStorage.removeItem('officerInfo');
            navigate('/officer-login');
            return;
          } else {
            console.warn(`Failed to fetch certificate for user ${participant.id}: ${response.status}`);
            newCertificateData[participant.id] = null;
          }
        } catch (err) {
          console.error(`Failed to fetch certificate for user ${participant.id}:`, err);
          newCertificateData[participant.id] = null;
        }
      }
      setCertificateData(newCertificateData);
    };

    fetchCertificates();
  }, [show, eventId, participants, isLoading, navigate]);

  // Split participants into present and absent
  const { presentParticipants, absentParticipants } = useMemo(() => {
    const present = participants.filter(p => p.attendance_status === 'present');
    const absent = participants.filter(p => p.attendance_status !== 'present');
    return { presentParticipants: present, absentParticipants: absent };
  }, [participants]);

  // Calculate eligible participants (Present only)
  const eligibleParticipants = useMemo(() => {
    return presentParticipants;
  }, [presentParticipants]);

  // Filter present and absent based on search
  const filteredPresent = useMemo(() => {
    if (!searchTerm) return presentParticipants;
    const lowerSearch = searchTerm.toLowerCase();
    return presentParticipants.filter(p =>
      (p.full_name?.toLowerCase()?.includes(lowerSearch) || '') ||
      (p.email?.toLowerCase()?.includes(lowerSearch) || '') ||
      (p.block?.toLowerCase()?.includes(lowerSearch) || '') ||
      (p.year?.toString()?.includes(lowerSearch) || '')
    );
  }, [presentParticipants, searchTerm]);

  const filteredAbsent = useMemo(() => {
    if (!searchTerm) return absentParticipants;
    const lowerSearch = searchTerm.toLowerCase();
    return absentParticipants.filter(p =>
      (p.full_name?.toLowerCase()?.includes(lowerSearch) || '') ||
      (p.email?.toLowerCase()?.includes(lowerSearch) || '') ||
      (p.block?.toLowerCase()?.includes(lowerSearch) || '') ||
      (p.year?.toString()?.includes(lowerSearch) || '')
    );
  }, [absentParticipants, searchTerm]);

  if (!show) return null;

  const bccEmails = participants.map(p => p.email).filter(email => email).join(',');
  const subject = encodeURIComponent("Message to Event Participants");
  const mailtoLink = `mailto:?bcc=${encodeURIComponent(bccEmails)}&subject=${subject}`;

  // Handle check-in
  const handleCheckIn = async (userId) => {
    if (!eventId) return;
    
    setCheckingIn(prev => ({ ...prev, [userId]: true }));
    
    try {
      const token = localStorage.getItem('officerAccessToken');
      if (!token) {
        navigate('/officer-login');
        return;
      }

      const response = await fetch(`${API_URL}/events/${eventId}/check-in/${userId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setStatusModal({
          isOpen: true,
          title: 'Check-in Successful',
          message: 'Participant has been marked as present.',
          type: 'success',
        });
        // Refresh participants list
        if (onRefresh) {
          onRefresh();
        }
      } else if (response.status === 401) {
        localStorage.removeItem('officerAccessToken');
        localStorage.removeItem('officerInfo');
        navigate('/officer-login');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to check in participant');
      }
    } catch (err) {
      console.error('Check-in failed:', err);
      setStatusModal({
        isOpen: true,
        title: 'Check-in Failed',
        message: err.message || 'Failed to check in participant. Please try again.',
        type: 'error',
      });
    } finally {
      setCheckingIn(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Handle remove check-in
  const handleRemoveCheckIn = async (userId) => {
    if (!eventId) return;
    
    setCheckingIn(prev => ({ ...prev, [userId]: true }));
    
    try {
      const token = localStorage.getItem('officerAccessToken');
      if (!token) {
        navigate('/officer-login');
        return;
      }

      const response = await fetch(`${API_URL}/events/${eventId}/check-in/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setStatusModal({
          isOpen: true,
          title: 'Check-in Removed',
          message: 'Participant attendance has been removed.',
          type: 'success',
        });
        // Refresh participants list
        if (onRefresh) {
          onRefresh();
        }
      } else if (response.status === 401) {
        localStorage.removeItem('officerAccessToken');
        localStorage.removeItem('officerInfo');
        navigate('/officer-login');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to remove check-in');
      }
    } catch (err) {
      console.error('Remove check-in failed:', err);
      setStatusModal({
        isOpen: true,
        title: 'Remove Failed',
        message: err.message || 'Failed to remove check-in. Please try again.',
        type: 'error',
      });
    } finally {
      setCheckingIn(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleToggleEvaluation = async () => {
    if (!eventId) return;
    
    setIsTogglingEvaluation(true);
    const newState = !evaluationOpen;
    
    try {
      const token = localStorage.getItem('officerAccessToken');
      if (!token) {
        navigate('/officer-login');
        return;
      }

      const formData = new FormData();
      formData.append('evaluation_open', newState);

      const response = await fetch(`${API_URL}/admin/events/${eventId}/toggle-evaluation`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setEvaluationOpen(newState);
        setStatusModal({
          isOpen: true,
          title: 'Evaluation Form ' + (newState ? 'Enabled' : 'Disabled'),
          message: `Students can ${newState ? 'now' : 'no longer'} access the evaluation form.`,
          type: 'success',
        });
        if (onRefresh) {
          onRefresh();
        }
      } else if (response.status === 401) {
        localStorage.removeItem('officerAccessToken');
        localStorage.removeItem('officerInfo');
        navigate('/officer-login');
      } else {
        throw new Error('Failed to toggle evaluation');
      }
    } catch (err) {
      console.error('Toggle evaluation failed:', err);
      setStatusModal({
        isOpen: true,
        title: 'Toggle Failed',
        message: 'Failed to toggle evaluation form. Please try again.',
        type: 'error',
      });
    } finally {
      setIsTogglingEvaluation(false);
    }
  };

  const handleCopyEmails = async () => {
    if (!bccEmails) {
      setStatusModal({
        isOpen: true,
        title: 'No Emails',
        message: 'No valid participant emails available to copy.',
        type: 'error',
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(bccEmails);
      setStatusModal({
        isOpen: true,
        title: 'Emails Copied',
        message: 'Emails copied successfully!',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to copy emails:', err);
      setStatusModal({
        isOpen: true,
        title: 'Copy Failed',
        message: 'Failed to copy emails. Please try again.',
        type: 'error',
      });
    }
  };

  const handleUploadCertificate = async (userId, file) => {
    if (!file) {
      setStatusModal({
        isOpen: true,
        title: 'No File Selected',
        message: 'Please select a file to upload.',
        type: 'error',
      });
      return;
    }

    if (!eventId) {
      setStatusModal({
        isOpen: true,
        title: 'Invalid Event',
        message: 'Event ID is missing. Please try again.',
        type: 'error',
      });
      return;
    }

    setUploading(prev => ({ ...prev, [userId]: true }));

    try {
      const sanitizedFileName = file.name.replace(/\s+/g, '');
      const sanitizedFile = new File([file], sanitizedFileName, { type: file.type });

      const formData = new FormData();
      formData.append('certificate', sanitizedFile);

      const token = localStorage.getItem('officerAccessToken');
      if (!token) {
        console.log('No officer token found, redirecting to login');
        localStorage.removeItem('officerAccessToken');
        localStorage.removeItem('officerInfo');
        navigate('/officer-login');
        return;
      }

      const response = await fetch(`${API_URL}/events/${eventId}/certificates/${userId}`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Certificate upload response:', { status: response.status, statusText: response.statusText });

      if (!response.ok) {
        let errorMessage = 'Failed to upload certificate';
        let errorData = {};
        try {
          errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        console.error('Certificate upload error:', errorData);
        if (response.status === 401) {
          console.log('Authentication failed, redirecting to login');
          localStorage.removeItem('officerAccessToken');
          localStorage.removeItem('officerInfo');
          navigate('/officer-login');
          return;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setCertificateData(prev => ({
        ...prev,
        [userId]: {
          file_url: data.certificate_url || null,
          file_name: data.file_name || 'Certificate',
          event_title: data.event_title || 'Unknown Event',
        },
      }));

      setStatusModal({
        isOpen: true,
        title: 'Certificate Uploaded',
        message: certificateData[userId] ? 'E-Certificate replaced successfully!' : 'Certificate uploaded successfully!',
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to upload certificate:', err);
      setStatusModal({
        isOpen: true,
        title: 'Upload Failed',
        message: err.message || 'Failed to upload certificate. Please try again.',
        type: 'error',
      });
    } finally {
      setUploading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const closeStatusModal = () => {
    setStatusModal(prev => ({ ...prev, isOpen: false }));
  };

  // Handle batch certificate upload
  const handleBatchCertificateUpload = async (file) => {
    if (!file) {
      setStatusModal({
        isOpen: true,
        title: 'No File Selected',
        message: 'Please select a certificate file to upload.',
        type: 'error',
      });
      return;
    }

    if (!eventId) {
      setStatusModal({
        isOpen: true,
        title: 'Invalid Event',
        message: 'Event ID is missing. Please try again.',
        type: 'error',
      });
      return;
    }

    if (eligibleParticipants.length === 0) {
      setStatusModal({
        isOpen: true,
        title: 'No Eligible Participants',
        message: 'There are no eligible participants (Present + Evaluation Completed) for certificate distribution.',
        type: 'error',
      });
      return;
    }

    setIsBatchUploading(true);

    try {
      const sanitizedFileName = file.name.replace(/\s+/g, '');
      const sanitizedFile = new File([file], sanitizedFileName, { type: file.type });

      const formData = new FormData();
      formData.append('certificate', sanitizedFile);

      const token = localStorage.getItem('officerAccessToken');
      if (!token) {
        localStorage.removeItem('officerAccessToken');
        localStorage.removeItem('officerInfo');
        navigate('/officer-login');
        return;
      }

      const response = await fetch(`${API_URL}/events/${eventId}/certificates/batch`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload batch certificates';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        if (response.status === 401) {
          localStorage.removeItem('officerAccessToken');
          localStorage.removeItem('officerInfo');
          navigate('/officer-login');
          return;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      setStatusModal({
        isOpen: true,
        title: 'Batch Upload Successful',
        message: `Successfully distributed certificates to ${data.distributed_count || eligibleParticipants.length} eligible participant(s).`,
        type: 'success',
      });

      // Refresh certificate data
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to upload batch certificates:', err);
      setStatusModal({
        isOpen: true,
        title: 'Batch Upload Failed',
        message: err.message || 'Failed to upload batch certificates. Please try again.',
        type: 'error',
      });
    } finally {
      setIsBatchUploading(false);
    }
  };

  // Export registration list (pre-event)
  const handleExportRegistrationList = async () => {
    if (participants.length === 0) {
      setStatusModal({
        isOpen: true,
        title: 'No Data',
        message: 'No participants to export.',
        type: 'error',
      });
      return;
    }

    setIsExporting(true);

    try {
      const XLSX = await import('xlsx-js-style');

      // Prepare registration data
      const registrationData = participants.map((p, index) => ({
        'No.': index + 1,
        'Student No.': p.student_number || 'N/A',
        'Name': p.full_name || 'Unknown',
        'Year': p.year ? p.year.replace(' year', '').replace(' Year', '') : 'N/A',
        'Block': p.block || 'N/A',
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(registrationData);

      // Column widths
      ws['!cols'] = [
        { wch: 5 },   // No.
        { wch: 15 },  // Student No.
        { wch: 30 },  // Name
        { wch: 8 },   // Year
        { wch: 8 },   // Block
      ];

      // Style header row
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2D5641' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      };

      const dataStyle = {
        alignment: { vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } },
        },
      };

      const centerDataStyle = {
        ...dataStyle,
        alignment: { horizontal: 'center', vertical: 'center' },
      };

      // Apply header styles
      const headers = ['A', 'B', 'C', 'D', 'E'];
      headers.forEach(col => {
        const cell = ws[`${col}1`];
        if (cell) {
          cell.s = headerStyle;
        }
      });

      // Apply data row styles
      for (let i = 0; i < registrationData.length; i++) {
        const rowNum = i + 2;
        
        headers.forEach((col, colIndex) => {
          const cell = ws[`${col}${rowNum}`];
          if (cell) {
            if (colIndex === 0 || colIndex === 3 || colIndex === 4) {
              // No., Year, Block - centered
              cell.s = centerDataStyle;
            } else {
              cell.s = dataStyle;
            }
          }
        });
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Registration List');

      // Create summary sheet
      const PHILIPPINES_TZ = 'Asia/Manila';
      const summaryData = [
        { 'Metric': 'Event Title', 'Value': eventTitle || 'Event Registration List' },
        { 'Metric': 'Export Date', 'Value': new Date().toLocaleString('en-US', { timeZone: PHILIPPINES_TZ }) },
        { 'Metric': 'Total Registered', 'Value': participants.length },
      ];

      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 18 }, { wch: 40 }];

      // Style summary header
      ['A1', 'B1'].forEach(cell => {
        if (summaryWs[cell]) {
          summaryWs[cell].s = headerStyle;
        }
      });

      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0];
      const safeTitle = (eventTitle || 'Event').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const filename = `Registration_List_${safeTitle}_${dateStr}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      setStatusModal({
        isOpen: true,
        title: 'Export Successful',
        message: `Registration list exported as ${filename}`,
        type: 'success',
      });
    } catch (err) {
      console.error('Export failed:', err);
      setStatusModal({
        isOpen: true,
        title: 'Export Failed',
        message: 'Failed to export registration list. Please try again.',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export attendance to Excel
  const handleExportAttendance = async () => {
    if (participants.length === 0) {
      setStatusModal({
        isOpen: true,
        title: 'No Data',
        message: 'No participants to export.',
        type: 'error',
      });
      return;
    }

    setIsExporting(true);

    try {
      // Dynamic import of xlsx-js-style
      const XLSX = await import('xlsx-js-style');

      // Prepare attendance data
      const attendanceData = participants.map((p, index) => ({
        'No.': index + 1,
        'Student Number': p.student_number || 'N/A',
        'Full Name': p.full_name || 'Unknown',
        'Email': p.email || 'N/A',
        'Year': p.year || 'N/A',
        'Block': p.block || 'N/A',
        'Status': p.attendance_status === 'present' ? 'PRESENT' : 'ABSENT',
        'Check-in Time': p.attendance_status === 'present' && p.checked_in_at 
          ? new Date(p.checked_in_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Manila'
            })
          : '-',
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(attendanceData);

      // Column widths
      ws['!cols'] = [
        { wch: 5 },   // No.
        { wch: 15 },  // Student Number
        { wch: 25 },  // Full Name
        { wch: 30 },  // Email
        { wch: 6 },   // Year
        { wch: 8 },   // Block
        { wch: 10 },  // Status
        { wch: 22 },  // Check-in Time
      ];

      // Style header row
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2D5641' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      };

      const dataStyle = {
        alignment: { vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } },
        },
      };

      const presentStyle = {
        ...dataStyle,
        font: { color: { rgb: '059669' }, bold: true },
      };

      const absentStyle = {
        ...dataStyle,
        font: { color: { rgb: 'DC2626' } },
      };

      // Apply header styles
      const headers = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      headers.forEach(col => {
        const cell = ws[`${col}1`];
        if (cell) {
          cell.s = headerStyle;
        }
      });

      // Apply data row styles
      for (let i = 0; i < attendanceData.length; i++) {
        const rowNum = i + 2;
        const isPresent = attendanceData[i]['Status'] === 'PRESENT';
        
        headers.forEach(col => {
          const cell = ws[`${col}${rowNum}`];
          if (cell) {
            if (col === 'G') { // Status column
              cell.s = isPresent ? presentStyle : absentStyle;
            } else {
              cell.s = dataStyle;
            }
          }
        });
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

      // Create summary sheet
      const PHILIPPINES_TZ = 'Asia/Manila';
      const summaryData = [
        { 'Metric': 'Event Title', 'Value': eventTitle || 'Event Attendance Report' },
        { 'Metric': 'Export Date', 'Value': new Date().toLocaleString('en-US', { timeZone: PHILIPPINES_TZ }) },
        { 'Metric': 'Total Registered', 'Value': participants.length },
        { 'Metric': 'Present', 'Value': presentParticipants.length },
        { 'Metric': 'Absent', 'Value': absentParticipants.length },
        { 'Metric': 'Attendance Rate', 'Value': `${((presentParticipants.length / participants.length) * 100).toFixed(1)}%` },
      ];

      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 18 }, { wch: 40 }];

      // Style summary header
      ['A1', 'B1'].forEach(cell => {
        if (summaryWs[cell]) {
          summaryWs[cell].s = headerStyle;
        }
      });

      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0];
      const safeTitle = (eventTitle || 'Event').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const filename = `Attendance_${safeTitle}_${dateStr}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      setStatusModal({
        isOpen: true,
        title: 'Export Successful',
        message: `Attendance report exported as ${filename}`,
        type: 'success',
      });
    } catch (err) {
      console.error('Export failed:', err);
      setStatusModal({
        isOpen: true,
        title: 'Export Failed',
        message: 'Failed to export attendance report. Please try again.',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Helper to render a participant item
  const renderParticipantItem = (participant, isPresent) => (
    <div key={participant.id} className={`ep-participant-item ${isPresent ? 'ep-present' : 'ep-absent'}`}>
      <div className="ep-participant-header">
        <h3 className="ep-participant-name">
          {participant.full_name || 'Unknown'}
          {isPresent && participant.checked_in_at && (
            <span className="ep-checkin-time">
              (Checked in: {new Date(participant.checked_in_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Manila'
              })})
            </span>
          )}
        </h3>
        <div className="ep-participant-actions">
          {isPresent ? (
            <button
              className="ep-remove-checkin-btn"
              onClick={() => handleRemoveCheckIn(participant.id)}
              disabled={checkingIn[participant.id]}
            >
              {checkingIn[participant.id] ? 'Processing...' : 'Remove Check-in'}
            </button>
          ) : (
            <button
              className="ep-checkin-btn"
              onClick={() => handleCheckIn(participant.id)}
              disabled={checkingIn[participant.id]}
            >
              {checkingIn[participant.id] ? 'Processing...' : 'Check In'}
            </button>
          )}
          <input
            type="file"
            id={`certificate-upload-${participant.id}`}
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => handleUploadCertificate(participant.id, e.target.files[0])}
            disabled={uploading[participant.id]}
          />
          <button
            className="ep-upload-cert-btn"
            onClick={() => document.getElementById(`certificate-upload-${participant.id}`).click()}
            disabled={uploading[participant.id]}
          >
            {uploading[participant.id] ? 'Uploading...' : certificateData[participant.id] ? 'Replace Cert' : 'Upload Cert'}
          </button>
          <a
            href={participant.email ? `mailto:${participant.email}` : '#'}
            className={`ep-participant-email-link ${!participant.email ? 'disabled' : ''}`}
            title={participant.email ? `Email ${participant.full_name || 'Unknown'}` : 'No email available'}
          >
            Email
          </a>
        </div>
      </div>
      <div className="ep-participant-details">
        <span>{participant.block || 'N/A'} - {participant.year || 'N/A'}</span>
        <span className="ep-participant-email">{participant.email || 'No email'}</span>
      </div>
      <div className="ep-certificate-column">
        {certificateData[participant.id] ? (
          <a
            href={certificateData[participant.id].file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ep-certificate-link"
            title="View certificate"
          >
            {certificateData[participant.id].file_name} ({certificateData[participant.id].event_title})
          </a>
        ) : (
          <span className="ep-no-certificate">No certificate uploaded</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="ep-modal-overlay">
      <div className="ep-modal-container">
        <button
          className="ep-modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
        <div className="ep-modal-header">
          <h2>Event Participants</h2>
          <div className="ep-header-actions">
            {event?.feedback_link && (
              <div className="ep-evaluation-toggle-container">
                <span className="ep-toggle-label">Evaluation Form</span>
                <label className="ep-toggle-switch">
                  <input
                    type="checkbox"
                    checked={evaluationOpen}
                    onChange={handleToggleEvaluation}
                    disabled={isTogglingEvaluation}
                  />
                  <span className="ep-toggle-slider"></span>
                </label>
                <span className={`ep-toggle-status ${evaluationOpen ? 'active' : 'inactive'}`}>
                  {evaluationOpen ? 'ON' : 'OFF'}
                </span>
              </div>
            )}
            <div className="ep-scan-qr-wrapper">
              <button 
                className="ep-scan-qr-btn"
                onClick={() => setShowQRScanner(true)}
                title="Scan QR Code to check in student"
              >
                <i className="fas fa-qrcode"></i> Scan QR
              </button>
              <div className="ep-actions-dropdown">
                <button 
                  className="ep-actions-toggle"
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  title="More actions"
                >
                  <i className="fas fa-ellipsis-v"></i>
                </button>
                {showActionsDropdown && (
                  <>
                    <div className="ep-dropdown-overlay" onClick={() => setShowActionsDropdown(false)} />
                    <div className="ep-dropdown-menu">
                      <button 
                        className="ep-dropdown-item"
                        onClick={() => { handleExportRegistrationList(); setShowActionsDropdown(false); }}
                        disabled={isExporting || isLoading || participants.length === 0}
                      >
                        <i className="fas fa-list"></i> Registration List...
                      </button>
                      <button 
                        className="ep-dropdown-item"
                        onClick={() => { handleExportAttendance(); setShowActionsDropdown(false); }}
                        disabled={isExporting || isLoading || participants.length === 0}
                      >
                        <i className="fas fa-file-excel"></i> Attendance...
                      </button>
                      <button 
                        className="ep-dropdown-item"
                        onClick={() => { document.getElementById('batch-certificate-upload').click(); setShowActionsDropdown(false); }}
                        disabled={isBatchUploading || isLoading || eligibleParticipants.length === 0}
                      >
                        <i className="fas fa-certificate"></i> Batch Certificate...
                      </button>
                    </div>
                  </>
                )}
                <input
                  type="file"
                  id="batch-certificate-upload"
                  accept="image/*,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => handleBatchCertificateUpload(e.target.files[0])}
                  disabled={isBatchUploading}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="ep-search-container">
          <input
            type="text"
            placeholder="Search by name, email, block, or year..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ep-search-input"
            aria-label="Search participants"
          />
        </div>

        <div className="ep-participant-stats">
          <p>Total Registered: {participants.length}</p>
          <p>Present: {presentParticipants.length}</p>
          <p>Absent: {absentParticipants.length}</p>
          <p className="ep-eligible-count">
            <strong>Eligible for Certificate: {eligibleParticipants.length}</strong>
            <span className="ep-eligible-hint">(Present)</span>
          </p>
        </div>

        {isLoading ? (
          <div className="ep-loading">Loading participants...</div>
        ) : (
          <div className="ep-participants-sections">
            {/* Present (Attendees) Section */}
            <div className="ep-section">
              <div className="ep-section-header ep-section-present">
                <h3>✓ Present (Attendees)</h3>
                <span className="ep-section-count">{filteredPresent.length}</span>
              </div>
              <div className="ep-participants-list">
                {filteredPresent.length > 0 ? (
                  filteredPresent.map((participant) => renderParticipantItem(participant, true))
                ) : (
                  <p className="ep-no-results">No present attendees.</p>
                )}
              </div>
            </div>

            {/* Registered but Absent Section */}
            <div className="ep-section">
              <div className="ep-section-header ep-section-absent">
                <h3>○ Registered but Absent</h3>
                <span className="ep-section-count">{filteredAbsent.length}</span>
              </div>
              <div className="ep-participants-list">
                {filteredAbsent.length > 0 ? (
                  filteredAbsent.map((participant) => renderParticipantItem(participant, false))
                ) : (
                  <p className="ep-no-results">No absent registrants.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="ep-modal-actions">
          <button
            className="ep-copy-emails-btn"
            onClick={handleCopyEmails}
            disabled={isLoading || !participants.length || !bccEmails}
          >
            Copy All Emails
          </button>
          <a
            href={bccEmails ? mailtoLink : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={bccEmails ? '' : 'disabled'}
          >
            <button
              className="ep-send-email-btn"
              disabled={isLoading || !participants.length || !bccEmails}
            >
              Send Group Email
            </button>
          </a>
        </div>
      </div>

      <StatusModal
        isOpen={statusModal.isOpen}
        onClose={closeStatusModal}
        title={statusModal.title}
        message={statusModal.message}
        type={statusModal.type}
      />

      <QRScanner
        show={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        eventId={eventId}
        onCheckInSuccess={onRefresh}
      />
    </div>
  );
};

class EventParticipantsModalWithBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ep-modal-overlay">
          <div className="ep-modal-container">
            <h2>Error</h2>
            <p>Something went wrong displaying the participants. Please try again.</p>
            <button
              className="ep-send-email-btn"
              onClick={this.props.onClose}
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    return <EventParticipantsModal {...this.props} />;
  }
}

export default EventParticipantsModalWithBoundary;