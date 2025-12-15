import React, { useState, useMemo } from 'react';
import '../styles/EventCalendar.css';

const EventCalendar = ({ events = [], onEventClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Get start of week (Sunday)
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Get days for month view
  const getMonthDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = getStartOfWeek(firstDay);
    
    const days = [];
    const current = new Date(startDate);
    
    // Generate 6 weeks (42 days) to cover all possible month layouts
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Get days for week view
  const getWeekDays = (date) => {
    const startDate = getStartOfWeek(date);
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 7; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Parse event dates and determine if multi-day
  const processedEvents = useMemo(() => {
    return events.map(event => {
      const startDate = new Date(event.date);
      startDate.setHours(0, 0, 0, 0);
      
      // Check if event has registration_end as end date, otherwise single day
      let endDate;
      if (event.registration_end) {
        endDate = new Date(event.registration_end);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
      }
      
      return {
        ...event,
        startDate,
        endDate,
        isMultiDay: endDate.toDateString() !== startDate.toDateString()
      };
    });
  }, [events]);

  // Get events for a specific day
  const getEventsForDay = (day) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    return processedEvents.filter(event => {
      return event.startDate <= dayEnd && event.endDate >= dayStart;
    });
  };

  // Check if event starts on this day
  const eventStartsOnDay = (event, day) => {
    return event.startDate.toDateString() === day.toDateString();
  };

  // Check if event ends on this day
  const eventEndsOnDay = (event, day) => {
    return event.endDate.toDateString() === day.toDateString();
  };

  // Calculate span for multi-day events in week/month view
  const getEventSpan = (event, day, days) => {
    const dayIndex = days.findIndex(d => d.toDateString() === day.toDateString());
    let span = 1;
    
    for (let i = dayIndex + 1; i < days.length; i++) {
      const nextDay = days[i];
      if (nextDay <= event.endDate) {
        // Check if we're crossing to next week row in month view
        if (viewMode === 'month' && i % 7 === 0) break;
        span++;
      } else {
        break;
      }
    }
    
    return span;
  };

  // Navigation handlers
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get display title
  const getTitle = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      const weekStart = getStartOfWeek(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${weekStart.toLocaleDateString('en-US', { month: 'long' })} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      } else {
        return `${weekStart.toLocaleDateString('en-US', { month: 'short' })} ${weekStart.getDate()} - ${weekEnd.toLocaleDateString('en-US', { month: 'short' })} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
      }
    }
  };

  const days = viewMode === 'month' ? getMonthDays(currentDate) : getWeekDays(currentDate);
  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get event color based on status
  const getEventColor = (event) => {
    if (event.is_participant) return 'event-registered';
    if (event.registration_status === 'open') return 'event-open';
    if (event.registration_status === 'closed') return 'event-closed';
    return 'event-default';
  };

  // Get status border color
  const getStatusBorderColor = (event) => {
    if (event.is_participant) return '#2d5641';
    if (event.registration_status === 'open') return '#0891b2';
    if (event.registration_status === 'closed') return '#6b7280';
    return '#8b5cf6';
  };

  // Track rendered multi-day events to avoid duplicates
  const renderedMultiDayEvents = new Set();

  // Handle event hover
  const handleEventHover = (event, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setHoveredEvent(event);
  };

  const handleEventLeave = () => {
    setHoveredEvent(null);
  };

  // Format time for display
  const formatEventTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Format date for tooltip
  const formatEventDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };

  return (
    <div className="event-calendar">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="nav-btn" onClick={goToPrevious} title={viewMode === 'month' ? 'Previous Month' : 'Previous Week'}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <button className="nav-btn today-btn" onClick={goToToday}>Today</button>
          <button className="nav-btn" onClick={goToNext} title={viewMode === 'month' ? 'Next Month' : 'Next Week'}>
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
        
        <h2 className="calendar-title">{getTitle()}</h2>
        
        <div className="view-toggle">
          <button 
            className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            <i className="fas fa-calendar-alt"></i> Month
          </button>
          <button 
            className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            <i className="fas fa-calendar-week"></i> Week
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {/* Weekday headers */}
        <div className="calendar-weekdays">
          {weekDayNames.map(day => (
            <div key={day} className="weekday-header">{day}</div>
          ))}
        </div>

        {/* Calendar days */}
        <div className={`calendar-days ${viewMode}`}>
          {days.map((day, index) => {
            const isToday = day.toDateString() === today.toDateString();
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const dayEvents = getEventsForDay(day);
            
            return (
              <div 
                key={index} 
                className={`calendar-day ${isToday ? 'today' : ''} ${!isCurrentMonth && viewMode === 'month' ? 'other-month' : ''}`}
              >
                <div className="day-number">{day.getDate()}</div>
                <div className="day-events">
                  {dayEvents.map((event) => {
                    const startsToday = eventStartsOnDay(event, day);
                    const endsToday = eventEndsOnDay(event, day);
                    const isMultiDay = event.isMultiDay;
                    
                    // For multi-day events, only render on start day or first day of week row
                    if (isMultiDay && !startsToday) {
                      // Check if this is start of a new week row in month view
                      if (viewMode === 'month' && index % 7 !== 0) {
                        return null;
                      }
                      // In week view, only show on start day
                      if (viewMode === 'week') {
                        // Show if event started before this week
                        const weekStart = days[0];
                        if (event.startDate >= weekStart) {
                          return null;
                        }
                      }
                    }

                    const span = isMultiDay ? getEventSpan(event, day, days) : 1;
                    const eventKey = `${event.id}-${day.toDateString()}`;
                    
                    // Skip if already rendered
                    if (renderedMultiDayEvents.has(eventKey)) {
                      return null;
                    }
                    if (isMultiDay) {
                      renderedMultiDayEvents.add(eventKey);
                    }

                    return (
                      <div
                        key={eventKey}
                        className={`event-block ${getEventColor(event)} ${isMultiDay ? 'multi-day' : ''} ${startsToday ? 'starts-here' : ''} ${endsToday ? 'ends-here' : ''}`}
                        style={{
                          ...(span > 1 ? { 
                            width: `calc(${span * 100}% + ${(span - 1) * 2}px)`,
                            zIndex: 10
                          } : {}),
                          ...(event.image_url ? {
                            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(${event.image_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          } : {}),
                          borderColor: getStatusBorderColor(event),
                          borderWidth: '3px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick && onEventClick(event);
                        }}
                        onMouseEnter={(e) => handleEventHover(event, e)}
                        onMouseLeave={handleEventLeave}
                      >
                        <div className="event-block-content">
                          <span className="event-title">{event.title}</span>
                          <span className="event-time-badge">
                            <i className="fas fa-clock"></i>
                            {formatEventTime(event.date)}
                          </span>
                        </div>
                        {event.is_participant && (
                          <span className="registered-badge">
                            <i className="fas fa-check"></i>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color event-registered"></span>
          <span>Registered</span>
        </div>
        <div className="legend-item">
          <span className="legend-color event-open"></span>
          <span>Open for Registration</span>
        </div>
        <div className="legend-item">
          <span className="legend-color event-closed"></span>
          <span>Registration Closed</span>
        </div>
      </div>

      {/* Event Tooltip */}
      {hoveredEvent && (
        <div 
          className="event-tooltip"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y
          }}
        >
          <div className="tooltip-header">
            {hoveredEvent.image_url && (
              <img src={hoveredEvent.image_url} alt="" className="tooltip-image" />
            )}
            <div className="tooltip-title-section">
              <h4 className="tooltip-title">{hoveredEvent.title}</h4>
              {hoveredEvent.is_participant && (
                <span className="tooltip-registered-tag">
                  <i className="fas fa-check-circle"></i> Registered
                </span>
              )}
            </div>
          </div>
          <div className="tooltip-details">
            <div className="tooltip-row">
              <i className="fas fa-calendar"></i>
              <span>{formatEventDate(hoveredEvent.date)}</span>
            </div>
            <div className="tooltip-row">
              <i className="fas fa-clock"></i>
              <span>{formatEventTime(hoveredEvent.date)}</span>
            </div>
            {hoveredEvent.location && (
              <div className="tooltip-row">
                <i className="fas fa-map-marker-alt"></i>
                <span>{hoveredEvent.location}</span>
              </div>
            )}
          </div>
          <div className="tooltip-footer">
            <span className="click-hint">
              <i className="fas fa-hand-pointer"></i> Click to view details & register
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCalendar;
