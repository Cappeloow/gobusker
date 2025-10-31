import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapView } from '../map/MapView';
import { eventService } from '../../services/eventService';
import type { Event } from '../../types/models';

interface MapFilters {
  timeRange: 'today' | 'week' | 'month' | 'custom';
  customDate?: string; // ISO date string for custom date selection
  location: string;
  genre?: string;
  eventType?: 'all' | 'street' | 'venue';
}

export function LandingPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<MapFilters>({
    timeRange: 'week',
    location: '',
    eventType: 'all'
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const eventsData = await eventService.getAllEvents();
        setEvents(eventsData);
        setFilteredEvents(eventsData);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  // Filter events based on time range
  useEffect(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const filtered = events.filter(event => {
      const eventDate = new Date(event.start_time);
      
      switch (filters.timeRange) {
        case 'today': {
          return eventDate >= startOfDay && eventDate < new Date(startOfDay.getTime() + 24*60*60*1000);
        }
        case 'week': {
          const endOfWeek = new Date(startOfDay.getTime() + 7*24*60*60*1000);
          return eventDate >= startOfDay && eventDate < endOfWeek;
        }
        case 'month': {
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          return eventDate >= startOfDay && eventDate <= endOfMonth;
        }
        case 'custom': {
          if (!filters.customDate) return true;
          const customDate = new Date(filters.customDate);
          const nextDay = new Date(customDate.getTime() + 24*60*60*1000);
          return eventDate >= customDate && eventDate < nextDay;
        }
        default: {
          return true;
        }
      }
    });
    
    setFilteredEvents(filtered);
  }, [filters.timeRange, filters.customDate, events]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <div style={{
        backgroundColor: '#1a1a1a',
        color: 'white',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem',
          marginBottom: '10px',
          background: 'linear-gradient(45deg, #ff4b1f, #ff9068)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Discover Street Music Near You
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#e0e0e0' }}>
          Find local artists, performances, and events in your area
        </p>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', height: 'calc(100vh - 150px)' }}>
        {/* Map Section */}
        <div style={{ flex: '1', backgroundColor: '#f5f5f5', position: 'relative' }}>
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            right: '20px',
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            gap: '10px'
          }}>
            <input
              type="text"
              placeholder="Search location..."
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Search
            </button>
          </div>
          {loading ? (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              zIndex: 1000
            }}>
              Loading events...
            </div>
          ) : (
            <MapView
              markers={filteredEvents
                .filter(event => event.location) // Only show events with location
                .map(event => ({
                  id: event.id,
                  latitude: event.location.latitude,
                  longitude: event.location.longitude,
                  title: event.title,
                  date: new Date(event.start_time).toLocaleString(),
                  location: event.location.place_name
                }))}
            />
          )}
        </div>

        {/* Filters & Results Panel */}
        <div style={{
          width: '400px',
          backgroundColor: 'white',
          boxShadow: '-2px 0 4px rgba(0,0,0,0.1)',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#333' }}>Find Performances</h2>

          {/* Time Range Filter */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>When</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {(['today', 'week', 'month', 'custom'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setFilters({ 
                    ...filters, 
                    timeRange: range,
                    // Clear custom date when switching to non-custom range
                    customDate: range !== 'custom' ? undefined : filters.customDate
                  })}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: filters.timeRange === range ? '#4CAF50' : '#f0f0f0',
                    color: filters.timeRange === range ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
            {filters.timeRange === 'custom' && (
              <input
                type="date"
                value={filters.customDate || ''}
                onChange={(e) => setFilters({ ...filters, customDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginTop: '8px'
                }}
              />
            )}
          </div>

          {/* Event Type Filter */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>Type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['all', 'street', 'venue'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilters({ ...filters, eventType: type })}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: filters.eventType === type ? '#4CAF50' : 'white',
                    color: filters.eventType === type ? 'white' : '#333',
                    cursor: 'pointer'
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Genre Filter */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>Genre</label>
            <select
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white'
              }}
              value={filters.genre}
              onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
            >
              <option value="">All Genres</option>
              <option value="rock">Rock</option>
              <option value="jazz">Jazz</option>
              <option value="classical">Classical</option>
              <option value="folk">Folk</option>
              <option value="hiphop">Hip Hop</option>
              <option value="electronic">Electronic</option>
            </select>
          </div>

          {/* Results Section */}
          <div>
            <h3 style={{ marginBottom: '15px', color: '#333' }}>Upcoming Events</h3>
            <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
              Enter a location to see events near you!
            </div>

            {/* Join CTA for non-authenticated users */}
            <div style={{
              marginTop: '30px',
              padding: '20px',
              backgroundColor: '#f8f8f8',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#333', marginBottom: '10px' }}>Are you a performer?</h3>
              <p style={{ color: '#666', marginBottom: '15px' }}>
                Join Gobusker to share your events and connect with your audience!
              </p>
              <button
                onClick={() => navigate('/signup')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}