import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import type { Profile } from '../../types/models';
import { profileService } from '../../services/profileService';
import { supabase } from '../../lib/supabase';
import { ProfileQRCode } from './ProfileQRCode';
import { TipWall } from './TipWall';
import { ProfileEvents } from './ProfileEvents';
import { BandMembersManager } from '../BandMembersManager';
import { ShoppingBag, Edit2, Save, X, Plus, ChevronLeft } from 'lucide-react';

export function ProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ bio: '', avatar_url: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'events' | 'members' | 'tips'>('about');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!id) return;
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }

        const data = await profileService.getProfile(id);
        setProfile(data);
        setEditForm({ bio: data.bio || '', avatar_url: data.avatar_url || '' });

        // Check if current user is owner
        if (user) {
          try {
            const { data: profileMember, error: memberError } = await supabase
              .from('profile_members')
              .select('role')
              .eq('profile_id', id)
              .eq('user_id', user.id)
              .single();

            if (profileMember && profileMember.role === 'owner') {
              setIsOwner(true);
            } else if (memberError) {
              console.log('Member query error:', memberError);
              // If no member record, check if this is the profile owner by user_id
              const profileData = await profileService.getProfile(id);
              if (profileData.user_id === user.id) {
                setIsOwner(true);
              }
            }
          } catch (err) {
            console.error('Error checking owner status:', err);
            // Fallback: check if this user created the profile
            const profileData = await profileService.getProfile(id);
            if (profileData.user_id === user.id) {
              setIsOwner(true);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [id]);

  const handleSaveProfile = async () => {
    if (!id || !profile) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      await profileService.updateProfile(id, {
        bio: editForm.bio,
        avatar_url: editForm.avatar_url
      });
      
      setProfile({ ...profile, bio: editForm.bio, avatar_url: editForm.avatar_url });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!id) return;
    
    setIsSaving(true);
    try {
      const url = await profileService.uploadAvatar(file, id);
      setEditForm(prev => ({ ...prev, avatar_url: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-github-bg to-github-card flex items-center justify-center">
        <div className="text-github-text-secondary text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-light-bg to-light-card dark:from-github-bg dark:to-github-card p-4">
        <div className="max-w-2xl mx-auto bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg p-8">
          <h2 className="text-2xl font-bold text-light-text dark:text-github-text mb-4">Error</h2>
          <p className="text-red-600 dark:text-red-400 mb-6">{error || 'Profile not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-light-blue dark:bg-github-blue hover:bg-light-blue-dark dark:hover:bg-github-blue-dark text-white dark:text-github-text font-semibold rounded-lg transition-all duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-bg to-light-card dark:from-github-bg dark:to-github-card p-4">
      {/* Back Button - Fixed to the left */}
      <div className="max-w-5xl mx-auto relative">
        <button
          onClick={() => {
            const state = location.state as { 
              returnToEvent?: string; 
              returnPath?: string;
              searchContext?: any;
            } | null;
            
            if (state?.returnToEvent && state?.returnPath) {
              // Navigate back to the landing page with the event and search context in state
              navigate(state.returnPath, { 
                state: { 
                  returnToEvent: state.returnToEvent,
                  searchContext: state.searchContext
                } 
              });
            } else {
              navigate('/dashboard');
            }
          }}
          className="absolute -left-16 top-0 p-2 rounded-lg hover:bg-light-bg dark:hover:bg-github-bg text-light-text-secondary dark:text-github-text-secondary hover:text-light-text dark:hover:text-github-text transition-all duration-200"
          title="Back"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Header Card - Fixed at top */}
        <div className="bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg p-6 mb-6 shadow-xl">
          <div className="flex items-center justify-between">
            {/* Avatar and Name */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img 
                  src={isEditing ? editForm.avatar_url || 'https://via.placeholder.com/150/2d3748/e2e8f0?text=No+Image' : profile.avatar_url || 'https://via.placeholder.com/150/2d3748/e2e8f0?text=No+Image'}
                  alt={`${profile.name}'s avatar`}
                  className="w-20 h-20 rounded-full object-cover border-4 border-light-border dark:border-github-border shadow-lg bg-light-bg dark:bg-github-bg"
                />
                {isEditing && isOwner && (
                  <label className="absolute bottom-0 right-0 p-1.5 bg-light-blue dark:bg-github-blue rounded-full cursor-pointer hover:bg-light-blue-dark dark:hover:bg-github-blue-dark transition-colors shadow-lg">
                    <Edit2 size={12} className="text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarUpload(file);
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="flex-1 max-w-2xl">
                <h1 className="text-3xl font-bold text-light-text dark:text-github-text mb-2">{profile.name}</h1>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <span className="px-3 py-1 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-full text-xs font-semibold text-light-text-secondary dark:text-github-text-secondary capitalize">
                    {profile.role === 'busker' ? '🎵 Busker' : profile.role === 'eventmaker' ? '📋 Event Maker' : '👁️ Viewer'}
                  </span>
                  {profile.role !== 'viewer' && profile.saldo !== undefined && profile.saldo > 0 && (
                    <span className="px-3 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-full text-xs font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                      <span>💰</span>
                      <span>${profile.saldo.toFixed(2)}</span>
                    </span>
                  )}
                </div>
                {/* Bio Preview */}
                {!isEditing && profile.bio && (
                  <p className="text-sm text-light-text-secondary dark:text-github-text-secondary line-clamp-2 leading-relaxed">
                    {profile.bio}
                  </p>
                )}
                {isEditing && (
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself..."
                    className="w-full px-3 py-2 mt-1 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg text-sm text-light-text dark:text-github-text placeholder-light-text-muted dark:placeholder-github-placeholder focus:outline-none focus:border-light-blue dark:focus:border-github-blue resize-none"
                    rows={2}
                  />
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 items-center">
              {isOwner && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2.5 rounded-lg bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border hover:border-light-blue dark:hover:border-github-blue text-light-text-secondary dark:text-github-text-secondary hover:text-light-blue dark:hover:text-github-blue transition-all duration-200"
                  title="Edit Profile"
                >
                  <Edit2 size={18} />
                </button>
              )}
              {isOwner && isEditing && (
                <>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="p-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all duration-200 disabled:opacity-50"
                    title="Save Changes"
                  >
                    <Save size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({ bio: profile.bio || '', avatar_url: profile.avatar_url || '' });
                    }}
                    className="p-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
                    title="Cancel"
                  >
                    <X size={18} />
                  </button>
                </>
              )}
              <ProfileQRCode
                profileUrl={window.location.href}
                profileName={profile.name}
              />
              {profile.role === 'busker' && (
                <button
                  onClick={() => navigate(`/profile/${id}/shop`)}
                  className="p-2.5 rounded-lg bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border hover:border-light-blue dark:hover:border-github-blue text-light-text-secondary dark:text-github-text-secondary hover:text-light-blue dark:hover:text-github-blue transition-all duration-200"
                  title="Go to Shop"
                >
                  <ShoppingBag size={18} />
                </button>
              )}
              {/* Actions Dropdown */}
              <div className="relative" ref={actionsMenuRef}>
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="p-2.5 rounded-lg bg-light-blue dark:bg-github-blue hover:bg-light-blue-dark dark:hover:bg-github-blue-dark text-white transition-all duration-200"
                  title="Actions"
                >
                  <Plus size={18} />
                </button>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        navigate(`/create-event?profile=${profile.id}`);
                        setShowActionsMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-light-text dark:text-github-text hover:bg-light-bg dark:hover:bg-github-bg transition-colors flex items-center gap-2"
                    >
                      <span>📅</span>
                      <span>Create Event</span>
                    </button>
                    {/* Future actions can be added here */}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg mb-6 shadow-xl">
          <div className="flex border-b border-light-border dark:border-github-border">
            <button
              onClick={() => setActiveTab('about')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                activeTab === 'about'
                  ? 'text-light-blue dark:text-github-blue border-b-2 border-light-blue dark:border-github-blue bg-light-bg/50 dark:bg-github-bg/50'
                  : 'text-light-text-secondary dark:text-github-text-secondary hover:text-light-text dark:hover:text-github-text hover:bg-light-bg/30 dark:hover:bg-github-bg/30'
              }`}
            >
              📋 About
            </button>
            {(profile.role === 'busker' || profile.role === 'eventmaker') && (
              <button
                onClick={() => setActiveTab('events')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'events'
                    ? 'text-light-blue dark:text-github-blue border-b-2 border-light-blue dark:border-github-blue bg-light-bg/50 dark:bg-github-bg/50'
                    : 'text-light-text-secondary dark:text-github-text-secondary hover:text-light-text dark:hover:text-github-text hover:bg-light-bg/30 dark:hover:bg-github-bg/30'
                }`}
              >
                📅 Events
              </button>
            )}
            {profile.role === 'busker' && (
              <>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'members'
                      ? 'text-light-blue dark:text-github-blue border-b-2 border-light-blue dark:border-github-blue bg-light-bg/50 dark:bg-github-bg/50'
                      : 'text-light-text-secondary dark:text-github-text-secondary hover:text-light-text dark:hover:text-github-text hover:bg-light-bg/30 dark:hover:bg-github-bg/30'
                  }`}
                >
                  👥 Band Members
                </button>
                <button
                  onClick={() => setActiveTab('tips')}
                  className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'tips'
                      ? 'text-light-blue dark:text-github-blue border-b-2 border-light-blue dark:border-github-blue bg-light-bg/50 dark:bg-github-bg/50'
                      : 'text-light-text-secondary dark:text-github-text-secondary hover:text-light-text dark:hover:text-github-text hover:bg-light-bg/30 dark:hover:bg-github-bg/30'
                  }`}
                >
                  💝 Tip Wall
                </button>
              </>
            )}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                {/* Genres Section */}
                {profile.genres && profile.genres.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-light-text dark:text-github-text mb-3 flex items-center gap-2">
                      <span>🎸</span>
                      <span>Genres</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.genres.map((genre, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border text-light-text-secondary dark:text-github-text-secondary rounded-full text-sm font-medium hover:border-light-blue dark:hover:border-github-blue transition-colors"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Instruments Section */}
                {profile.role === 'busker' && profile.instruments && profile.instruments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-light-text dark:text-github-text mb-3 flex items-center gap-2">
                      <span>🎹</span>
                      <span>Instruments</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.instruments.map((instrument, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border text-light-text-secondary dark:text-github-text-secondary rounded-full text-sm font-medium hover:border-light-blue dark:hover:border-github-blue transition-colors"
                        >
                          {instrument}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Links Section */}
                {profile.social_links && Object.keys(profile.social_links).length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-light-text dark:text-github-text mb-3 flex items-center gap-2">
                      <span>🔗</span>
                      <span>Connect</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(profile.social_links).map(([platform, url]) => 
                        url ? (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border hover:border-light-blue dark:hover:border-github-blue text-light-text-secondary dark:text-github-text-secondary hover:text-light-blue dark:hover:text-github-blue rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
                          >
                            {platform === 'instagram' && '📸'}
                            {platform === 'youtube' && '🎥'}
                            {platform === 'spotify' && '🎵'}
                            {platform === 'website' && '🌐'}
                            <span>{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                          </a>
                        ) : null
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (profile.role === 'busker' || profile.role === 'eventmaker') && id && (
              <ProfileEvents profileId={id} isOwner={isOwner} />
            )}

            {/* Band Members Tab */}
            {activeTab === 'members' && profile.role === 'busker' && currentUserId && id && (
              <div>
                <BandMembersManager profileId={id} isOwner={isOwner} />
              </div>
            )}

            {/* Tip Wall Tab */}
            {activeTab === 'tips' && profile.role === 'busker' && (
              <div>
                <TipWall profileId={profile.id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}