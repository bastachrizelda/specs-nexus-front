import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaUserCircle, 
  FaTachometerAlt, 
  FaCalendarAlt, 
  FaBullhorn, 
  FaUsers, 
  FaMoneyBillWave,
  FaUsersCog,
  FaSignOutAlt
} from 'react-icons/fa';

import '../styles/OfficerSidebar.css';

const OfficerSidebar = ({ officer, isSidebarOpen, isMobile, onOpenLogoutModal }) => {
  const location = useLocation();

  const navItems = [
    { path: '/officer-dashboard', icon: FaTachometerAlt, label: 'Dashboard' },
    { path: '/officer-manage-events', icon: FaCalendarAlt, label: 'Manage Events' },
    { path: '/officer-manage-announcements', icon: FaBullhorn, label: 'Manage Announcements' },
    { path: '/officer-manage-membership', icon: FaUsers, label: 'Manage Membership' },
    { path: '/officer-cash-verification', icon: FaMoneyBillWave, label: 'Cash Payment' },
  ];

  const isAdmin = officer?.position?.toLowerCase() === 'admin';

  return (
    <div className={`sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
      {/* Profile Section */}
      <div className="profile-section">
        <div className="profile-avatar">
          <FaUserCircle />
          <span className="status-indicator"></span>
        </div>
        {isSidebarOpen && (
          <div className="profile-info">
            <h3 className="profile-name">{officer?.full_name || 'Officer'}</h3>
            <span className="profile-role">{officer?.position || 'Officer'}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          {isSidebarOpen && <span className="nav-section-title">Main Menu</span>}
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path} className="nav-item">
                  <Link 
                    to={item.path} 
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    data-tooltip={!isSidebarOpen ? item.label : undefined}
                  >
                    <span className="nav-icon">
                      <Icon />
                    </span>
                    {isSidebarOpen && <span className="nav-text">{item.label}</span>}
                    {isActive && <span className="active-indicator"></span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {isAdmin && (
          <div className="nav-section">
            {isSidebarOpen && <span className="nav-section-title">Administration</span>}
            <ul className="nav-list">
              <li className="nav-item">
                <Link 
                  to="/admin-manage-officers" 
                  className={`nav-link ${location.pathname === '/admin-manage-officers' ? 'active' : ''}`}
                  data-tooltip={!isSidebarOpen ? 'Manage Officers' : undefined}
                >
                  <span className="nav-icon">
                    <FaUsersCog />
                  </span>
                  {isSidebarOpen && <span className="nav-text">Manage Officers</span>}
                  {location.pathname === '/admin-manage-officers' && <span className="active-indicator"></span>}
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* Logout Button */}
      <div className="sidebar-footer">
        <button 
          className="logout-btn" 
          onClick={onOpenLogoutModal}
          data-tooltip={!isSidebarOpen ? 'Logout' : undefined}
        >
          <span className="nav-icon"><FaSignOutAlt /></span>
          {isSidebarOpen && <span className="nav-text">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default OfficerSidebar;