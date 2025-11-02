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
    <div className="h-screen flex flex-col">
      {/* Hero Section */}
      <div className="bg-gray-800 text-white p-5 text-center">
        <h1 className="text-4xl mb-2.5 bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
          Discover Street Music Near You
        </h1>
        <p className="text-lg text-gray-300">
          Find local artists, performances, and events in your area
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex h-[calc(100vh-150px)]">
        {/* Map Section */}
        <div className="flex-1 bg-gray-100 relative">
          <div className="absolute top-5 left-5 right-5 bg-white p-4 rounded-lg shadow-md flex gap-2.5">
            <input
              type="text"
              placeholder="Search location..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-base"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
            <button className="px-4 py-2 bg-green-500 text-white border-none rounded-md cursor-pointer">
              Search
            </button>
          </div>
          {loading ? (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-5 rounded-lg shadow-md z-10">
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
        <div className="w-[400px] bg-white shadow-lg p-5 overflow-y-auto">
          <h2 className="mb-5 text-gray-700">Find Performances</h2>

          {/* Time Range Filter */}
          <div className="mb-5">
            <label className="block mb-2 text-gray-500">When</label>
            <div className="flex gap-2 mb-2">
              {(['today', 'week', 'month', 'custom'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setFilters({ 
                    ...filters, 
                    timeRange: range,
                    // Clear custom date when switching to non-custom range
                    customDate: range !== 'custom' ? undefined : filters.customDate
                  })}
                  className={`flex-1 py-2 ${filters.timeRange === range ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'} border-none rounded-md cursor-pointer transition-all`}
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
                className="w-full p-2 border border-gray-300 rounded-md mt-2"
              />
            )}
          </div>

          {/* Event Type Filter */}
          <div className="mb-5">
            <label className="block mb-2 text-gray-500">Type</label>
            <div className="flex gap-2">
              {(['all', 'street', 'venue'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilters({ ...filters, eventType: type })}
                  className={`flex-1 py-2 border border-gray-300 rounded-md ${filters.eventType === type ? 'bg-green-500 text-white' : 'bg-white text-gray-700'} cursor-pointer`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Genre Filter */}
          <div className="mb-5">
            <label className="block mb-2 text-gray-500">Genre</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md bg-white"
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
            <h3 className="mb-4 text-gray-700">Upcoming Events</h3>
            <div className="text-gray-500 text-center p-5">
              Enter a location to see events near you!
            </div>

            {/* Join CTA for non-authenticated users */}
            <div className="mt-8 p-5 bg-gray-100 rounded-lg text-center">
              <h3 className="text-gray-700 mb-2.5">Are you a performer?</h3>
              <p className="text-gray-500 mb-4">
                Join Gobusker to share your events and connect with your audience!
              </p>
              <button
                onClick={() => navigate('/signup')}
                className="px-5 py-2.5 bg-green-500 text-white border-none rounded-md cursor-pointer text-base"
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