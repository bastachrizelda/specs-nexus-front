import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile } from '../services/userService';
import { getEvents, joinEvent, leaveEvent } from '../services/eventService';
import EventCard from '../components/EventCard';
import EventCalendar from '../components/EventCalendar';
import EventModal from '../components/EventModal';
import StatusModal from '../components/StatusModal';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import '../styles/EventsPage.css';

const backendBaseUrl = 'https://specs-nexus.onrender.com';
const EventsPage = () => {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });
  const token = localStorage.getItem('access_token');
  const navigate = useNavigate();

  // Early token check
  useEffect(() => {
    if (!token) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_id');
      navigate('/');
      return;
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return; // Skip if no token

    async function fetchProfile() {
      try {
        const userData = await getProfile(token);
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_id');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return; // Skip if no token

    async function fetchEvents() {
      setIsEventsLoading(true);
      try {
        const eventsData = await getEvents(token);
        setEvents(eventsData);
        setSelectedEvent((prevSelected) => {
          if (!prevSelected) return prevSelected;
          const updatedEvent = eventsData.find(e => e.id === prevSelected.id);
          return updatedEvent || prevSelected;
        });
      } catch (error) {
        // Events fetch failed silently
      } finally {
        setIsEventsLoading(false);
      }
    }
    fetchEvents();
  }, [token]);

  const handleCardClick = async (event) => {
    try {
      const res = await fetch(`${backendBaseUrl}/events/${event.id}/participants`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const participants = await res.json();
      setSelectedEvent({ ...event, participants });
    } catch (error) {
      setSelectedEvent(event);
    }
  };

  const closeModal = () => {
    setSelectedEvent(null);
  };

  const closeStatusModal = () => {
    setStatusModal({ isOpen: false, title: '', message: '', type: 'success' });
  };

  const handleParticipate = async (eventId) => {
    try {
      await joinEvent(eventId, token);
      const updatedEvents = await getEvents(token);
      setEvents(updatedEvents);
      
      // Update selected event with new registration status
      const updatedEvent = updatedEvents.find(e => e.id === eventId);
      if (updatedEvent) {
        setSelectedEvent(prev => ({ ...prev, ...updatedEvent }));
      }
      
      setStatusModal({
        isOpen: true,
        title: 'Registration Successful',
        message: 'You have successfully registered for the event!',
        type: 'success'
      });
    } catch (error) {
      setStatusModal({
        isOpen: true,
        title: 'Registration Failed',
        message: 'There was an error registering for the event. Please try again.',
        type: 'error'
      });
    }
  };

  const handleNotParticipate = async (eventId) => {
    try {
      await leaveEvent(eventId, token);
      const updatedEvents = await getEvents(token);
      setEvents(updatedEvents);
      
      // Update selected event with new registration status
      const updatedEvent = updatedEvents.find(e => e.id === eventId);
      if (updatedEvent) {
        setSelectedEvent(prev => ({ ...prev, ...updatedEvent }));
      }
      
      setStatusModal({
        isOpen: true,
        title: 'Cancellation Successful',
        message: 'You have successfully cancelled your registration for the event!',
        type: 'success'
      });
    } catch (error) {
      setStatusModal({
        isOpen: true,
        title: 'Cancellation Failed',
        message: 'There was an error cancelling your registration. Please try again.',
        type: 'error'
      });
    }
  };

  const filterEvents = () => {
    if (filter === 'all') {
      return events;
    } else if (filter === 'upcoming') {
      const now = new Date();
      return events.filter((event) => new Date(event.date) > now);
    } else if (filter === 'registered') {
      return events.filter((event) => event.is_participant === true);
    }
    return events;
  };

  const filteredEvents = filterEvents();

  if (isLoading) {
    return <Loading message="Loading Events..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <Layout user={user}>
      <div className="events-page">
        <div className="events-header">
          <div className="events-filters">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Events
            </button>
            <button
              className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setFilter('upcoming')}
            >
              Upcoming
            </button>
            <button
              className={`filter-btn ${filter === 'registered' ? 'active' : ''}`}
              onClick={() => setFilter('registered')}
            >
              My Events
            </button>
          </div>
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <i className="fas fa-th-list"></i>
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
              title="Calendar View"
            >
              <i className="fas fa-calendar-alt"></i>
            </button>
          </div>
        </div>

        <div className="events-section">
          {isEventsLoading ? (
            <Loading message="Loading Events.." />
          ) : viewMode === 'calendar' ? (
            <EventCalendar 
              events={filteredEvents} 
              onEventClick={handleCardClick}
            />
          ) : filteredEvents.length > 0 ? (
            <div className="events-grid">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} onClick={handleCardClick} />
              ))}
            </div>
          ) : (
            <p className="no-events-message">No upcoming events found.</p>
          )}
        </div>

        {selectedEvent && (
          <EventModal
            event={selectedEvent}
            onClose={closeModal}
            onParticipate={handleParticipate}
            onNotParticipate={handleNotParticipate}
            show={!!selectedEvent}
          />
        )}

        <StatusModal
          isOpen={statusModal.isOpen}
          onClose={closeStatusModal}
          title={statusModal.title}
          message={statusModal.message}
          type={statusModal.type}
        />
      </div>
    </Layout>
  );
};

export default EventsPage;