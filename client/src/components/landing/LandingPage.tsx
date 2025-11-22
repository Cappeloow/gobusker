import { useState, useEffect } from 'react';
import { MapView } from '../map/MapView';
import { eventService } from '../../services/eventService';
import type { Event } from '../../types/models';

interface MapFilters {
  timeRange: 'today' | 'week' | 'month' | 'custom';
  customDate?: string; // ISO date string for custom date selection
  location: string;
  category: string;
  subcategory: string;
  maxDistance: number; // Maximum distance in kilometers
}

const CATEGORIES: { [key: string]: string[] } = {
  Music: ['Rock', 'Pop', 'Techno', 'Jazz', 'Classical', 'Folk', 'Hip Hop', 'Electronic'],
  Comedy: ['Stand-up', 'Improv'],
  Magic: ['Close-up', 'Stage'],
  Other: []
};

export function LandingPage() {
  const [filters, setFilters] = useState<MapFilters>({
    timeRange: 'week',
    location: '',
    category: '',
    subcategory: '',
    maxDistance: 50 // Default 50 km
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [clickedMarker, setClickedMarker] = useState<string | null>(null);

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

    // Request user location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => {
          console.log('Location access denied or unavailable');
        }
      );
    }

    fetchEvents();
  }, []);

  // Filter events based on time range
  useEffect(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let filtered = events.filter(event => {
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
    
    if (filters.category) {
      filtered = filtered.filter(event => event.category === filters.category);
    }

    if (filters.subcategory) {
      filtered = filtered.filter(event => event.subcategory === filters.subcategory);
    }

    // Filter by distance if user location is available
    if (userLocation) {
      filtered = filtered.filter(event => {
        if (!event.location) return false;
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          event.location.latitude,
          event.location.longitude
        );
        return distance <= filters.maxDistance;
      });
    }

    setFilteredEvents(filtered);
    }, [filters, events, userLocation]);

  // Clear selection if the selected marker is no longer in filtered events
  useEffect(() => {
    if (selectedMarker && !filteredEvents.some(event => event.id === selectedMarker)) {
      setSelectedMarker(null);
      setClickedMarker(null);
    }
  }, [filteredEvents, selectedMarker]);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-github-bg to-github-card">

      {/* Main Content */}
      <div className="flex-1 flex h-[calc(100vh-150px)]">
        {/* Map Section */}
        <div className="flex-1 bg-github-bg relative">
          <div className="absolute top-5 left-5 right-5 bg-github-card border border-github-border p-4 rounded-lg shadow-xl flex gap-2.5">
            <input
              type="text"
              placeholder="Search location..."
              className="flex-1 px-3 py-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-text-muted focus:outline-none focus:border-github-blue"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
            <button className="px-4 py-2 bg-github-blue hover:bg-github-blue-dark text-github-text font-semibold rounded-lg transition-all duration-200">
              Search
            </button>
          </div>
          {loading ? (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-github-card border border-github-border p-5 rounded-lg shadow-xl z-10 text-github-text">
              Loading events...
            </div>
          ) : (
            <MapView
              center={userLocation ? [userLocation.longitude, userLocation.latitude] : [18.0649, 59.3293]}
              zoom={userLocation ? 13 : 11}
              markers={[
                // User location marker
                ...(userLocation ? [{
                  id: 'user-location',
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                  title: 'Your Location',
                  date: '',
                  location: 'You are here'
                }] : []),
                // Event markers
                ...filteredEvents
                  .filter(event => event.location)
                  .map(event => ({
                    id: event.id,
                    latitude: event.location.latitude,
                    longitude: event.location.longitude,
                    title: event.title,
                    date: event.start_time,
                    location: event.location.place_name
                  }))
              ]}
              selectedMarkerId={selectedMarker}
              userLocation={userLocation}
              onMarkerClick={(markerId) => {
                setClickedMarker(markerId);
                setSelectedMarker(markerId);
              }}
              onMapClick={() => {
                setClickedMarker(null);
                setSelectedMarker(null);
              }}
            />
          )}
        </div>

        {/* Filters & Results Panel */}
        <div className="w-[400px] bg-github-card border-l border-github-border shadow-xl p-5 overflow-y-auto">
          <h1 className="mb-5 text-github-text text-2xl font-bold">Find Performances</h1>

          {/* Time Range Filter */}
          <div className="mb-5">
            <label className="block mb-2 text-github-text-secondary font-medium">When</label>
            <div className="flex gap-2 mb-2">
              {(['today', 'week', 'month', 'custom'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setFilters({ 
                    ...filters, 
                    timeRange: range,
                    customDate: range !== 'custom' ? undefined : filters.customDate
                  })}
                  className={`flex-1 py-2 font-medium rounded-lg transition-all duration-200 ${
                    filters.timeRange === range 
                      ? 'bg-github-blue text-github-text' 
                      : 'bg-github-bg border border-github-border text-github-text-secondary hover:border-github-blue'
                  }`}
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
                className="w-full p-2 bg-github-bg border border-github-border rounded-lg mt-2 text-github-text focus:outline-none focus:border-github-blue"
              />
            )}
          </div>

          {/* Category Filter */}
          <div className="mb-5">
            <label className="block mb-2 text-github-text-secondary font-medium">Category</label>
            <select
              className="w-full p-2 bg-github-bg border border-github-border rounded-lg text-github-text focus:outline-none focus:border-github-blue"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value, subcategory: '' })}
            >
              <option value="">All Categories</option>
              {Object.keys(CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Subcategory Filter */}
          {filters.category && CATEGORIES[filters.category]?.length > 0 && (
            <div className="mb-5">
              <label className="block mb-2 text-github-text-secondary font-medium">Subcategory</label>
              <select
                className="w-full p-2 bg-github-bg border border-github-border rounded-lg text-github-text focus:outline-none focus:border-github-blue"
                value={filters.subcategory}
                onChange={(e) => setFilters({ ...filters, subcategory: e.target.value })}
              >
                <option value="">All Subcategories</option>
                {CATEGORIES[filters.category].map(subcat => (
                  <option key={subcat} value={subcat}>{subcat}</option>
                ))}
              </select>
            </div>
          )}

          {/* Distance Filter */}
          {userLocation && (
            <div className="mb-5">
              <label className="block mb-2 text-github-text-secondary font-medium">
                Max Distance: <span className="text-github-blue font-semibold">{filters.maxDistance} km</span>
              </label>
              <input
                type="range"
                min="1"
                max="500"
                value={filters.maxDistance}
                onChange={(e) => setFilters({ ...filters, maxDistance: parseInt(e.target.value) })}
                className="w-full h-2 bg-github-border rounded-lg appearance-none cursor-pointer accent-github-blue"
              />
              <div className="flex justify-between text-xs text-github-text-muted mt-1">
                <span>1 km</span>
                <span>100 km</span>
              </div>
            </div>
          )}

          {/* Results Section */}
          <div>
            <h3 className="mb-4 text-github-text font-bold">Upcoming Events ({filteredEvents.length})</h3>
            
            {userLocation && (
              <div className="mb-3 p-2 bg-github-bg border border-github-border rounded-lg text-sm text-github-text-secondary">
                📍 Location detected - showing distances
              </div>
            )}

            {filteredEvents.length === 0 ? (
              <p className="text-github-text-secondary">No events found</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredEvents.map((event) => {
                  const distance = userLocation && event.location
                    ? calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        event.location.latitude,
                        event.location.longitude
                      )
                    : null;

                  return (
                    <div
                      key={event.id}
                      onClick={() => {
                        setClickedMarker(event.id);
                        setSelectedMarker(event.id);
                      }}
                      onMouseEnter={() => {
                        if (!clickedMarker) {
                          setSelectedMarker(event.id);
                        }
                      }}
                      onMouseLeave={() => {
                        if (!clickedMarker) {
                          setSelectedMarker(null);
                        }
                      }}
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedMarker === event.id
                          ? 'bg-github-bg border-2 border-github-blue shadow-lg'
                          : 'bg-github-bg border border-github-border hover:border-github-blue'
                      }`}
                    >
                      <div className="font-semibold text-github-text text-sm">{event.title}</div>
                      <div className="text-xs text-github-text-secondary mt-1">
                        {new Date(event.start_time).toLocaleDateString()}
                      </div>
                      {distance !== null && (
                        <div className="text-xs text-github-blue mt-1">
                          📍 {distance.toFixed(1)} km away
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}