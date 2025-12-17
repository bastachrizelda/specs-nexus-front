const backendBaseUrl = 'https://specs-nexus.onrender.com';

const API_URL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : backendBaseUrl);

export const getCertificateTemplate = async (eventId, token) => {
  if (!token) {
    throw new Error('Missing authentication token');
  }

  try {
    const response = await fetch(`${API_URL}/certificates/events/${eventId}/template`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch template');
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return null;
    }
    throw error;
  }
};

export const uploadCertificateTemplate = async (eventId, formData, token) => {
  if (!token) {
    throw new Error('Missing authentication token');
  }

  try {
    const response = await fetch(`${API_URL}/certificates/events/${eventId}/template`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to upload template');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const getEligibleCount = async (eventId, token) => {
  if (!token) {
    throw new Error('Missing authentication token');
  }

  try {
    const response = await fetch(`${API_URL}/certificates/events/${eventId}/eligible-count`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to get eligible count');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const generateBulkCertificates = async (eventId, token) => {
  if (!token) {
    throw new Error('Missing authentication token');
  }

  try {
    const response = await fetch(`${API_URL}/certificates/events/${eventId}/generate-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to generate certificates');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const downloadCertificatesZip = async (eventId, token) => {
  if (!token) {
    throw new Error('Missing authentication token');
  }

  try {
    const response = await fetch(`${API_URL}/certificates/events/${eventId}/download-all`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to download certificates');
    }

    const blob = await response.blob();
    return blob;
  } catch (error) {
    throw error;
  }
};

export const verifyCertificate = async (certificateCode) => {
  try {
    const response = await fetch(`${API_URL}/certificates/verify/${certificateCode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Certificate not found');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};
