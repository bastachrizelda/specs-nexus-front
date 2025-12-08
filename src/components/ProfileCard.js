import React from 'react';
import '../styles/ProfilePage.css';

const ProfileCard = ({ user }) => {
  return (
    <div className="profile-card">
      <h2>User Profile</h2>
      <div className="profile-field">
        <span className="label">Student Number:</span>
        <span className="value">{user.student_number}</span>
      </div>
      <div className="profile-field">
        <span className="label">Full Name:</span>
        <span className="value">{user.full_name}</span>
      </div>
      <div className="profile-field">
        <span className="label">Year and Block:</span>
        <span className="value">{user.year} {user.block}</span>
      </div>
      <div className="profile-field">
        <span className="label">Email Address:</span>
        <span className="value">{user.email}</span>
      </div>
    </div>
  );
};

export default ProfileCard;