import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, AlertCircle, LogIn } from 'lucide-react';

interface InviteData {
  id: string;
  invitee_email: string;
  revenue_share: number;
  invite_token: string;
  profiles: {
    id: string;
    name: string;
    description: string;
    image_url?: string;
  };
  inviter: {
    id: string;
    name: string;
  };
}

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    const checkAuthAndLoadInvite = async () => {
      // Check if user is logged in
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      // Load invite details
      if (token) {
        try {
          const response = await fetch(`http://localhost:3000/api/invites/token/${token}`);
          if (response.ok) {
            const data = await response.json();
            setInvite(data);
          } else {
            setMessage({ type: 'error', text: 'Invite not found or expired' });
          }
        } catch (err) {
          console.error('Error loading invite:', err);
          setMessage({ type: 'error', text: 'Failed to load invite' });
        }
      }
      setIsLoading(false);
    };

    checkAuthAndLoadInvite();
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      setShowSignup(true);
      return;
    }

    if (!invite || !token) return;

    try {
      setIsAccepting(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Not authenticated' });
        return;
      }

      const response = await fetch('http://localhost:3000/api/invites/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Invite accepted! Redirecting...' });
        setTimeout(() => {
          navigate(`/profiles/${invite.profiles.id}`);
        }, 2000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to accept invite' });
      }
    } catch (err) {
      console.error('Error accepting invite:', err);
      setMessage({ type: 'error', text: 'Failed to accept invite' });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!token) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('http://localhost:3000/api/invites/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        setMessage({ type: 'info', text: 'Invitation declined' });
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err) {
      console.error('Error rejecting invite:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-github-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-github-blue mx-auto mb-4"></div>
          <p className="text-github-text">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-github-bg flex items-center justify-center p-4">
        <div className="bg-github-card border border-github-border rounded-lg p-8 max-w-md w-full text-center">
          <XCircle className="mx-auto mb-4 text-red-400" size={48} />
          <h1 className="text-2xl font-bold text-github-text mb-2">Invitation Not Found</h1>
          <p className="text-github-text-secondary mb-6">This invitation has expired or is invalid.</p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-github-blue hover:bg-github-blue-dark text-github-text font-medium rounded-lg transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  if (showSignup && !user) {
    return (
      <div className="min-h-screen bg-github-bg flex items-center justify-center p-4">
        <div className="bg-github-card border border-github-border rounded-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <LogIn className="mx-auto mb-4 text-github-blue" size={40} />
            <h1 className="text-2xl font-bold text-github-text mb-2">Sign Up First</h1>
            <p className="text-github-text-secondary">
              Create an account to accept this invitation to <strong>{invite.profiles.name}</strong>
            </p>
          </div>

          <div className="mb-6 p-4 bg-github-bg rounded-lg">
            <p className="text-sm text-github-text-secondary mb-2">Invitation for:</p>
            <p className="text-github-text font-medium">{invite.invitee_email}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/signup')}
              className="w-full px-4 py-2 bg-github-blue hover:bg-github-blue-dark text-github-text font-medium rounded-lg transition-colors"
            >
              Sign Up with This Email
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-4 py-2 bg-github-border hover:bg-github-bg text-github-text font-medium rounded-lg transition-colors"
            >
              Already Have an Account? Login
            </button>
          </div>

          <p className="text-xs text-github-text-secondary text-center mt-4">
            The invitation will remain valid for 30 days
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-github-bg flex items-center justify-center p-4">
      <div className="bg-github-card border border-github-border rounded-lg overflow-hidden max-w-2xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-github-blue to-purple-600 px-8 py-12 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">You're Invited! 🎵</h1>
          <p className="text-blue-100">Join {invite.profiles.name} on Gobusker</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Profile Info */}
          <div className="mb-8">
            <div className="flex items-start gap-4 mb-6">
              {invite.profiles.image_url && (
                <img
                  src={invite.profiles.image_url}
                  alt={invite.profiles.name}
                  className="w-24 h-24 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-github-text mb-2">{invite.profiles.name}</h2>
                <p className="text-github-text-secondary mb-4">{invite.profiles.description}</p>
                <div className="inline-block px-3 py-1 bg-github-bg rounded-full">
                  <p className="text-sm text-github-blue font-medium">
                    Revenue Share: {invite.revenue_share.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Inviter Info */}
          <div className="mb-8 p-4 bg-github-bg rounded-lg border border-github-border">
            <p className="text-sm text-github-text-secondary mb-1">Invited by</p>
            <p className="text-github-text font-medium">{invite.inviter.name}</p>
          </div>

          {/* What's Included */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-github-text mb-4">As a member, you'll be able to:</h3>
            <ul className="space-y-2 text-github-text-secondary">
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                Receive tips and contributions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                See all band members and revenue splits
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                Track earnings from this profile
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                Withdraw your share whenever you want
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                Get notified of tips on this profile
              </li>
            </ul>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg flex gap-3 ${
                message.type === 'success'
                  ? 'bg-green-900/20 border border-green-700'
                  : message.type === 'error'
                  ? 'bg-red-900/20 border border-red-700'
                  : 'bg-blue-900/20 border border-blue-700'
              }`}
            >
              {message.type === 'success' && <CheckCircle className="text-green-400 flex-shrink-0" size={20} />}
              {message.type === 'error' && <AlertCircle className="text-red-400 flex-shrink-0" size={20} />}
              {message.type === 'info' && <AlertCircle className="text-blue-400 flex-shrink-0" size={20} />}
              <p
                className={
                  message.type === 'success'
                    ? 'text-green-300'
                    : message.type === 'error'
                    ? 'text-red-300'
                    : 'text-blue-300'
                }
              >
                {message.text}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="flex-1 px-6 py-3 bg-github-blue hover:bg-github-blue-dark disabled:opacity-50 text-github-text font-semibold rounded-lg transition-colors"
            >
              {isAccepting ? 'Accepting...' : 'Accept Invitation'}
            </button>
            <button
              onClick={handleReject}
              className="flex-1 px-6 py-3 bg-github-border hover:bg-github-bg text-github-text font-semibold rounded-lg transition-colors"
            >
              Decline
            </button>
          </div>

          <p className="text-xs text-github-text-secondary text-center mt-4">
            This invitation will expire in 30 days
          </p>
        </div>
      </div>
    </div>
  );
}
