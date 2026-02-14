import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/datepicker.css';
import { MapView } from '../map/MapView';
import { eventService } from '../../services/eventService';
import { MapSkeleton } from '../ui/SpecificSkeletons';
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
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('gobusker-sidebar-expanded');
    return saved ? JSON.parse(saved) : true;
  });
  const [filterPanelCollapsed, setFilterPanelCollapsed] = useState(() => {
    const saved = localStorage.getItem('gobusker-filter-panel-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [popupInitiallyExpanded, setPopupInitiallyExpanded] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const commonCities = ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg'];

  // Save filter panel state
  useEffect(() => {
    localStorage.setItem('gobusker-filter-panel-collapsed', JSON.stringify(filterPanelCollapsed));
  }, [filterPanelCollapsed]);

  // Listen for sidebar state changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('gobusker-sidebar-expanded');
      if (saved) {
        setSidebarExpanded(JSON.parse(saved));
      }
    };
    
    const interval = setInterval(handleStorageChange, 100);
    return () => clearInterval(interval);
  }, []);
  
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
          
          // Only center map on user if we're not returning to a specific event
          const state = location.state as { returnToEvent?: string } | null;
          if (!state?.returnToEvent) {
            setMapViewport({
              latitude: loc.latitude,
              longitude: loc.longitude,
              zoom: 12 // Zoom level for 3km radius
            });
          }
        },
        () => {
          // Location access denied or unavailable
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

  // Handle returning from profile/event pages with selected event
  useEffect(() => {
    const state = location.state as { 
      returnToEvent?: string; 
      searchContext?: {
        filters: any;
        searchQuery: string;
        activeLocation: { latitude: number; longitude: number; name?: string } | null;
        mapViewport: { latitude: number; longitude: number; zoom: number } | null;
      };
      mapState?: {
        selectedEventId: string;
        viewport: { latitude: number; longitude: number; zoom: number };
        searchContext?: {
          filters: any;
          searchQuery: string;
          activeLocation: { latitude: number; longitude: number; name?: string } | null;
          mapViewport: { latitude: number; longitude: number; zoom: number } | null;
        };
        isExpanded?: boolean;
      };
    } | null;
    
    if (!state?.mapState && !state?.returnToEvent) {
      return; // No state to restore
    }
    
    // Handle new mapState structure (from event details page)
    if (state?.mapState && events.length > 0) {
      const event = events.find(e => e.id === state.mapState!.selectedEventId);
      
      if (event) {
        // Restore complete search context from mapState
        if (state.mapState.searchContext) {
          setFilters(state.mapState.searchContext.filters);
          setSearchQuery(state.mapState.searchContext.searchQuery || '');
          setActiveLocation(state.mapState.searchContext.activeLocation);
          
          if (state.mapState.searchContext.mapViewport) {
            setMapViewport(state.mapState.searchContext.mapViewport);
          } else {
            setMapViewport(state.mapState.viewport);
          }
        } else {
          // Use the viewport from mapState
          setMapViewport(state.mapState.viewport);
        }
        
        // Set the selected marker and expanded state
        setSelectedMarker(state.mapState.selectedEventId);
        setClickedMarker(state.mapState.selectedEventId);
        setPopupInitiallyExpanded(state.mapState.isExpanded || false);
        
        // Trigger fly to animation
        setTimeout(() => {
          setFlyToKey(prev => prev + 1);
        }, 100);
        
        // Clear the state to prevent re-triggering
        navigate(location.pathname, { replace: true, state: {} });
        return;
      }
    }
    
    // Handle legacy structure (from profile pages)  
    if (state?.returnToEvent && events.length > 0) {
      const event = events.find(e => e.id === state.returnToEvent);
      if (event && event.location) {
        // Restore complete search context
        if (state.searchContext) {
          setFilters(state.searchContext.filters);
          setSearchQuery(state.searchContext.searchQuery || '');
          setActiveLocation(state.searchContext.activeLocation);
          
          if (state.searchContext.mapViewport) {
            setMapViewport(state.searchContext.mapViewport);
          } else {
            setMapViewport({ 
              latitude: event.location.latitude, 
              longitude: event.location.longitude, 
              zoom: 14 
            });
          }
        } else {
          // Fallback to event location if no context
          setMapViewport({ 
            latitude: event.location.latitude, 
            longitude: event.location.longitude, 
            zoom: 14 
          });
        }
        
        setSelectedMarker(state.returnToEvent);
        setClickedMarker(state.returnToEvent);
        setFlyToKey(prev => prev + 1);
        setPopupInitiallyExpanded(false); // Profile navigation doesn't expand
        
        // Clear the state to prevent re-triggering
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [events, location.state, navigate, location.pathname]);

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
    <div className={`fixed inset-0 top-14 md:top-0 flex flex-col transition-all duration-300 ${sidebarExpanded ? 'md:left-56' : 'md:left-16'} safe-area-top safe-area-bottom`}>
      
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
            <div className="w-full h-full p-4">
              <MapSkeleton />
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
                      description: event.description,
                      date: event.start_time,
                      location: event.location.place_name,
                      profile: event.profile ? {
                        id: event.profile.id,
                        name: event.profile.name,
                        avatar_url: event.profile.avatar_url,
                        profile_type: event.profile.profile_type
                      } : undefined,
                      event_type: event.event_type,
                      accepting_requests: event.accepting_requests,
                      max_performers: event.max_performers,
                      accepted_requests_count: event.accepted_requests_count
                    }))
                ]}
                selectedMarkerId={selectedMarker}
                userLocation={userLocation}
                searchCenter={activeLocation || userLocation}
                searchRadius={filters.maxDistance}
                flyToKey={flyToKey}
                initialExpanded={popupInitiallyExpanded}
                currentSearchContext={{
                  filters,
                  searchQuery,
                  activeLocation,
                  mapViewport
                }}
                onMarkerClick={(markerId) => {
                  setClickedMarker(markerId);
                  setSelectedMarker(markerId);
                  setPopupInitiallyExpanded(false); // Reset to collapsed when clicking new marker
                }}
                onMapClick={() => {
                  setClickedMarker(null);
                  setSelectedMarker(null);
                  setPopupInitiallyExpanded(false); // Reset when clearing selection
                }}
                onBoundsChange={handleBoundsChange}
              />
              
              {/* Event Cards Overlay - Desktop */}
              {filteredEvents.length > 0 && (
                <div className="hidden md:block absolute bottom-0 left-0 z-10">
                  <div className="flex gap-1 overflow-x-auto scrollbar-none">
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
                          className={`min-w-[110px] max-w-[110px] px-2 py-1.5 cursor-pointer transition-all duration-150 backdrop-blur-sm ${
                            selectedMarker === event.id
                              ? 'bg-light-card/95 dark:bg-github-card/95 border-l-2 border-light-blue dark:border-github-blue'
                              : 'bg-light-card/70 dark:bg-github-card/70 hover:bg-light-card/95 dark:hover:bg-github-card/95 border-l border-light-border/50 dark:border-github-border/50'
                          }`}
                        >
                          <div className="font-medium text-light-text dark:text-github-text text-[11px] leading-tight line-clamp-1 text-left">{event.title}</div>
                          <div className="flex items-center gap-1 text-[9px] text-light-text-muted dark:text-github-text-muted">
                            <span>{new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            {distance !== null && (
                              <span className="text-light-blue dark:text-github-blue">{distance.toFixed(1)}km</span>
                            )}
                          </div>
                          {/* Slot availability for open_mic and venue_booking */}
                          {event.event_type !== 'solo_performance' && event.max_performers && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`text-[8px] px-1 py-0.5 rounded ${
                                event.event_type === 'open_mic' 
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              }`}>
                                {event.event_type === 'open_mic' ? '🎤' : '🏢'} {(event.accepted_requests_count || 0)}/{event.max_performers}
                              </span>
                              {event.accepting_requests && (event.accepted_requests_count || 0) < event.max_performers && (
                                <span className="text-[7px] text-green-600 dark:text-green-400">open</span>
                              )}
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
        <div className={`hidden md:flex flex-col bg-light-card dark:bg-github-card border-l border-light-border dark:border-github-border shadow-xl overflow-hidden transition-all duration-300 ${filterPanelCollapsed ? 'w-10' : 'w-[320px]'}`}>
          {/* Collapse Toggle */}
          <button
            onClick={() => setFilterPanelCollapsed(!filterPanelCollapsed)}
            className="p-2 flex-shrink-0 flex justify-end"
            title={filterPanelCollapsed ? 'Expand filters' : 'Collapse filters'}
          >
            {filterPanelCollapsed ? (
              <svg className="w-5 h-5 mx-auto p-0.5 rounded text-light-text-muted dark:text-github-text-muted hover:text-light-text dark:hover:text-github-text hover:bg-light-bg dark:hover:bg-github-bg transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 p-0.5 rounded text-light-text-muted dark:text-github-text-muted hover:text-light-text dark:hover:text-github-text hover:bg-light-bg dark:hover:bg-github-bg transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
          
          {/* Content - hidden when collapsed */}
          {!filterPanelCollapsed && (
            <div className="flex-1 p-4 overflow-y-auto">
              <h1 className="mb-3 text-light-text dark:text-github-text text-lg font-bold">Find Performances</h1>

              {/* Location Search */}
              <div className="mb-4">
                <label className="block mb-1.5 text-light-text-secondary dark:text-github-text-secondary font-medium text-sm">Location</label>
                <div className="relative flex gap-2 mb-2">
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
                onClick={() => handleSearch()}
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
          <div className="mb-4">
            <label className="block mb-2 text-light-text-secondary dark:text-github-text-secondary font-medium text-sm">When</label>
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
          <div className="mb-4">
            <label className="block mb-1.5 text-light-text-secondary dark:text-github-text-secondary font-medium text-sm">Category</label>
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
            <div className="mb-4">
              <label className="block mb-1.5 text-light-text-secondary dark:text-github-text-secondary font-medium text-sm">Subcategory</label>
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
            <div className="mb-4">
              <label className="block mb-1.5 text-light-text-secondary dark:text-github-text-secondary font-medium text-sm">
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
                    onClick={() => handleSearch()}
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

              {/* Results and Event Cards */}
              <div className="space-y-3">
                <div className="text-center py-2 text-light-text-secondary dark:text-github-text-secondary text-sm font-medium">
                  {filteredEvents.length} performances found
                </div>
                
                {/* Mobile Event Cards */}
                {filteredEvents.length > 0 && (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredEvents.slice(0, 20).map((event) => {
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
                            setPopupInitiallyExpanded(true);
                            setSheetHeight(32); // Collapse sheet to show map
                          }}
                          className="bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg p-3 cursor-pointer hover:border-light-blue dark:hover:border-github-blue transition-all touch-target"
                        >
                          <div className="flex items-start gap-3">
                            <img 
                              src={event.profile?.avatar_url || 'https://via.placeholder.com/40/2d3748/e2e8f0?text=?'}
                              alt={`${event.profile?.name || 'Unknown'}`}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-light-text dark:text-github-text text-sm line-clamp-1">
                                {event.title}
                              </h3>
                              <p className="text-xs text-light-text-secondary dark:text-github-text-secondary mb-2 line-clamp-1">
                                {event.profile?.name || 'Unknown Artist'}
                              </p>
                              <div className="flex items-center justify-between text-xs text-light-text-secondary dark:text-github-text-secondary">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="flex items-center gap-1">
                                    📅 {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    ⏰ {new Date(event.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                  </span>
                                </div>
                                {distance !== null && (
                                  <span className="text-light-blue dark:text-github-blue font-medium flex-shrink-0 ml-2">
                                    {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {filteredEvents.length > 20 && (
                      <div className="text-center py-2 text-light-text-secondary dark:text-github-text-secondary text-xs">
                        Showing first 20 results. Use filters to narrow down.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}