import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OfficerLayout from '../components/OfficerLayout';
import StatusModal from '../components/StatusModal';
import Loading from '../components/Loading';
import { getUsers } from '../services/officerService';
import { confirmCashPayment, checkUserClearanceStatus } from '../services/officerMembershipService';
import '../styles/OfficerCashPaymentVerificationPage.css';

const OfficerCashPaymentVerificationPage = () => {
  const token = localStorage.getItem('officerAccessToken');
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [requirement, setRequirement] = useState('1st Semester Membership');
  const [amount, setAmount] = useState('50');
  const [receiptNumber, setReceiptNumber] = useState('');

  const generateReceiptNumber = useCallback((semester) => {
    const semCode = semester === '1st Semester Membership' ? 'S1' : 'S2';
    const year = new Date().getFullYear();
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let uniquePart = '';
    for (let i = 0; i < 4; i++) {
      uniquePart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SPECS-${semCode}${year}-${uniquePart}`;
  }, []);

  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setReceiptNumber((prev) => prev || generateReceiptNumber(requirement));
  }, [generateReceiptNumber, requirement]);

  useEffect(() => {
    if (!token) {
      navigate('/officer-login');
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const usersData = await getUsers();
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        if (error?.response?.status === 401) {
          localStorage.removeItem('officerAccessToken');
          localStorage.removeItem('officerInfo');
          navigate('/officer-login');
          return;
        }
        setStatusModal({
          isOpen: true,
          title: 'Error Loading Students',
          message: error?.response?.data?.detail || 'Failed to load students. Please try again.',
          type: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [token, navigate]);

  const filteredUsers = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return [];
    return users.filter((u) => {
      const name = (u.full_name || '').toLowerCase();
      const sn = (u.student_number || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || sn.includes(q) || email.includes(q);
    }).slice(0, 10);
  }, [users, search]);

  const handleSelectUser = async (user) => {
    try {
      const status = await checkUserClearanceStatus(user.id, requirement, token);
      
      if (status.exists && status.payment_status === 'Paid') {
        setStatusModal({
          isOpen: true,
          title: 'Already Paid',
          message: `${user.full_name} has already paid for ${requirement}. Receipt: ${status.receipt_number || 'N/A'}`,
          type: 'warning',
        });
        setSearch('');
        setShowDropdown(false);
        return;
      }
      
      setSelectedUser(user);
      setSearch(`${user.full_name} (${user.student_number})`);
      setShowDropdown(false);
    } catch (error) {
      console.error('Error checking user status:', error);
      setSelectedUser(user);
      setSearch(`${user.full_name} (${user.student_number})`);
      setShowDropdown(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    setSelectedUser(null);
    setShowDropdown(value.trim().length > 0);
  };

  const handleSearchFocus = () => {
    if (search.trim().length > 0 && !selectedUser) {
      setShowDropdown(true);
    }
  };

  const handleSearchBlur = () => {
    setTimeout(() => setShowDropdown(false), 200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const uid = selectedUser?.id;
    const amt = parseFloat(amount);
    const receipt = (receiptNumber || '').trim();

    if (!uid) {
      setStatusModal({
        isOpen: true,
        title: 'Missing Student',
        message: 'Please search and select a student.',
        type: 'error',
      });
      return;
    }

    if (!receipt) {
      setStatusModal({
        isOpen: true,
        title: 'Missing Receipt/Reference No.',
        message: 'Receipt/reference number is required.',
        type: 'error',
      });
      return;
    }

    if (Number.isNaN(amt) || amt <= 0) {
      setStatusModal({
        isOpen: true,
        title: 'Invalid Amount',
        message: 'Amount must be greater than 0.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmCashPayment(
        {
          user_id: uid,
          requirement,
          amount: amt,
          receipt_number: receipt,
        },
        token
      );

      setReceiptNumber(generateReceiptNumber(requirement));

      setStatusModal({
        isOpen: true,
        title: 'Cash Payment Confirmed',
        message: 'Payment marked as Paid and membership clearance set to Clear.',
        type: 'success',
      });
    } catch (error) {
      const detail = error?.response?.data?.detail || 'Failed to confirm cash payment. Please try again.';
      setStatusModal({
        isOpen: true,
        title: 'Cash Confirmation Failed',
        message: detail,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loading message="Loading Students..." />;
  }

  return (
    <OfficerLayout>
      <div className="cash-verify-page">
        <header className="cash-verify-header">
          <h1>
            <i className="fas fa-money-bill-wave"></i>
            Cash Payment
          </h1>
          <p>Record cash payments. Students cannot self-confirm.</p>
        </header>

        <form className="cash-verify-form" onSubmit={handleSubmit}>
          <div className="cash-verify-grid">
            <div className="form-group form-group-wide">
              <label>Search Student</label>
              <div className="autocomplete-container">
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  placeholder="Search by name, student no., or email"
                />

                {showDropdown && filteredUsers.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="autocomplete-item"
                        onMouseDown={() => handleSelectUser(u)}
                      >
                        <span className="autocomplete-name">{u.full_name}</span>
                        <span className="autocomplete-meta">
                          {u.student_number}
                          {u.email ? ` • ${u.email}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedUser && (
                <div className="selected-user-pill">
                  <i className="fas fa-check"></i>
                  Selected: {selectedUser.full_name} ({selectedUser.student_number})
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Semester</label>
              <select
                value={requirement}
                onChange={(e) => {
                  setRequirement(e.target.value);
                  setReceiptNumber(generateReceiptNumber(e.target.value));
                }}
              >
                <option value="1st Semester Membership">1st Semester Membership</option>
                <option value="2nd Semester Membership">2nd Semester Membership</option>
              </select>
            </div>

            <div className="form-group">
              <label>Amount (₱)</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50"
                readOnly
              />
            </div>

            <div className="form-group form-group-wide">
              <label>Receipt No. (auto-generated)</label>
              <div className="receipt-input-group">
                <input
                  type="text"
                  value={receiptNumber}
                  readOnly
                  placeholder="Click Generate to create receipt number"
                />
                <button
                  type="button"
                  className="generate-receipt-btn"
                  onClick={() => setReceiptNumber(generateReceiptNumber(requirement))}
                >
                  <i className="fas fa-sync-alt"></i>
                  Generate
                </button>
              </div>
            </div>
          </div>

          <div className="cash-verify-actions">
            <button className="cash-verify-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Confirming...' : 'Confirm Cash Payment'}
            </button>
          </div>
        </form>

        <StatusModal
          isOpen={statusModal.isOpen}
          onClose={() => setStatusModal((prev) => ({ ...prev, isOpen: false }))}
          title={statusModal.title}
          message={statusModal.message}
          type={statusModal.type}
        />
      </div>
    </OfficerLayout>
  );
};

export default OfficerCashPaymentVerificationPage;
