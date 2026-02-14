import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { eventService } from '../../services/eventService';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/models';
import { LocationSearchMap } from '../map/LocationSearchMap';
import { Search, UserPlus, X, Users, Calendar, Clock } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/datepicker.css';

interface Collaborator {
  profile: Profile;
}

interface PerformerInvite {
  profile: Profile;
  message?: string;
}

const CATEGORIES: { [key: string]: string[] } = {
  Music: ['Rock', 'Pop', 'Techno', 'Jazz', 'Classical', 'Folk', 'Hip Hop', 'Electronic'],
  Comedy: ['Stand-up', 'Improv'],
  Magic: ['Close-up', 'Stage'],
  Other: []
};

const INITIAL_FORM_STATE = {
  title: '',
  description: '',
  start_time: '',
  end_time: '',
  location: {
    place_name: '',
    latitude: 0,
    longitude: 0
  },
  status: 'upcoming' as const,
  category: '',
  subcategory: '',
  event_type: 'solo_performance' as 'solo_performance' | 'open_mic' | 'venue_booking',
  max_performers: 1,
  accepting_requests: false
};

const EVENT_TYPES = [
  {
    id: 'solo_performance',
    label: 'Solo Performance',
    description: 'You\'re performing alone or with your group',
    icon: '🎤'
  },
  {
    id: 'open_mic',
    label: 'Open Mic',
    description: 'Host an open mic where artists can request to join',
    icon: '🎪'
  },
  {
    id: 'venue_booking',
    label: 'Venue Looking for Artists',
    description: 'Your venue is seeking performers for this event',
    icon: '🏢'
  }
];

export function CreateEvent() {
  const navigate = useNavigate();
  const location = useLocation();
  const profileId = new URLSearchParams(location.search).get('profile');
  
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<Collaborator[]>([]);
  
  // Date/time modal state
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  const [tempStartTime, setTempStartTime] = useState('12:00');
  const [tempEndTime, setTempEndTime] = useState('13:00');
  
  // Performer invites for open mic/venue booking
  const [performerSearchTerm, setPerformerSearchTerm] = useState('');
  const [performerSearchResults, setPerformerSearchResults] = useState<Profile[]>([]);
  const [selectedPerformers, setSelectedPerformers] = useState<PerformerInvite[]>([]);
  const [isSearchingPerformers, setIsSearchingPerformers] = useState(false);

  // Initialize temp dates from form when opening modal
  const openDateModal = () => {
    if (form.start_time) {
      const [date, time] = form.start_time.split('T');
      setTempStartDate(new Date(date));
      setTempStartTime(time || '12:00');
    } else {
      setTempStartDate(null);
      setTempStartTime('12:00');
    }
    if (form.end_time) {
      const [date, time] = form.end_time.split('T');
      setTempEndDate(new Date(date));
      setTempEndTime(time || '13:00');
    } else {
      setTempEndDate(null);
      setTempEndTime('13:00');
    }
    setShowDateModal(true);
  };

  const applyDateSelection = () => {
    if (tempStartDate && tempEndDate) {
      const startDateStr = tempStartDate.toISOString().split('T')[0];
      const endDateStr = tempEndDate.toISOString().split('T')[0];
      setForm(prev => ({
        ...prev,
        start_time: `${startDateStr}T${tempStartTime}`,
        end_time: `${endDateStr}T${tempEndTime}`
      }));
      setShowDateModal(false);
    }
  };

  if (!profileId) {
    return (
      <div className="max-w-xl mx-auto my-10 px-5 py-5 bg-white dark:bg-secondary rounded-lg shadow-md">
        <h2 className="text-red-500 mb-5 text-xl font-bold">Error</h2>
        <p className="text-gray-900 dark:text-white mb-5">No profile selected. Please select a profile first.</p>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="mt-5 px-4 py-2 bg-primary text-white rounded hover:bg-accent transition-colors">
          Go to Dashboard
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validate dates are set
      if (!form.start_time || !form.end_time) {
        throw new Error('Please select start and end dates');
      }

      // Validate dates
      const startTime = new Date(form.start_time);
      const endTime = new Date(form.end_time);
      
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        throw new Error('Invalid date format');
      }
      
      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }

      const eventPayload = {
        ...form,
        // Flatten location fields to match database schema
        latitude: form.location.latitude,
        longitude: form.location.longitude,
        place_name: form.location.place_name,
        // Remove the nested location object
        location: undefined,
        profile_id: profileId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        event_type: form.event_type,
        max_performers: form.event_type === 'solo_performance' ? 1 : form.max_performers,
        accepting_requests: form.event_type !== 'solo_performance' && form.accepting_requests
      };

      const event = await eventService.createEvent(eventPayload);

      if (selectedCollaborators.length > 0) {
        await Promise.all(
          selectedCollaborators.map(({ profile }) =>
            eventService.inviteCollaborator(event.id, profile.id)
          )
        );
      }

      // Send performer invites for open mic/venue booking (silently fail if table doesn't exist)
      if (selectedPerformers.length > 0 && profileId) {
        try {
          await Promise.all(
            selectedPerformers.map(({ profile, message }) =>
              eventService.createEventInvite(event.id, profile.id, profileId, message)
            )
          );
        } catch (inviteErr) {
          console.warn('Could not send performer invites (table may not exist):', inviteErr);
        }
      }

      navigate(`/event/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchCollaborators = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', profileId)
        .ilike('name', `%${term}%`)
        .limit(5);

      setSearchResults(profiles || []);
    } catch (err) {
      console.error('Error searching profiles:', err);
    }
  };

  const addCollaborator = (profile: Profile) => {
    if (!selectedCollaborators.some(c => c.profile.id === profile.id)) {
      setSelectedCollaborators(prev => [...prev, { profile }]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeCollaborator = (profileId: string) => {
    setSelectedCollaborators(prev =>
      prev.filter(c => c.profile.id !== profileId)
    );
  };

  // Performer invite functions for open mic/venue booking
  const handleSearchPerformers = async (term: string) => {
    setPerformerSearchTerm(term);
    if (term.length < 2) {
      setPerformerSearchResults([]);
      return;
    }

    setIsSearchingPerformers(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, role, bio, performance_type, genres')
        .neq('id', profileId)
        .eq('role', 'busker')
        .or(`name.ilike.%${term}%,stage_name.ilike.%${term}%`)
        .limit(8);

      // Filter out already selected performers
      const selectedIds = new Set(selectedPerformers.map(p => p.profile.id));
      setPerformerSearchResults((profiles || []).filter(p => !selectedIds.has(p.id)));
    } catch (err) {
      console.error('Error searching performers:', err);
    } finally {
      setIsSearchingPerformers(false);
    }
  };

  const addPerformer = (profile: Profile) => {
    if (!selectedPerformers.some(p => p.profile.id === profile.id)) {
      setSelectedPerformers(prev => [...prev, { profile }]);
    }
    setPerformerSearchTerm('');
    setPerformerSearchResults([]);
  };

  const removePerformer = (profileId: string) => {
    setSelectedPerformers(prev =>
      prev.filter(p => p.profile.id !== profileId)
    );
  };

  return (
    <div className="max-w-2xl mx-auto my-4 sm:my-10 px-4 sm:px-5 py-4 sm:py-5 bg-white dark:bg-github-card rounded-lg shadow-md border dark:border-github-border">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-github-text mb-4 sm:mb-5">Create New Event</h2>

      {/* Date & Time Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDateModal(false)}>
          <div className="bg-light-card dark:bg-github-card rounded-2xl shadow-2xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-light-text dark:text-github-text mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Select Date & Time
            </h3>
            
            {/* Selected dates display */}
            <div className="mb-4 p-3 bg-light-bg dark:bg-github-bg rounded-lg">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex-1">
                  <div className="text-xs text-light-text-muted dark:text-github-text-muted uppercase mb-1">Start</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-semibold text-light-text dark:text-github-text">
                      {tempStartDate 
                        ? `${tempStartDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${tempStartTime}`
                        : 'Not set'}
                    </span>
                  </div>
                </div>
                <div className="text-light-text-muted dark:text-github-text-muted">→</div>
                <div className="flex-1">
                  <div className="text-xs text-light-text-muted dark:text-github-text-muted uppercase mb-1">End</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="font-semibold text-light-text dark:text-github-text">
                      {tempEndDate 
                        ? `${tempEndDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${tempEndTime}`
                        : 'Not set'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Calendar */}
            <div className="flex justify-center mb-4">
              <DatePicker
                selected={tempStartDate}
                onChange={(dates) => {
                  const [start, end] = dates as [Date | null, Date | null];
                  setTempStartDate(start);
                  setTempEndDate(end);
                }}
                startDate={tempStartDate}
                endDate={tempEndDate}
                selectsRange
                inline
                minDate={new Date()}
                monthsShown={1}
                calendarClassName="!bg-light-bg dark:!bg-github-bg !border-light-border dark:!border-github-border"
              />
            </div>

            {/* Time selectors */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-light-text-secondary dark:text-github-text-secondary mb-1.5">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Start Time
                </label>
                <input
                  type="time"
                  value={tempStartTime}
                  onChange={e => setTempStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-github-border bg-light-bg dark:bg-github-bg text-light-text dark:text-github-text"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-light-text-secondary dark:text-github-text-secondary mb-1.5">
                  <Clock className="w-3 h-3 inline mr-1" />
                  End Time
                </label>
                <input
                  type="time"
                  value={tempEndTime}
                  onChange={e => setTempEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-github-border bg-light-bg dark:bg-github-bg text-light-text dark:text-github-text"
                />
              </div>
            </div>

            <p className="text-xs text-light-text-secondary dark:text-github-text-secondary mb-4 text-center">
              {!tempStartDate 
                ? 'Select a start date on the calendar' 
                : !tempEndDate 
                  ? 'Now select an end date (or same date for single day event)'
                  : 'Dates selected! Adjust times above if needed.'}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDateModal(false)}
                className="flex-1 py-2.5 px-4 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg font-semibold text-light-text-secondary dark:text-github-text-secondary hover:border-light-blue dark:hover:border-github-blue transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyDateSelection}
                disabled={!tempStartDate || !tempEndDate}
                className="flex-1 py-2.5 px-4 bg-light-blue dark:bg-github-blue text-white rounded-lg font-semibold hover:bg-light-blue-dark dark:hover:bg-github-blue-dark transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded mb-5 border border-red-300 dark:border-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
        {/* Event Type Selection */}
        <div className="col-span-4 mb-4">
          <label className="block font-medium text-gray-900 dark:text-github-text mb-3">What type of event is this?</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {EVENT_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setForm(prev => ({ 
                  ...prev, 
                  event_type: type.id as typeof prev.event_type,
                  accepting_requests: type.id !== 'solo_performance',
                  max_performers: type.id === 'solo_performance' ? 1 : prev.max_performers
                }))}
                className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all touch-target ${
                  form.event_type === type.id
                    ? 'border-light-blue dark:border-github-blue bg-light-blue/10 dark:bg-github-blue/10'
                    : 'border-gray-200 dark:border-github-border hover:border-gray-300 dark:hover:border-github-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{type.icon}</span>
                  <span className={`text-sm sm:text-base font-semibold ${
                    form.event_type === type.id 
                      ? 'text-light-blue dark:text-github-blue' 
                      : 'text-gray-900 dark:text-github-text'
                  }`}>{type.label}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-github-text-secondary line-clamp-2">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Performer Slots - Only for open mic and venue booking */}
        {(form.event_type === 'open_mic' || form.event_type === 'venue_booking') && (
          <>
            <div className="col-span-1 flex items-center">
              <label className="font-medium text-gray-900 dark:text-github-text">
                {form.event_type === 'open_mic' ? 'Open Slots' : 'Artists Needed'}
              </label>
            </div>
            <div className="col-span-3">
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={form.max_performers}
                  onChange={e => setForm(prev => ({ ...prev, max_performers: parseInt(e.target.value) || 1 }))}
                  className="w-24 px-3 py-2 rounded border border-gray-300 dark:border-github-border bg-white dark:bg-github-bg text-gray-900 dark:text-github-text text-center"
                />
                <span className="text-sm text-gray-600 dark:text-github-text-secondary">
                  {form.event_type === 'open_mic' 
                    ? 'performers can request to join this open mic'
                    : 'artists you\'re looking to book for this event'
                  }
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="accepting_requests"
                  checked={form.accepting_requests}
                  onChange={e => setForm(prev => ({ ...prev, accepting_requests: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 dark:border-github-border text-light-blue dark:text-github-blue focus:ring-light-blue dark:focus:ring-github-blue"
                />
                <label htmlFor="accepting_requests" className="text-sm text-gray-700 dark:text-github-text-secondary">
                  Accept performer requests (artists can apply to join this event)
                </label>
              </div>
            </div>
          </>
        )}

        {/* Title */}
        <div className="col-span-1 flex items-center">
          <label className="font-medium text-gray-900 dark:text-github-text">Title</label>
        </div>
        <div className="col-span-3">
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-2 py-2 rounded border border-gray-300 dark:border-github-border bg-white dark:bg-github-bg text-gray-900 dark:text-github-text placeholder-gray-500 dark:placeholder-github-placeholder"
            required
          />
        </div>

        {/* Description */}
        <div className="col-span-1 flex items-start pt-2">
          <label className="font-medium text-gray-900 dark:text-github-text">Description</label>
        </div>
        <div className="col-span-3">
          <textarea
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-2 py-2 rounded border border-gray-300 dark:border-github-border bg-white dark:bg-github-bg text-gray-900 dark:text-github-text placeholder-gray-500 dark:placeholder-github-placeholder min-h-24"
            required
          />
        </div>

        {/* Event Timeline */}
        <div className="col-span-1 flex items-start pt-2">
          <label className="font-medium text-gray-900 dark:text-github-text">When</label>
        </div>
        <div className="col-span-3">
          <button
            type="button"
            onClick={openDateModal}
            className="w-full p-3 sm:p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-github-border hover:border-light-blue dark:hover:border-github-blue bg-light-bg/50 dark:bg-github-bg/50 transition-all group touch-target"
          >
            {form.start_time && form.end_time ? (
              <div className="flex items-center gap-4">
                {/* Timeline visualization */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                  <div className="w-0.5 h-8 bg-gradient-to-b from-green-500 to-red-500"></div>
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                </div>
                
                {/* Date info */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase">Start</span>
                    <span className="text-sm font-semibold text-light-text dark:text-github-text">
                      {new Date(form.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-sm text-light-text-secondary dark:text-github-text-secondary">
                      at {form.start_time.split('T')[1]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">End</span>
                    <span className="text-sm font-semibold text-light-text dark:text-github-text">
                      {new Date(form.end_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-sm text-light-text-secondary dark:text-github-text-secondary">
                      at {form.end_time.split('T')[1]}
                    </span>
                  </div>
                </div>
                
                <Calendar className="w-5 h-5 text-light-text-muted dark:text-github-text-muted group-hover:text-light-blue dark:group-hover:text-github-blue transition-colors" />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 py-2 text-light-text-secondary dark:text-github-text-secondary group-hover:text-light-blue dark:group-hover:text-github-blue transition-colors">
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Click to set date & time</span>
              </div>
            )}
          </button>
        </div>

        {/* Location */}
        <div className="col-span-1 flex items-start pt-2">
          <label className="font-medium text-gray-900 dark:text-github-text">Location</label>
        </div>
        <div className="col-span-3">
          <LocationSearchMap
            onLocationSelect={(location) => {
              setForm(prev => ({
                ...prev,
                location: {
                  ...prev.location,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  place_name: location.place_name || prev.location.place_name
                }
              }));
            }}
            onPlaceNameChange={(placeName) => {
              setForm(prev => ({
                ...prev,
                location: { ...prev.location, place_name: placeName }
              }));
            }}
            placeName={form.location.place_name}
            initialLocation={form.location.latitude !== 0 ? {
              latitude: form.location.latitude,
              longitude: form.location.longitude
            } : undefined}
          />
          {form.location.latitude !== 0 && (
            <p className="mt-2 text-sm text-gray-600 dark:text-github-text-secondary">
              📍 {form.location.latitude.toFixed(6)}, {form.location.longitude.toFixed(6)}
            </p>
          )}
        </div>

        {/* Category & Subcategory */}
        <div className="col-span-1 flex items-start pt-2">
          <label className="font-medium text-gray-900 dark:text-github-text">Category</label>
        </div>
        <div className="col-span-3">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1 font-medium text-gray-900 dark:text-github-text text-left">Category</label>
            <select
              value={form.category}
              onChange={e => setForm(prev => ({ ...prev, category: e.target.value, subcategory: '' }))}
              className="w-full px-2 py-2 rounded border border-gray-300 dark:border-github-border bg-white dark:bg-github-bg text-gray-900 dark:text-github-text"
              required
            >
              <option value="" disabled className="dark:bg-github-bg">Select a category</option>
              {Object.keys(CATEGORIES).map(cat => (
                <option key={cat} value={cat} className="dark:bg-github-bg">{cat}</option>
              ))}
            </select>
          </div>

          {form.category && CATEGORIES[form.category]?.length > 0 && (
            <div className="flex-1">
              <label className="block mb-1 font-medium text-gray-900 dark:text-white">Subcategory</label>
              <select
                value={form.subcategory}
                onChange={e => setForm(prev => ({ ...prev, subcategory: e.target.value }))}
                className="w-full px-2 py-2 rounded border border-gray-300 dark:border-github-border bg-white dark:bg-github-bg text-gray-900 dark:text-github-text"
                required
              >
                <option value="" disabled className="dark:bg-github-bg">Select a subcategory</option>
                {CATEGORIES[form.category].map(subcat => (
                  <option key={subcat} value={subcat} className="dark:bg-github-bg">{subcat}</option>
                ))}
              </select>
            </div>
          )}
          </div>
        </div>

        {/* Collaborators - Only for solo performances */}
        {form.event_type === 'solo_performance' && (
          <>
            <div className="col-span-1 flex items-start pt-2">
              <label className="font-medium text-gray-900 dark:text-github-text">Collaborators</label>
            </div>
            <div className="col-span-3">
              <input
                type="text"
                value={searchTerm}
                onChange={e => handleSearchCollaborators(e.target.value)}
                placeholder="Search for artists or bands"
                className="w-full px-2 py-2 rounded border border-gray-300 dark:border-github-border bg-white dark:bg-github-bg text-gray-900 dark:text-github-text placeholder-gray-500 dark:placeholder-github-placeholder"
              />
              
              {searchResults.length > 0 && (
                <div className="mt-1 border border-gray-300 dark:border-github-border rounded-lg max-h-52 overflow-y-auto dark:bg-github-card">
                  {searchResults.map(profile => (
                    <div
                      key={profile.id}
                      onClick={() => addCollaborator(profile)}
                      className="px-2 py-2 cursor-pointer border-b border-gray-200 dark:border-github-border bg-white dark:bg-github-bg hover:bg-gray-100 dark:hover:bg-github-card transition-colors"
                    >
                      <div className="font-bold dark:text-github-text">{profile.name}</div>
                      <div className="text-sm text-gray-600 dark:text-github-text-secondary flex items-center gap-1">
                        <span className="text-white">{profile.profile_type === 'band' ? '🎸' : '🎤'}</span>
                        <span>{profile.profile_type === 'band' ? 'Band' : 'Artist'}</span>
                      </div>
                    </div>
              ))}
            </div>
          )}

          {selectedCollaborators.length > 0 && (
            <div className="mt-3">
              <h4 className="dark:text-github-text">Selected Collaborators:</h4>
              {selectedCollaborators.map(({ profile }) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between px-2 py-2 bg-gray-100 dark:bg-github-bg rounded-lg mt-1"
                >
                  <span className="dark:text-github-text">{profile.name}</span>
                  <button
                    type="button"
                    onClick={() => removeCollaborator(profile.id)}
                    className="px-2 py-1 bg-red-500 dark:bg-red-600 text-white rounded cursor-pointer hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
            </div>
          </>
        )}

        {/* Invite Performers - Only for open mic and venue booking */}
        {(form.event_type === 'open_mic' || form.event_type === 'venue_booking') && (
          <>
            <div className="col-span-1 flex items-start pt-2">
              <label className="font-medium text-gray-900 dark:text-github-text flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Invite Artists
              </label>
            </div>
            <div className="col-span-3">
              <p className="text-xs text-gray-600 dark:text-github-text-secondary mb-2">
                Directly invite performers to your event. They'll receive an invitation they can accept or decline.
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={performerSearchTerm}
                  onChange={e => handleSearchPerformers(e.target.value)}
                  placeholder="Search for buskers by name..."
                  className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-github-border bg-white dark:bg-github-bg text-gray-900 dark:text-github-text placeholder-gray-500 dark:placeholder-github-placeholder"
                />
                {isSearchingPerformers && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              
              {performerSearchResults.length > 0 && (
                <div className="mt-1 border border-gray-300 dark:border-github-border rounded-lg max-h-60 overflow-y-auto dark:bg-github-card">
                  {performerSearchResults.map(profile => (
                    <div
                      key={profile.id}
                      onClick={() => addPerformer(profile)}
                      className="px-3 py-2 cursor-pointer border-b border-gray-200 dark:border-github-border bg-white dark:bg-github-bg hover:bg-gray-100 dark:hover:bg-github-card transition-colors flex items-center gap-3"
                    >
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-github-border flex items-center justify-center">
                          <Users className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold dark:text-github-text truncate">{profile.name}</div>
                        <div className="text-xs text-gray-500 dark:text-github-text-secondary flex items-center gap-1">
                          {profile.performance_type && <span className="capitalize">{profile.performance_type}</span>}
                          {profile.genres && profile.genres.length > 0 && (
                            <span className="truncate">• {profile.genres.slice(0, 2).join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <UserPlus className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {selectedPerformers.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium dark:text-github-text mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Invited Performers ({selectedPerformers.length}):
                  </h4>
                  <div className="space-y-2">
                    {selectedPerformers.map(({ profile }) => (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-github-blue/10 border border-blue-200 dark:border-github-blue/30 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-github-border flex items-center justify-center">
                              <Users className="w-3 h-3 text-gray-500" />
                            </div>
                          )}
                          <span className="text-sm font-medium dark:text-github-text">{profile.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePerformer(profile.id)}
                          className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Buttons */}
        <div className="col-span-4">
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-4 py-3 bg-gray-100 dark:bg-github-border text-gray-800 dark:text-github-text rounded-lg hover:bg-gray-200 dark:hover:bg-github-border dark:hover:brightness-125 transition-colors touch-target"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:flex-1 px-4 py-3 bg-blue-500 dark:bg-github-blue text-white rounded-lg hover:bg-blue-600 dark:hover:bg-github-blue-dark disabled:opacity-70 disabled:cursor-not-allowed transition-colors touch-target"
            >
              {isLoading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
