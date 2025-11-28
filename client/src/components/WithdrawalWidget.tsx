import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { BankAccountSetup } from './BankAccountSetup';
import type { Profile } from '../types/models';

interface Withdrawal {
  id: string;
  profile_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requested_at: string;
  processed_at?: string;
  notes?: string;
}

interface WithdrawalWidgetProps {
  userProfiles: Profile[];
}

export function WithdrawalWidget({ userProfiles }: WithdrawalWidgetProps) {
  const [selectedProfile, setSelectedProfile] = useState<string>(userProfiles[0]?.id || '');
  const [requestAmount, setRequestAmount] = useState<string>('');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasBankAccount, setHasBankAccount] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedProfileData = userProfiles.find(p => p.id === selectedProfile);
  const availableSaldo = selectedProfileData?.saldo || 0;

  const checkBankAccount = useCallback(async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('bank_account_token')
        .eq('id', selectedProfile)
        .single();

      if (!error && profile?.bank_account_token) {
        setHasBankAccount(true);
      } else {
        setHasBankAccount(false);
      }
    } catch (err) {
      console.error('Error checking bank account:', err);
    }
  }, [selectedProfile]);

  const fetchWithdrawals = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:3000/api/withdrawals/${selectedProfile}`);
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data);
      }
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProfile]);

  useEffect(() => {
    if (selectedProfile) {
      checkBankAccount();
      fetchWithdrawals();
    }
  }, [selectedProfile, checkBankAccount, fetchWithdrawals]);

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!requestAmount || parseFloat(requestAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    if (parseFloat(requestAmount) > availableSaldo) {
      setMessage({ type: 'error', text: `Amount exceeds available saldo ($${availableSaldo.toFixed(2)})` });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('http://localhost:3000/api/withdrawals/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfile,
          amount: parseFloat(requestAmount)
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Withdrawal request submitted successfully!' });
        setRequestAmount('');
        fetchWithdrawals();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to submit withdrawal request' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error submitting withdrawal request' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-400" />;
      case 'approved':
        return <CheckCircle size={16} className="text-blue-400" />;
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900/20 border-yellow-700 text-yellow-300';
      case 'approved':
        return 'bg-blue-900/20 border-blue-700 text-blue-300';
      case 'completed':
        return 'bg-green-900/20 border-green-700 text-green-300';
      case 'rejected':
        return 'bg-red-900/20 border-red-700 text-red-300';
      default:
        return 'bg-gray-900/20 border-gray-700 text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Bank Account Setup - Show if needed */}
      {!hasBankAccount && (
        <BankAccountSetup 
          profileId={selectedProfile}
          onAccountAdded={() => {
            checkBankAccount();
          }}
        />
      )}

      {/* Request Form */}
      <div className="bg-github-bg border border-github-border rounded-lg p-6">
        <h3 className="text-lg font-bold text-github-text mb-4">Request Withdrawal</h3>

        {userProfiles.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-github-text-secondary mb-2">
              Select Profile
            </label>
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="w-full px-3 py-2 bg-github-card border border-github-border rounded-lg text-github-text focus:border-github-blue focus:outline-none"
            >
              {userProfiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} ({(profile.saldo || 0).toFixed(2)} SEK)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-4 p-4 bg-github-card border border-github-border rounded-lg">
          <p className="text-github-text-secondary text-sm mb-1">Available Saldo</p>
          <p className="text-2xl font-bold text-green-400">{availableSaldo.toFixed(2)} SEK</p>
        </div>

        {!hasBankAccount && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-red-300 font-semibold mb-2">Bank Account Required</p>
              <p className="text-sm text-red-200">
                You need to add a bank account to request withdrawals. Scroll up to add your banking details.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleRequestWithdrawal} className={`space-y-4 ${!hasBankAccount ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <label className="block text-sm font-medium text-github-text-secondary mb-2">
              Withdrawal Amount
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-github-text-secondary">SEK</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={availableSaldo}
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={!hasBankAccount}
                  className="w-full pl-12 pr-3 py-2 bg-github-card border border-github-border rounded-lg text-github-text placeholder-github-text-secondary focus:border-github-blue focus:outline-none disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                onClick={() => setRequestAmount(availableSaldo.toFixed(2))}
                disabled={!hasBankAccount}
                className="px-3 py-2 bg-github-blue hover:bg-github-blue-dark disabled:opacity-50 text-github-text text-sm font-medium rounded-lg transition-all duration-200"
              >
                Max
              </button>
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded-lg border flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-900/20 border-green-700 text-green-300'
                : 'bg-red-900/20 border-red-700 text-red-300'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !requestAmount || parseFloat(requestAmount) <= 0 || !hasBankAccount}
            className="w-full px-4 py-2 bg-github-blue hover:bg-github-blue-dark disabled:opacity-50 disabled:cursor-not-allowed text-github-text font-semibold rounded-lg transition-all duration-200"
          >
            {isSubmitting ? 'Submitting...' : 'Request Withdrawal'}
          </button>
        </form>
      </div>

      {/* Withdrawal History */}
      <div className="bg-github-bg border border-github-border rounded-lg p-6">
        <h3 className="text-lg font-bold text-github-text mb-4">Withdrawal History</h3>

        {isLoading ? (
          <p className="text-github-text-secondary text-center py-4">Loading...</p>
        ) : withdrawals.length === 0 ? (
          <p className="text-github-text-secondary text-center py-4">No withdrawal requests yet</p>
        ) : (
          <div className="space-y-3">
            {withdrawals.map(withdrawal => (
              <div
                key={withdrawal.id}
                className={`p-4 border rounded-lg flex items-center justify-between ${getStatusColor(withdrawal.status)}`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(withdrawal.status)}
                  <div>
                    <p className="font-semibold">{withdrawal.amount.toFixed(2)} SEK</p>
                    <p className="text-xs opacity-75">
                      {new Date(withdrawal.requested_at).toLocaleDateString()} • {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                    </p>
                    {withdrawal.notes && (
                      <p className="text-xs opacity-75 mt-1">{withdrawal.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
