import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { eventService } from '../../services/eventService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/useAuth';
import type { Profile } from '../../types/models';
import { LocationSelectMap } from '../map/LocationSelectMap';

interface Collaborator {
  profile: Profile;
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
  subcategory: ''
};

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

  const { user } = useAuth();

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
      // Validate dates
      const startTime = new Date(form.start_time);
      const endTime = new Date(form.end_time);
      
      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }

      const eventPayload = {
        ...form,
        profile_id: profileId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      };

      const event = await eventService.createEvent(eventPayload);

      if (selectedCollaborators.length > 0) {
        await Promise.all(
          selectedCollaborators.map(({ profile }) =>
            eventService.inviteCollaborator(event.id, profile.id)
          )
        );
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

  return (
    <div className="max-w-2xl mx-auto my-10 px-5 py-5 bg-white dark:bg-secondary rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-5">Create New Event</h2>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded mb-5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-1 font-medium text-gray-900 dark:text-white">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium text-gray-900 dark:text-white">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-24"
            required
          />
        </div>

        <div className="mb-4 flex gap-4">
          <div className="flex-1">
            <label className="block mb-1 font-medium text-gray-900 dark:text-white">Start Time</label>
            <input
              type="datetime-local"
              value={form.start_time}
              onChange={e => setForm(prev => ({ ...prev, start_time: e.target.value }))}
              className="w-full px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div className="flex-1">
            <label className="block mb-1 font-medium text-gray-900 dark:text-white">End Time</label>
            <input
              type="datetime-local"
              value={form.end_time}
              onChange={e => setForm(prev => ({ ...prev, end_time: e.target.value }))}
              className="w-full px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium text-gray-900 dark:text-white">Location</label>
          <input
            type="text"
            value={form.location.place_name}
            onChange={e => setForm(prev => ({
              ...prev,
              location: { ...prev.location, place_name: e.target.value }
            }))}
            placeholder="Enter location name"
            className="w-full px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
          <LocationSelectMap
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
            initialLocation={form.location.latitude !== 0 ? {
              latitude: form.location.latitude,
              longitude: form.location.longitude
            } : undefined}
          />
          {form.location.latitude !== 0 && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Selected location: {form.location.latitude.toFixed(6)}, {form.location.longitude.toFixed(6)}
            </p>
          )}
        </div>

        <div className="mb-4 flex gap-4">
          <div className="flex-1">
            <label className="block mb-1 font-medium text-gray-900 dark:text-white">Category</label>
            <select
              value={form.category}
              onChange={e => setForm(prev => ({ ...prev, category: e.target.value, subcategory: '' }))}
              className="w-full px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="" disabled>Select a category</option>
              {Object.keys(CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {form.category && CATEGORIES[form.category]?.length > 0 && (
            <div className="flex-1">
              <label className="block mb-1 font-medium text-gray-900 dark:text-white">Subcategory</label>
              <select
                value={form.subcategory}
                onChange={e => setForm(prev => ({ ...prev, subcategory: e.target.value }))}
                className="w-full px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="" disabled>Select a subcategory</option>
                {CATEGORIES[form.category].map(subcat => (
                  <option key={subcat} value={subcat}>{subcat}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block mb-1">Collaborators</label>
          <input
            type="text"
            value={searchTerm}
            onChange={e => handleSearchCollaborators(e.target.value)}
            placeholder="Search for artists or bands"
            className="w-full px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          
          {searchResults.length > 0 && (
            <div className="mt-1 border border-gray-300 dark:border-gray-600 rounded-lg max-h-52 overflow-y-auto dark:bg-secondary">
              {searchResults.map(profile => (
                <div
                  key={profile.id}
                  onClick={() => addCollaborator(profile)}
                  className="px-2 py-2 cursor-pointer border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-secondary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="font-bold dark:text-white">{profile.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {profile.profile_type === 'band' ? '��� Band' : '��� Artist'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedCollaborators.length > 0 && (
            <div className="mt-3">
              <h4 className="dark:text-white">Selected Collaborators:</h4>
              {selectedCollaborators.map(({ profile }) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between px-2 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg mt-1"
                >
                  <span className="dark:text-white">{profile.name}</span>
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

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 px-3 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-[2] px-3 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
