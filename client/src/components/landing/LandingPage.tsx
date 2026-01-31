import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/datepicker.css';
import { MapView } from '../map/MapView';
import { eventService } from '../../services/eventService';
import type { Event } from '../../types/models';

interface MapFilters {
  timeRange: 'today' | 'custom';
  customDateStart?: string; // Start date for custom range
  customDateEnd?: string; // End date for custom range
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
    timeRange: 'today',
    location: '',
    category: '',
    subcategory: '',
    maxDistance: 3 // Default 3 km
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [clickedMarker, setClickedMarker] = useState<string | null>(null);
  const [sheetHeight, setSheetHeight] = useState(() => window.innerHeight * 0.4); // Start expanded
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapViewport, setMapViewport] = useState<{ latitude: number; longitude: number; zoom: number } | null>(null);
  const [flyToKey, setFlyToKey] = useState(0);

  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeLocation, setActiveLocation] = useState<{ latitude: number; longitude: number; name?: string } | null>(null);
  const [skipSuggestions, setSkipSuggestions] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [isUserLocationVisible, setIsUserLocationVisible] = useState(true);
  const [currentBounds, setCurrentBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  
  const commonCities = ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg'];
  
  // Store bounds and check visibility
  const handleBoundsChange = (bounds: { north: number; south: number; east: number; west: number }) => {
    setCurrentBounds(bounds);
  };
  
  // Check if user location is visible whenever bounds or userLocation changes
  useEffect(() => {
    if (!userLocation || !currentBounds) {
      return;
    }
    const isVisible = 
      userLocation.latitude <= currentBounds.north &&
      userLocation.latitude >= currentBounds.south &&
      userLocation.longitude <= currentBounds.east &&
      userLocation.longitude >= currentBounds.west;
    setIsUserLocationVisible(isVisible);
  }, [userLocation, currentBounds]);

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
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(loc);
          // Center map on user immediately with zoom for 3km radius
          setMapViewport({
            latitude: loc.latitude,
            longitude: loc.longitude,
            zoom: 12 // Zoom level for 3km radius
          });
        },
        () => {
          console.log('Location access denied or unavailable');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    fetchEvents();
  }, []);

  // Fetch search suggestions as user types (debounced)
  useEffect(() => {
    const fetchSuggestions = async () => {
      // Don't fetch if query is too short or if we should skip suggestions
      if (searchQuery.length < 2 || skipSuggestions) {
        setSearchSuggestions([]);
        return;
      }

      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?` +
          `country=SE,NO,DK,FI&` +
          `proximity=18.0649,59.3293&` +
          `types=place,locality,neighborhood,address,poi&` +
          `language=sv,en&` +
          `limit=5&` +
          `access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`
        );
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          setSearchSuggestions(data.features);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Filter events based on time range
  useEffect(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let filtered = events.filter(event => {
      const eventDate = new Date(event.start_time);
      
      switch (filters.timeRange) {
        case 'today': {
          // For today, only show upcoming events
          const endOfDay = new Date(startOfDay.getTime() + 24*60*60*1000);
          return eventDate >= now && eventDate < endOfDay;
        }
        case 'custom': {
          // For custom date range, show events within the range
          if (!filters.customDateStart || !filters.customDateEnd) return eventDate >= now;
          const startDate = new Date(filters.customDateStart);
          const endDate = new Date(filters.customDateEnd);
          const startOfStartDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const endOfEndDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
          return eventDate >= startOfStartDay && eventDate <= endOfEndDay;
        }
        default: {
          return eventDate >= now;
        }
      }
    });
    
    if (filters.category) {
      filtered = filtered.filter(event => event.category === filters.category);
    }

    if (filters.subcategory) {
      filtered = filtered.filter(event => event.subcategory === filters.subcategory);
    }

    // Filter by distance if active location is available (either searched location or user GPS)
    const locationForFiltering = activeLocation || userLocation;
    if (locationForFiltering) {
      filtered = filtered.filter(event => {
        if (!event.location) return false;
        const distance = calculateDistance(
          locationForFiltering.latitude,
          locationForFiltering.longitude,
          event.location.latitude,
          event.location.longitude
        );
        return distance <= filters.maxDistance;
      });
    }

    setFilteredEvents(filtered);
    }, [filters, events, userLocation, activeLocation]);

  // Calculate appropriate zoom level for a given radius in km
  // Lower zoom = more zoomed out to see the full circle
  const getZoomForRadius = (radiusKm: number): number => {
    if (radiusKm <= 1) return 13;
    if (radiusKm <= 2) return 12.5;
    if (radiusKm <= 3) return 12;
    if (radiusKm <= 5) return 11.5;
    if (radiusKm <= 10) return 10.5;
    if (radiusKm <= 20) return 9.5;
    if (radiusKm <= 40) return 8.5;
    if (radiusKm <= 60) return 8;
    if (radiusKm <= 80) return 7.5;
    return 7;
  };

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

  // Handle drag start
  const handleDragStart = (clientY: number) => {
    setIsDragging(true);
    setStartY(clientY);
  };

  // Handle drag move
  const handleDragMove = (clientY: number) => {
    if (!isDragging) return;
    const deltaY = startY - clientY;
    const newHeight = Math.max(80, Math.min(window.innerHeight * 0.9, sheetHeight + deltaY));
    setSheetHeight(newHeight);
    setStartY(clientY);
  };

  // Handle drag end - snap to 3 positions
  const handleDragEnd = () => {
    setIsDragging(false);
    const vh = window.innerHeight;
    // Snap to: collapsed (32px), medium (40vh), or expanded (85vh)
    if (sheetHeight < vh * 0.2) {
      setSheetHeight(32);
    } else if (sheetHeight < vh * 0.55) {
      setSheetHeight(vh * 0.4);
    } else {
      setSheetHeight(vh * 0.85);
    }
  };

  // Global mouse/touch move handler for dragging (works outside the element)
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        handleDragMove(e.clientY);
      }
    };
    
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
        handleDragMove(e.touches[0].clientY);
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      window.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, startY, sheetHeight]);

  // Handle location search using Mapbox Geocoding API
  const handleSearch = async (placeQuery?: string) => {
    const query = placeQuery || searchQuery;
    if (!query.trim()) return;
    
    setIsSearching(true);
    setShowSuggestions(false);
    setSkipSuggestions(true); // Prevent suggestions from showing
    if (placeQuery) setSearchQuery(placeQuery);
    
    try {
      // Bias search towards Sweden and surrounding countries
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `country=SE,NO,DK,FI&` + // Limit to Nordic countries
        `proximity=18.0649,59.3293&` + // Proximity to Stockholm
        `types=place,locality,neighborhood,address,poi&` + // Include various location types
        `language=sv,en&` + // Support Swedish and English
        `access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`
      );
      const data = await response.json();
      
      console.log('Geocoding response:', data); // Debug log
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.center;
        
        // Determine appropriate zoom level based on place type
        let zoom = 13; // Default zoom
        const placeType = feature.place_type?.[0];
        
        if (placeType === 'country') {
          zoom = 5;
        } else if (placeType === 'region') {
          zoom = 7;
        } else if (placeType === 'place' || placeType === 'locality') {
          // For cities, use bounding box if available
          if (feature.bbox) {
            const [minLng, minLat, maxLng, maxLat] = feature.bbox;
            const lngDiff = maxLng - minLng;
            const latDiff = maxLat - minLat;
            const maxDiff = Math.max(lngDiff, latDiff);
            
            // Calculate zoom based on bounding box size
            if (maxDiff > 1) zoom = 9;
            else if (maxDiff > 0.5) zoom = 10;
            else if (maxDiff > 0.2) zoom = 11;
            else if (maxDiff > 0.1) zoom = 12;
            else zoom = 13;
          } else {
            zoom = 11; // Default for cities
          }
        } else if (placeType === 'neighborhood') {
          zoom = 14;
        } else if (placeType === 'address' || placeType === 'poi') {
          zoom = 15;
        }
        
        // Set zoom based on 3km radius (default when selecting a city)
        const radiusZoom = getZoomForRadius(3);
        
        setMapViewport({ latitude, longitude, zoom: radiusZoom });
        // Set active location to the searched location for event filtering
        setActiveLocation({ latitude, longitude, name: feature.place_name });
        // Reset distance to 3km when selecting a new location
        setFilters(prev => ({ ...prev, maxDistance: 3 }));
        setFlyToKey(prev => prev + 1); // Force map to update
        console.log(`Found: ${feature.place_name} at [${latitude}, ${longitude}] with zoom ${radiusZoom}`);
      } else {
        console.warn('No results found for:', query);
        alert(`No location found for "${query}". Try being more specific or use a different spelling.`);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      alert('Failed to search location. Please try again.');
    } finally {
      setIsSearching(false);
      // Reset skip flag after a delay
      setTimeout(() => setSkipSuggestions(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 top-14 md:top-16 flex flex-col">
      
      {/* Date Range Modal with Calendar */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDateModal(false)}>
          <div className="bg-light-card dark:bg-github-card rounded-2xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-light-text dark:text-github-text mb-3">Select Date</h3>
            
            {/* Show selected date(s) */}
            <div className="mb-4 p-3 bg-light-bg dark:bg-github-bg rounded-lg text-sm text-light-text dark:text-github-text">
              {filters.customDateStart ? (
                filters.customDateEnd ? (
                  filters.customDateEnd !== filters.customDateStart ? (
                    <span>
                      <span className="font-semibold">{new Date(filters.customDateStart).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      {' → '}
                      <span className="font-semibold">{new Date(filters.customDateEnd).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </span>
                  ) : (
                    <span className="font-semibold">{new Date(filters.customDateStart).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                  )
                ) : (
                  <span>
                    <span className="font-semibold">{new Date(filters.customDateStart).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span className="text-light-text-secondary dark:text-github-text-secondary"> — now tap end date</span>
                  </span>
                )
              ) : (
                <span className="text-light-text-secondary dark:text-github-text-secondary">Tap to select start date</span>
              )}
            </div>
            
            <div className="space-y-4">
              <DatePicker
                selected={filters.customDateStart ? new Date(filters.customDateStart) : null}
                onChange={(dates) => {
                  const [start, end] = dates as [Date | null, Date | null];
                  setFilters({
                    ...filters,
                    customDateStart: start ? start.toISOString().split('T')[0] : undefined,
                    customDateEnd: end ? end.toISOString().split('T')[0] : undefined
                  });
                }}
                startDate={filters.customDateStart ? new Date(filters.customDateStart) : null}
                endDate={filters.customDateEnd ? new Date(filters.customDateEnd) : null}
                selectsRange
                inline
                monthsShown={1}
                calendarClassName="!bg-light-bg dark:!bg-github-bg !border-light-border dark:!border-github-border"
              />
            </div>
            
            <p className="text-xs text-light-text-secondary dark:text-github-text-secondary mt-2 text-center">
              {!filters.customDateStart 
                ? 'Select a start date' 
                : !filters.customDateEnd 
                  ? 'Now select an end date (or same date for single day)'
                  : 'Tap a new date to start over'}
            </p>
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowDateModal(false)}
                className="flex-1 py-2.5 px-4 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg font-semibold text-light-text-secondary dark:text-github-text-secondary hover:border-light-blue dark:hover:border-github-blue transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (filters.customDateStart) {
                    // If no end date, use start date as end date (single day)
                    if (!filters.customDateEnd) {
                      setFilters({ ...filters, timeRange: 'custom', customDateEnd: filters.customDateStart });
                    } else {
                      setFilters({ ...filters, timeRange: 'custom' });
                    }
                    setShowDateModal(false);
                  } else {
                    alert('Please select a date');
                  }
                }}
                disabled={!filters.customDateStart}
                className="flex-1 py-2.5 px-4 bg-light-blue dark:bg-github-blue text-white rounded-lg font-semibold hover:bg-light-blue-dark dark:hover:bg-github-blue-dark transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Map Section */}
        <div className="flex-1 bg-light-bg dark:bg-github-bg relative">
          {loading ? (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border p-5 rounded-lg shadow-xl z-10 text-light-text dark:text-github-text">
              Loading events...
            </div>
          ) : (
            <>
              <MapView
                center={mapViewport ? [mapViewport.longitude, mapViewport.latitude] : (userLocation ? [userLocation.longitude, userLocation.latitude] : [18.0649, 59.3293])}
                zoom={mapViewport ? mapViewport.zoom : (userLocation ? 13 : 11)}
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
                      location: event.location.place_name,
                      profile: event.profile ? {
                        id: event.profile.id,
                        name: event.profile.name,
                        avatar_url: event.profile.avatar_url,
                        profile_type: event.profile.profile_type
                      } : undefined
                    }))
                ]}
                selectedMarkerId={selectedMarker}
                userLocation={userLocation}
                searchCenter={activeLocation || userLocation}
                searchRadius={filters.maxDistance}
                flyToKey={flyToKey}
                onMarkerClick={(markerId) => {
                  setClickedMarker(markerId);
                  setSelectedMarker(markerId);
                }}
                onMapClick={() => {
                  setClickedMarker(null);
                  setSelectedMarker(null);
                }}
                onBoundsChange={handleBoundsChange}
              />
              
              {/* Event Cards Overlay - Desktop */}
              {filteredEvents.length > 0 && (
                <div className="hidden md:block absolute bottom-3 left-3 right-3 z-10">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-light-border dark:scrollbar-thumb-github-border scrollbar-track-transparent">
                    {filteredEvents.map((event) => {
                      const locationForDistance = activeLocation || userLocation;
                      const distance = locationForDistance && event.location
                        ? calculateDistance(
                            locationForDistance.latitude,
                            locationForDistance.longitude,
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
                          className={`min-w-[200px] max-w-[200px] p-2.5 rounded-lg cursor-pointer transition-all duration-200 backdrop-blur-sm ${
                            selectedMarker === event.id
                              ? 'bg-light-card/95 dark:bg-github-card/95 border-2 border-light-blue dark:border-github-blue shadow-xl'
                              : 'bg-light-card/40 dark:bg-github-card/40 hover:bg-light-card/95 hover:dark:bg-github-card/95 border border-light-border/20 dark:border-github-border/20 hover:border-light-blue dark:hover:border-github-blue shadow-lg hover:shadow-xl'
                          }`}
                        >
                          <div className="font-semibold text-light-text dark:text-github-text text-xs leading-tight mb-1 line-clamp-1">{event.title}</div>
                          <div className="text-[10px] text-light-text-secondary dark:text-github-text-secondary mb-1">
                            📅 {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          {distance !== null && (
                            <div className="text-[10px] font-medium text-light-blue dark:text-github-blue">
                              📍 {distance.toFixed(1)} km
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Filters & Results Panel - Desktop Sidebar */}
        <div className="hidden md:block md:w-[400px] bg-light-card dark:bg-github-card border-l border-light-border dark:border-github-border shadow-xl p-5 overflow-y-auto">
          <h1 className="mb-5 text-light-text dark:text-github-text text-2xl font-bold">Find Performances</h1>

          {/* Location Search */}
          <div className="mb-5">
            <label className="block mb-2 text-light-text-secondary dark:text-github-text-secondary font-medium text-sm">Location</label>
            <div className="relative flex gap-2 mb-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search location..."
                  className="w-full px-3 py-2 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg text-sm text-light-text dark:text-github-text placeholder-light-text-muted dark:placeholder-github-text-muted focus:outline-none focus:border-light-blue dark:focus:border-github-blue"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSkipSuggestions(false);
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                    {searchSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSearchQuery(suggestion.place_name);
                          handleSearch(suggestion.place_name);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-light-bg dark:hover:bg-github-bg transition-colors border-b border-light-border dark:border-github-border last:border-b-0"
                      >
                        <div className="text-sm font-medium text-light-text dark:text-github-text">
                          {suggestion.text}
                        </div>
                        <div className="text-xs text-light-text-secondary dark:text-github-text-secondary truncate">
                          {suggestion.place_name}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button 
                onClick={handleSearch}
                disabled={isSearching}
                className="px-3 py-2 bg-light-blue dark:bg-github-blue hover:bg-light-blue-dark dark:hover:bg-github-blue-dark text-white font-semibold rounded-lg transition-all duration-200 text-sm disabled:opacity-50"
              >
                {isSearching ? '...' : 'Go'}
              </button>
            </div>
            
            {/* Quick City Buttons */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {/* My Location Button - show when blue dot is off screen */}
              {userLocation && !isUserLocationVisible && (
                <button
                  onClick={() => {
                    setActiveLocation(null);
                    setSearchQuery('');
                    setMapViewport({ 
                      latitude: userLocation.latitude, 
                      longitude: userLocation.longitude, 
                      zoom: getZoomForRadius(filters.maxDistance) 
                    });
                    setFlyToKey(prev => prev + 1); // Trigger flyTo animation
                  }}
                  className="px-2.5 py-1 text-xs bg-light-blue/20 dark:bg-github-blue/20 border border-light-blue dark:border-github-blue rounded-full text-light-blue dark:text-github-blue font-medium"
                >
                  📍 My Location
                </button>
              )}
              {commonCities.slice(0, 4).map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    setShowSuggestions(false);
                    setSearchSuggestions([]);
                    handleSearch(`${city}, Sweden`);
                  }}
                  className="px-2.5 py-1 text-xs bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-full text-light-text-secondary dark:text-github-text-secondary hover:border-light-blue dark:hover:border-github-blue hover:text-light-blue dark:hover:text-github-blue transition-all duration-200"
                >
                  {city}
                </button>
              ))}
            </div>
            
            {/* Active Location Display */}
            {activeLocation && activeLocation.name && (
              <div className="flex items-center gap-2 px-3 py-2 bg-light-blue/10 dark:bg-github-blue/10 rounded-lg text-sm">
                <span className="text-light-blue dark:text-github-blue flex-1 truncate">
                  📍 {activeLocation.name.split(',')[0]}
                </span>
                <button
                  onClick={() => {
                    setActiveLocation(null);
                    setSearchQuery('');
                    if (userLocation) {
                      setMapViewport({ latitude: userLocation.latitude, longitude: userLocation.longitude, zoom: 13 });
                    }
                  }}
                  className="text-light-blue dark:text-github-blue hover:text-light-blue-dark font-bold"
                  title="Reset to my location"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Time Range Filter */}
          <div className="mb-5">
            <label className="block mb-3 text-light-text-secondary dark:text-github-text-secondary font-medium text-sm">When</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, timeRange: 'today', customDateStart: undefined, customDateEnd: undefined })}
                className={`flex-1 py-2.5 px-3 font-semibold rounded-lg transition-all duration-200 text-sm ${
                  filters.timeRange === 'today'
                    ? 'bg-light-blue dark:bg-github-blue text-white shadow-lg scale-105'
                    : 'bg-light-bg dark:bg-github-bg text-light-text-secondary dark:text-github-text-secondary hover:bg-light-blue/10 dark:hover:bg-github-blue/10'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setShowDateModal(true)}
                className={`flex-1 py-2.5 px-3 font-semibold rounded-lg transition-all duration-200 text-sm ${
                  filters.timeRange === 'custom'
                    ? 'bg-light-blue dark:bg-github-blue text-white shadow-lg scale-105'
                    : 'bg-light-bg dark:bg-github-bg text-light-text-secondary dark:text-github-text-secondary hover:bg-light-blue/10 dark:hover:bg-github-blue/10'
                }`}
              >
                {filters.timeRange === 'custom' && filters.customDateStart
                  ? filters.customDateEnd && filters.customDateEnd !== filters.customDateStart
                    ? `${new Date(filters.customDateStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(filters.customDateEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : new Date(filters.customDateStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Pick Dates'
                }
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-5">
            <label className="block mb-2 text-light-text-secondary dark:text-github-text-secondary font-medium">Category</label>
            <select
              className="w-full p-2 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg text-light-text dark:text-github-text focus:outline-none focus:border-light-blue dark:focus:border-github-blue"
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
              <label className="block mb-2 text-light-text-secondary dark:text-github-text-secondary font-medium">Subcategory</label>
              <select
                className="w-full p-2 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg text-light-text dark:text-github-text focus:outline-none focus:border-light-blue dark:focus:border-github-blue"
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
              <label className="block mb-2 text-light-text-secondary dark:text-github-text-secondary font-medium">
                Max Distance: <span className="text-light-blue dark:text-github-blue font-semibold">{filters.maxDistance} km</span>
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={filters.maxDistance}
                onChange={(e) => {
                  const newDistance = parseInt(e.target.value);
                  setFilters({ ...filters, maxDistance: newDistance });
                  // Adjust zoom to fit the circle
                  const searchLocation = activeLocation || userLocation;
                  if (searchLocation) {
                    setMapViewport({
                      latitude: searchLocation.latitude,
                      longitude: searchLocation.longitude,
                      zoom: getZoomForRadius(newDistance)
                    });
                  }
                }}
                className="w-full h-2 bg-light-border dark:bg-github-border rounded-lg appearance-none cursor-pointer accent-light-blue dark:accent-github-blue"
              />
              <div className="flex justify-between text-xs text-light-text-muted dark:text-github-text-muted mt-1">
                <span>1 km</span>
                <span>50 km</span>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Sheet */}
        <div 
          className="md:hidden fixed bottom-0 left-0 right-0 bg-light-card dark:bg-github-card shadow-[0_-4px_20px_rgba(0,0,0,0.3)] rounded-t-2xl z-20"
          style={{ height: `${sheetHeight}px` }}
        >
          {/* Drag Handle */}
          <div 
            className="w-full py-2 flex flex-col items-center cursor-grab active:cursor-grabbing select-none"
            onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
            onMouseDown={(e) => handleDragStart(e.clientY)}
          >
            <div className="w-10 h-1 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
          </div>

          {/* Sheet Content - Only show when expanded */}
          {sheetHeight > 100 && (
            <div 
              className="px-4 pb-6 overflow-y-scroll mobile-sheet-content" 
              style={{ 
                height: `calc(${sheetHeight}px - 50px)`,
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <h2 className="mb-4 text-light-text dark:text-github-text text-lg font-bold">Find Performances</h2>

              {/* Location Search */}
              <div className="mb-4">
                <label className="block mb-2 text-light-text-secondary dark:text-github-text-secondary font-medium text-sm">Location</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search location..."
                    className="flex-1 px-3 py-2 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg text-sm text-light-text dark:text-github-text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSkipSuggestions(false);
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button 
                    onClick={handleSearch}
                    className="px-4 py-2 bg-light-blue dark:bg-github-blue text-white rounded-lg text-sm font-medium"
                  >
                    Go
                  </button>
                </div>
                {/* Quick cities */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {/* My Location Button - show when blue dot is off screen */}
                  {userLocation && !isUserLocationVisible && (
                    <button
                      onClick={() => {
                        setActiveLocation(null);
                        setSearchQuery('');
                        setMapViewport({ 
                          latitude: userLocation.latitude, 
                          longitude: userLocation.longitude, 
                          zoom: getZoomForRadius(filters.maxDistance) 
                        });
                        setFlyToKey(prev => prev + 1); // Trigger flyTo animation
                        setSheetHeight(32); // Collapse sheet
                      }}
                      className="px-2 py-1 text-xs bg-light-blue/20 dark:bg-github-blue/20 border border-light-blue dark:border-github-blue rounded-full text-light-blue dark:text-github-blue font-medium"
                    >
                      📍 Near me
                    </button>
                  )}
                  {commonCities.slice(0, 4).map((city) => (
                    <button
                      key={city}
                      onClick={() => handleSearch(`${city}, Sweden`)}
                      className="px-2 py-1 text-xs bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-full text-light-text-secondary dark:text-github-text-secondary"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Filter */}
              <div className="mb-4">
                <label className="block mb-2 text-light-text-secondary dark:text-github-text-secondary font-medium text-sm">When</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, timeRange: 'today', customDateStart: undefined, customDateEnd: undefined })}
                    className={`py-2.5 text-sm font-medium rounded-lg ${
                      filters.timeRange === 'today'
                        ? 'bg-light-blue dark:bg-github-blue text-white'
                        : 'bg-light-bg dark:bg-github-bg text-light-text dark:text-github-text border border-light-border dark:border-github-border'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setShowDateModal(true)}
                    className={`py-2.5 text-sm font-medium rounded-lg ${
                      filters.timeRange === 'custom'
                        ? 'bg-light-blue dark:bg-github-blue text-white'
                        : 'bg-light-bg dark:bg-github-bg text-light-text dark:text-github-text border border-light-border dark:border-github-border'
                    }`}
                  >
                    {filters.timeRange === 'custom' && filters.customDateStart
                      ? filters.customDateEnd && filters.customDateEnd !== filters.customDateStart
                        ? `${new Date(filters.customDateStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(filters.customDateEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : new Date(filters.customDateStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'Pick Dates'
                    }
                  </button>
                </div>
              </div>

              {/* Category Filter */}
              <div className="mb-4">
                <label className="block mb-2 text-light-text-secondary dark:text-github-text-secondary font-medium text-sm">Category</label>
                <select
                  className="w-full p-2.5 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg text-sm text-light-text dark:text-github-text"
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value, subcategory: '' })}
                >
                  <option value="">All Categories</option>
                  {Object.keys(CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Distance Filter */}
              {userLocation && (
                <div className="mb-4">
                  <label className="block mb-2 text-light-text-secondary dark:text-github-text-secondary font-medium text-sm">
                    Distance: <span className="text-light-blue dark:text-github-blue font-semibold">{filters.maxDistance} km</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={filters.maxDistance}
                    onChange={(e) => {
                      const newDistance = parseInt(e.target.value);
                      setFilters({ ...filters, maxDistance: newDistance });
                      // Adjust zoom to fit the circle
                      const searchLocation = activeLocation || userLocation;
                      if (searchLocation) {
                        setMapViewport({
                          latitude: searchLocation.latitude,
                          longitude: searchLocation.longitude,
                          zoom: getZoomForRadius(newDistance)
                        });
                      }
                    }}
                    className="w-full h-2 bg-light-border dark:bg-github-border rounded-lg appearance-none cursor-pointer accent-light-blue"
                  />
                </div>
              )}

              {/* Results count */}
              <div className="text-center py-4 text-light-text-secondary dark:text-github-text-secondary text-sm">
                {filteredEvents.length} performances found
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}