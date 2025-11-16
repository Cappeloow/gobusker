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
    }, [filters, events, userLocation]);  // Calculate distance between two coordinates using Haversine formula
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
    <div className="h-screen flex flex-col">

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
        <div className="w-[400px] bg-white shadow-lg p-5 overflow-y-auto">
          <h1 className="mb-5 text-gray-900">Find Performances</h1>

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

          {/* Category Filter */}
          <div className="mb-5">
            <label className="block mb-2 text-gray-500">Category</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md bg-white"
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
              <label className="block mb-2 text-gray-500">Subcategory</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md bg-white"
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
              <label className="block mb-2 text-gray-500">
                Max Distance: <span className="font-semibold text-gray-700">{filters.maxDistance} km</span>
              </label>
              <input
                type="range"
                min="1"
                max="500"
                value={filters.maxDistance}
                onChange={(e) => setFilters({ ...filters, maxDistance: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 km</span>
                <span>100 km</span>
              </div>
            </div>
          )}

          {/* Results Section */}
          <div>
            <h3 className="mb-4 text-gray-700">Upcoming Events ({filteredEvents.length})</h3>
            
            {userLocation && (
              <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-sm text-blue-700 dark:text-blue-300">
                📍 Location detected - showing distances
              </div>
            )}

            {filteredEvents.length === 0 ? (
              <p className="text-gray-500">No events found</p>
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
                        // Only change selection on hover if nothing is clicked
                        if (!clickedMarker) {
                          setSelectedMarker(event.id);
                        }
                      }}
                      onMouseLeave={() => {
                        // Only clear on mouse leave if nothing is clicked
                        if (!clickedMarker) {
                          setSelectedMarker(null);
                        }
                      }}
                      className={`p-3 rounded cursor-pointer transition-colors ${
                        selectedMarker === event.id
                          ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 dark:text-white text-sm">{event.title}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        {new Date(event.start_time).toLocaleDateString()}
                      </div>
                      {distance !== null && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
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