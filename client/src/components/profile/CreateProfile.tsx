import { useState } from 'react';
import { profileService } from '../../services/profileService';

type ProfileRole = 'eventmaker' | 'busker' | 'viewer';
type ProfileType = 'individual' | 'band';
type PerformanceType = 'music' | 'comedy' | 'magic' | 'art' | 'other';

const INITIAL_FORM_STATE = {
  role: '' as ProfileRole | '',
  name: '',
  bio: '',
  profile_type: 'individual' as ProfileType,
  performance_type: 'music' as PerformanceType,
  genres: [] as string[],
  instruments: [] as string[],
  avatar_url: '',
  location: '',
  organization_name: '',
  contact_info: '',
  event_types: [] as string[],
  social_links: {
    instagram: '',
    youtube: '',
    spotify: '',
    website: ''
  },
  // Member info for owner
  owner_alias: '',
  owner_specialty: '',
  owner_description: ''
};

import { useNavigate } from 'react-router-dom';

export function CreateProfile() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleRoleSelect = (role: ProfileRole) => {
    setForm(prev => ({ ...prev, role }));
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!form.role || !form.name) {
        throw new Error('Role and name are required');
      }

      // Create the profile with role
      const profile = await profileService.createProfile({
        role: form.role,
        name: form.name,
        bio: form.bio,
        profile_type: form.profile_type,
        performance_type: form.performance_type,
        genres: form.genres.filter(Boolean),
        instruments: form.instruments.filter(Boolean),
        location: form.location,
        organization_name: form.organization_name,
        contact_info: form.contact_info,
        event_types: form.event_types.filter(Boolean),
        social_links: form.social_links,
        owner_alias: form.owner_alias || undefined,
        owner_specialty: form.owner_specialty || undefined,
        owner_description: form.owner_description || undefined
      });

      // If we have an avatar that was uploaded with a temporary ID,
      // we need to re-upload it with the correct profile ID
      if (form.avatar_url && profile.id) {
        const avatarFile = await fetch(form.avatar_url).then(res => res.blob());
        const newAvatarUrl = await profileService.uploadAvatar(
          new File([avatarFile], 'avatar.jpg', { type: 'image/jpeg' }), 
          profile.id
        );
        await profileService.updateProfile(profile.id, { avatar_url: newAvatarUrl });
      }

      // After successful profile creation, navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenreChange = (index: number, value: string) => {
    const newGenres = [...form.genres];
    newGenres[index] = value;
    setForm(prev => ({ ...prev, genres: newGenres }));
  };

  const addGenre = () => {
    setForm(prev => ({ ...prev, genres: [...prev.genres, ''] }));
  };

  const removeGenre = (index: number) => {
    setForm(prev => ({ ...prev, genres: prev.genres.filter((_, i) => i !== index) }));
  };

  const handleInstrumentChange = (index: number, value: string) => {
    const newInstruments = [...form.instruments];
    newInstruments[index] = value;
    setForm(prev => ({ ...prev, instruments: newInstruments }));
  };

  const addInstrument = () => {
    setForm(prev => ({ ...prev, instruments: [...prev.instruments, ''] }));
  };

  const removeInstrument = (index: number) => {
    setForm(prev => ({ ...prev, instruments: prev.instruments.filter((_, i) => i !== index) }));
  };

  const handleEventTypeChange = (index: number, value: string) => {
    const newEventTypes = [...form.event_types];
    newEventTypes[index] = value;
    setForm(prev => ({ ...prev, event_types: newEventTypes }));
  };

  const addEventType = () => {
    setForm(prev => ({ ...prev, event_types: [...prev.event_types, ''] }));
  };

  const removeEventType = (index: number) => {
    setForm(prev => ({ ...prev, event_types: prev.event_types.filter((_, i) => i !== index) }));
  };

  // Step 1: Role Selection
  if (step === 'role') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-github-bg to-github-card">
        <div className="w-full max-w-2xl bg-github-card border border-github-border rounded-lg p-8 shadow-xl">
          <h1 className="text-3xl font-bold text-github-text mb-2">Create Your Profile</h1>
          <p className="text-github-text-secondary mb-8">What's your role on GoBusker?</p>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Eventmaker */}
            <button
              onClick={() => handleRoleSelect('eventmaker')}
              className="p-4 sm:p-6 border-2 border-github-border rounded-lg hover:border-github-blue transition text-left hover:bg-github-bg/50 touch-target"
            >
              <div className="text-2xl sm:text-3xl mb-2">📋</div>
              <h3 className="text-lg sm:text-xl font-bold text-github-text">Eventmaker</h3>
              <p className="text-github-text-secondary text-sm mt-2">Organize and host events</p>
            </button>

            {/* Busker */}
            <button
              onClick={() => handleRoleSelect('busker')}
              className="p-4 sm:p-6 border-2 border-github-border rounded-lg hover:border-github-blue transition text-left hover:bg-github-bg/50 touch-target"
            >
              <div className="text-2xl sm:text-3xl mb-2">🎵</div>
              <h3 className="text-lg sm:text-xl font-bold text-github-text">Busker</h3>
              <p className="text-github-text-secondary text-sm mt-2">Musician, performer, artist</p>
            </button>

            {/* Viewer */}
            <button
              onClick={() => handleRoleSelect('viewer')}
              className="p-4 sm:p-6 border-2 border-github-border rounded-lg hover:border-github-blue transition text-left hover:bg-github-bg/50 touch-target"
            >
              <div className="text-2xl sm:text-3xl mb-2">👁️</div>
              <h3 className="text-lg sm:text-xl font-bold text-github-text">Viewer</h3>
              <p className="text-github-text-secondary text-sm mt-2">Browse and enjoy events</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Details Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-github-bg to-github-card p-4">
      <div className="max-w-3xl mx-auto bg-github-card border border-github-border rounded-lg p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-github-text">Create Your Profile</h2>
            <p className="text-github-text-secondary text-sm mt-1 capitalize">Step 2: {form.role} details</p>
          </div>
          <button
            onClick={() => {
              setStep('role');
              setForm(prev => ({ ...prev, role: '' as ProfileRole | '' }));
            }}
            className="text-github-text-secondary hover:text-github-text text-sm sm:text-base touch-target px-3 py-2 -mx-3 -my-2 rounded-lg hover:bg-github-bg transition-colors"
          >
            ← Change Role
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Common Fields for All Roles */}
          <div>
            <label className="block text-sm font-medium text-github-text mb-2">
              Profile Picture
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setIsLoading(true);
                  try {
                    const url = await profileService.uploadAvatar(file, 'temp');
                    setForm(prev => ({ ...prev, avatar_url: url }));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to upload avatar');
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              className="block w-full px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue"
            />
            {form.avatar_url && (
              <img 
                src={form.avatar_url} 
                alt="Profile preview" 
                className="w-24 h-24 rounded-full object-cover mt-4"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-github-text mb-2">
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="block w-full px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue"
              required
            />
          </div>

          {/* Viewer Role */}
          {form.role === 'viewer' && (
            <div>
              <label className="block text-sm font-medium text-github-text mb-2">
                Location
              </label>
              <input
                type="text"
                value={form.location}
                onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="City, Country"
                className="block w-full px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue"
              />
            </div>
          )}

          {/* Eventmaker Role */}
          {form.role === 'eventmaker' && (
            <>
              <div>
                <label className="block text-sm font-medium text-github-text mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={form.organization_name}
                  onChange={e => setForm(prev => ({ ...prev, organization_name: e.target.value }))}
                  placeholder="Your organization name"
                  className="block w-full px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-github-text mb-2">
                  Contact Info
                </label>
                <input
                  type="text"
                  value={form.contact_info}
                  onChange={e => setForm(prev => ({ ...prev, contact_info: e.target.value }))}
                  placeholder="Email or phone number"
                  className="block w-full px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-github-text mb-2">
                  Event Types You Host
                </label>
                {form.event_types.map((eventType, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 mb-2">
                    <input
                      type="text"
                      value={eventType}
                      onChange={e => handleEventTypeChange(index, e.target.value)}
                      placeholder="e.g., Concerts, Street Festivals, Open Mics"
                      className="flex-1 px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue"
                    />
                    {form.event_types.length > 0 && (
                      <button
                        type="button"
                        onClick={() => removeEventType(index)}
                        className="px-3 py-2 bg-red-900/20 border border-red-700 rounded-lg text-red-300 hover:bg-red-900/40 touch-target text-sm sm:text-base whitespace-nowrap"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addEventType}
                  className="px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text hover:border-github-blue transition"
                >
                  + Add Event Type
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-github-text mb-2">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about your organization..."
                  className="block w-full px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue min-h-24"
                />
              </div>
            </>
          )}

          {/* Busker Role */}
          {form.role === 'busker' && (
            <>
              <div>
                <label className="block text-sm font-medium text-github-text mb-2">
                  Performance Type *
                </label>
                <select
                  value={form.performance_type}
                  onChange={e => setForm(prev => ({ ...prev, performance_type: e.target.value as PerformanceType }))}
                  className="block w-full px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text focus:outline-none focus:border-github-blue"
                  required
                >
                  <option value="music">🎵 Music</option>
                  <option value="comedy">🎭 Comedy</option>
                  <option value="magic">✨ Magic</option>
                  <option value="art">🎨 Art</option>
                  <option value="other">🎪 Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-github-text mb-2">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself and your performances..."
                  className="block w-full px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue min-h-24"
                />
              </div>
              {/* Member Info Section */}
              <div className="space-y-4 p-4 bg-github-bg rounded-lg border border-github-border">
                <h3 className="text-md font-semibold text-github-text">Your Public Band Member Info</h3>
                <p className="text-xs text-github-text-secondary mb-2">
                  This will be visible to viewers in the Band Members section
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-github-text mb-2">
                    Alias / Stage Name
                  </label>
                  <input
                    type="text"
                    value={form.owner_alias}
                    onChange={e => setForm(prev => ({ ...prev, owner_alias: e.target.value }))}
                    placeholder="How you'd like to be displayed"
                    className="block w-full px-4 py-2 bg-github-card border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-github-text mb-2">
                    Specialty / Instrument
                  </label>
                  <input
                    type="text"
                    value={form.owner_specialty}
                    onChange={e => setForm(prev => ({ ...prev, owner_specialty: e.target.value }))}
                    placeholder="e.g., Guitarist, Vocalist, DJ, etc."
                    className="block w-full px-4 py-2 bg-github-card border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-github-text mb-2">
                    Short Description
                  </label>
                  <textarea
                    value={form.owner_description}
                    onChange={e => setForm(prev => ({ ...prev, owner_description: e.target.value }))}
                    placeholder="Tell viewers a bit about yourself"
                    rows={3}
                    className="block w-full px-4 py-2 bg-github-card border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue resize-none"
                  />
                </div>
              </div>

              {form.performance_type === 'music' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-github-text mb-2">
                      Genres
                    </label>
                    {form.genres.map((genre, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-2 mb-2">
                        <input
                          type="text"
                          value={genre}
                          onChange={e => handleGenreChange(index, e.target.value)}
                          placeholder="e.g., Jazz, Rock, Hip-Hop"
                          className="flex-1 px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue"
                        />
                        {form.genres.length > 0 && (
                          <button
                            type="button"
                            onClick={() => removeGenre(index)}
                            className="px-3 py-2 bg-red-900/20 border border-red-700 rounded-lg text-red-300 hover:bg-red-900/40 touch-target text-sm sm:text-base whitespace-nowrap"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addGenre}
                      className="px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text hover:border-github-blue transition"
                    >
                      + Add Genre
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-github-text mb-2">
                      Instruments
                    </label>
                    {form.instruments.map((instrument, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-2 mb-2">
                        <input
                          type="text"
                          value={instrument}
                          onChange={e => handleInstrumentChange(index, e.target.value)}
                          placeholder="e.g., Guitar, Piano, Drums"
                          className="flex-1 px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue"
                        />
                        {form.instruments.length > 0 && (
                          <button
                            type="button"
                            onClick={() => removeInstrument(index)}
                            className="px-3 py-2 bg-red-900/20 border border-red-700 rounded-lg text-red-300 hover:bg-red-900/40 touch-target text-sm sm:text-base whitespace-nowrap"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addInstrument}
                      className="px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text hover:border-github-blue transition"
                    >
                      + Add Instrument
                    </button>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-github-text mb-2">
                  Social Links
                </label>
                <input
                  type="text"
                  value={form.social_links.instagram}
                  onChange={e => setForm(prev => ({ 
                    ...prev, 
                    social_links: { ...prev.social_links, instagram: e.target.value }
                  }))}
                  placeholder="Instagram URL"
                  className="block w-full px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue mb-2"
                />
                <input
                  type="text"
                  value={form.social_links.youtube}
                  onChange={e => setForm(prev => ({ 
                    ...prev, 
                    social_links: { ...prev.social_links, youtube: e.target.value }
                  }))}
                  placeholder="YouTube URL"
                  className="block w-full px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue mb-2"
                />
                <input
                  type="text"
                  value={form.social_links.spotify}
                  onChange={e => setForm(prev => ({ 
                    ...prev, 
                    social_links: { ...prev.social_links, spotify: e.target.value }
                  }))}
                  placeholder="Spotify URL"
                  className="block w-full px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue mb-2"
                />
                <input
                  type="text"
                  value={form.social_links.website}
                  onChange={e => setForm(prev => ({ 
                    ...prev, 
                    social_links: { ...prev.social_links, website: e.target.value }
                  }))}
                  placeholder="Website URL"
                  className="block w-full px-4 py-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder-github-placeholder focus:outline-none focus:border-github-blue"
                />
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-3 bg-github-blue hover:bg-github-blue-dark disabled:opacity-50 text-github-text font-semibold rounded-lg transition"
          >
            {isLoading ? 'Creating Profile...' : 'Create Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}