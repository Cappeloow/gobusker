import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, Mail, Trash2, Users } from 'lucide-react';

interface ProfileMember {
  id: string;
  user_id: string;
  profile_id: string;
  revenue_share: number;
  role: 'owner' | 'admin' | 'member';
  alias?: string;
  description?: string;
  specialty?: string;
  profiles?: {
    user_metadata?: {
      name?: string;
      email?: string;
    };
  };
}

interface ProfileInvite {
  id: string;
  invitee_email: string;
  revenue_share: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  accepted_at?: string;
}

interface BandMembersManagerProps {
  profileId: string;
  isOwner: boolean;
}

export function BandMembersManager({ profileId, isOwner }: BandMembersManagerProps) {
  const [members, setMembers] = useState<ProfileMember[]>([]);
  const [invites, setInvites] = useState<ProfileInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [revenueShare, setRevenueShare] = useState(100);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    // Component mounted
  }, [isOwner, profileId]);

  const fetchMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profile_members')
        .select(`
          id,
          user_id,
          profile_id,
          revenue_share,
          role,
          alias,
          description,
          specialty,
          created_at
        `)
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching members - RLS/Query error:', error);
        setMembers([]);
      } else if (data) {
        setMembers(data);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error('Exception in fetchMembers:', err);
      setMembers([]);
    }
  }, [profileId]);

  const fetchInvites = useCallback(async () => {
    if (!isOwner) {
      console.log('Not owner, skipping invite fetch');
      return;
    }
    try {
      console.log('Fetching invites for profileId:', profileId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log('No session token, cannot fetch invites');
        return;
      }

      const response = await fetch(`http://localhost:3000/api/invites/profile/${profileId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      console.log('Invites fetch response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched invites:', data);
        setInvites(data);
      }
    } catch (err) {
      console.error('Error fetching invites:', err);
    }
  }, [profileId, isOwner]);

  useEffect(() => {
    fetchMembers();
    fetchInvites();
  }, [fetchMembers, fetchInvites]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!newMemberEmail) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    if (revenueShare <= 0 || revenueShare > 100) {
      setMessage({ type: 'error', text: 'Revenue share must be between 1-100%' });
      return;
    }

    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Not authenticated' });
        return;
      }

      const response = await fetch('http://localhost:3000/api/invites/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          profileId,
          inviteeEmail: newMemberEmail.toLowerCase(),
          revenuShare: revenueShare
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Invitation sent successfully!' });
        setNewMemberEmail('');
        setRevenueShare(100);
        setShowInviteForm(false);
        fetchInvites();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to send invitation' });
      }
    } catch (err) {
      console.error('Error sending invite:', err);
      setMessage({ type: 'error', text: 'Failed to send invitation' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      console.log('Attempting to cancel invite:', inviteId);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.log('No session token');
        setMessage({ type: 'error', text: 'Not authenticated' });
        return;
      }

      console.log('Sending DELETE request to:', `http://localhost:3000/api/invites/${inviteId}`);
      const response = await fetch(`http://localhost:3000/api/invites/${inviteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      console.log('Cancel response status:', response.status);
      if (response.ok) {
        setMessage({ type: 'success', text: 'Invitation cancelled' });
        fetchInvites();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Cancel failed:', errorData);
        setMessage({ type: 'error', text: errorData.message || 'Failed to cancel invitation' });
      }
    } catch (err) {
      console.error('Error cancelling invite:', err);
      setMessage({ type: 'error', text: 'Failed to cancel invitation' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-github-text flex items-center gap-2 mb-2">
          <Users size={20} className="sm:w-6 sm:h-6" />
          Band Members
        </h2>
        <p className="text-sm sm:text-base text-github-text-secondary">Manage who has access to this profile and revenue splits</p>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-lg flex gap-3 border ${
            message.type === 'success'
              ? 'bg-green-900/20 border-green-700'
              : 'bg-red-900/20 border-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="text-green-400 flex-shrink-0" size={20} />
          ) : (
            <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
          )}
          <p className={message.type === 'success' ? 'text-green-300' : 'text-red-300'}>
            {message.text}
          </p>
        </div>
      )}

      {/* Current Members */}
      <div className="bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-light-text dark:text-github-text mb-4">Current Members ({members.length})</h3>
        {members.length === 0 ? (
          <p className="text-sm sm:text-base text-light-text-secondary dark:text-github-text-secondary">No members yet. Invite someone to get started!</p>
        ) : (
          <div className="space-y-3">
            {members.map(member => (
              <div key={member.id} className="p-3 sm:p-4 bg-light-bg dark:bg-github-bg rounded-lg border border-light-border dark:border-github-border">
                {isOwner ? (
                  // Full details for members/owners
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <p className="text-sm sm:text-base text-light-text dark:text-github-text font-medium">
                        {member.alias || (member.role === 'owner' ? '👤 Profile Owner' : 'Band Member')}
                      </p>
                      <span className={`inline-block px-2 py-1 text-xs rounded font-medium self-start sm:self-auto ${
                        member.role === 'owner' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                        member.role === 'admin' ? 'bg-[#D2B48C]/10 dark:bg-[#D2B48C]/20 text-[#B8956F] dark:text-[#D2B48C]' :
                        'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                      }`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                    </div>
                    {member.specialty && (
                      <p className="text-sm text-light-blue dark:text-github-blue mb-1">{member.specialty}</p>
                    )}
                    {member.description && (
                      <p className="text-sm text-light-text-secondary dark:text-github-text-secondary mb-2">{member.description}</p>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-light-text-secondary dark:text-github-text-secondary pt-2 border-t border-light-border dark:border-github-border">
                      <span className="break-all sm:break-normal">ID: {member.user_id.substring(0, 8)}...</span>
                      <span className="font-medium text-light-text dark:text-github-text">Revenue: {member.revenue_share.toFixed(1)}%</span>
                    </div>
                  </>
                ) : (
                  // Public view for visitors - only show alias, specialty, description
                  <>
                    <p className="text-light-text dark:text-github-text font-medium mb-1">
                      {member.alias || (member.role === 'owner' ? 'Profile Owner' : 'Band Member')}
                    </p>
                    {member.specialty && (
                      <p className="text-sm text-github-blue mb-1">{member.specialty}</p>
                    )}
                    {member.description && (
                      <p className="text-sm text-github-text-secondary">{member.description}</p>
                    )}
                    {!member.alias && !member.specialty && !member.description && (
                      <p className="text-xs text-github-text-secondary italic">Member of the band</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-light-text dark:text-github-text mb-4">Pending Invites ({invites.length})</h3>
          <div className="space-y-2">
            {invites.map(invite => (
              <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-light-bg dark:bg-github-bg rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail size={16} className="text-yellow-400 flex-shrink-0" />
                    <p className="text-sm sm:text-base text-github-text font-medium truncate">{invite.invitee_email}</p>
                    <span className="text-xs bg-yellow-900/30 text-yellow-300 px-2 py-1 rounded flex-shrink-0">
                      Pending
                    </span>
                  </div>
                  <p className="text-sm text-github-text-secondary">
                    Revenue Share: {invite.revenue_share.toFixed(1)}%
                  </p>
                </div>

                {isOwner && (
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    className="self-start sm:self-center p-2 hover:bg-red-900/20 rounded-lg transition-colors text-red-400 touch-target"
                    title="Cancel invitation"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Invite Form */}
      {isOwner && (
        <div className="bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg p-4 sm:p-6">
          {!showInviteForm ? (
            <button
              onClick={() => setShowInviteForm(true)}
              className="w-full px-4 py-3 bg-light-blue dark:bg-github-blue hover:bg-light-blue-dark dark:hover:bg-github-blue-dark text-white dark:text-github-text font-medium rounded-lg transition-colors touch-target"
            >
              + Invite Band Member
            </button>
          ) : (
            <form onSubmit={handleSendInvite} className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-light-text dark:text-github-text">Invite a New Member</h3>

              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-github-text-secondary mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="member@example.com"
                  className="w-full px-3 py-2 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg text-light-text dark:text-github-text placeholder-light-text-secondary dark:placeholder-github-text-secondary focus:border-light-blue dark:focus:border-github-blue focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-github-text-secondary mb-2">
                  Revenue Share: {revenueShare.toFixed(1)}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="0.1"
                  value={revenueShare}
                  onChange={(e) => setRevenueShare(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-light-text-secondary dark:text-github-text-secondary mt-2">
                  This member will receive {revenueShare.toFixed(1)}% of tips to this profile
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:flex-1 px-4 py-3 bg-light-blue dark:bg-github-blue hover:bg-light-blue-dark dark:hover:bg-github-blue-dark disabled:opacity-50 text-white dark:text-github-text font-medium rounded-lg transition-colors touch-target"
                >
                  {isLoading ? 'Sending...' : 'Send Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="w-full sm:flex-1 px-4 py-3 bg-light-border dark:bg-github-border hover:bg-light-bg dark:hover:bg-github-bg text-light-text dark:text-github-text font-medium rounded-lg transition-colors touch-target"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="p-3 sm:p-4 bg-[#D2B48C]/10 dark:bg-[#D2B48C]/20 border border-[#D2B48C]/30 dark:border-[#B8956F] rounded-lg">
        <h4 className="font-semibold text-[#B8956F] dark:text-[#D2B48C] mb-2 text-sm sm:text-base">💡 How Revenue Distribution Works</h4>
        <ul className="text-xs sm:text-sm text-[#B8956F] dark:text-[#D2B48C] space-y-1">
          <li>• When someone sends a tip, it's automatically split among all band members</li>
          <li>• Each member receives their percentage of the tip based on their revenue share</li>
          <li>• Example: If you set a member to 30%, they get 30% of every tip to this profile</li>
          <li>• Members don't need to be at 100% - you can distribute however you like</li>
          <li>• Invitations are sent via email and valid for 30 days</li>
          <li>• Members need to sign up or log in to accept the invitation</li>
          <li>• Revenue splits are applied to tips received for this profile</li>
          <li>• Each member withdraws their earnings independently</li>
        </ul>
      </div>
    </div>
  );
}
