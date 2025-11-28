import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface WithdrawalRequest {
  id: string;
  profile_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requested_at: string;
  processed_at?: string;
  notes?: string;
  profile_name?: string;
  stripe_payout_id?: string;
  payout_error?: string;
}

export function WithdrawalAdmin() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      setIsLoading(true);
      // This would need to be an admin endpoint that fetches all withdrawals
      // For now, showing the structure
      const response = await fetch('http://localhost:3000/api/withdrawals/admin/all');
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data);
      }
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (withdrawalId: string) => {
    setIsProcessing(withdrawalId);
    try {
      const response = await fetch(`http://localhost:3000/api/withdrawals/${withdrawalId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: adminNotes[withdrawalId] || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        const payoutMsg = data.payout?.success 
          ? ` Stripe payout initiated (${data.payout.payoutId})`
          : data.payout?.error 
          ? ` ⚠️ Payout failed: ${data.payout.error}`
          : '';
        
        setSuccessMessage({
          id: withdrawalId,
          message: `✓ Withdrawal approved! ${data.withdrawal.amount.toFixed(2)} SEK deducted from artist's saldo. New saldo: ${data.newSaldo.toFixed(2)} SEK.${payoutMsg}`
        });
        setTimeout(() => setSuccessMessage(null), 5000);
        fetchWithdrawals();
        setAdminNotes({ ...adminNotes, [withdrawalId]: '' });
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      console.error('Error approving withdrawal:', err);
      alert('Failed to approve withdrawal');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (withdrawalId: string) => {
    setIsProcessing(withdrawalId);
    try {
      const response = await fetch(`http://localhost:3000/api/withdrawals/${withdrawalId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: adminNotes[withdrawalId] || null
        })
      });

      if (response.ok) {
        fetchWithdrawals();
        setAdminNotes({ ...adminNotes, [withdrawalId]: '' });
      }
    } catch (err) {
      console.error('Error rejecting withdrawal:', err);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleMarkCompleted = async (withdrawalId: string) => {
    setIsProcessing(withdrawalId);
    try {
      const response = await fetch(`http://localhost:3000/api/withdrawals/${withdrawalId}/mark-completed`, {
        method: 'PATCH'
      });

      if (response.ok) {
        fetchWithdrawals();
      }
    } catch (err) {
      console.error('Error marking as completed:', err);
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredWithdrawals = withdrawals.filter(w =>
    filter === 'all' || w.status === filter
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={18} className="text-yellow-400" />;
      case 'approved':
        return <CheckCircle size={18} className="text-blue-400" />;
      case 'completed':
        return <CheckCircle size={18} className="text-green-400" />;
      case 'rejected':
        return <XCircle size={18} className="text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900/20 border-yellow-700';
      case 'approved':
        return 'bg-blue-900/20 border-blue-700';
      case 'completed':
        return 'bg-green-900/20 border-green-700';
      case 'rejected':
        return 'bg-red-900/20 border-red-700';
      default:
        return 'bg-gray-900/20 border-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-github-bg p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-github-text mb-8">Withdrawal Requests</h1>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-700 rounded-lg text-green-300 animate-pulse">
            {successMessage.message}
          </div>
        )}

        {/* Filter Buttons */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected', 'completed'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === filterType
                  ? 'bg-github-blue text-github-text'
                  : 'bg-github-card border border-github-border text-github-text-secondary hover:border-github-blue'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>

        {/* Withdrawals List */}
        {isLoading ? (
          <p className="text-center text-github-text-secondary py-8">Loading...</p>
        ) : filteredWithdrawals.length === 0 ? (
          <p className="text-center text-github-text-secondary py-8">No withdrawal requests</p>
        ) : (
          <div className="space-y-4">
            {filteredWithdrawals.map(withdrawal => (
              <div
                key={withdrawal.id}
                className={`border border-github-border rounded-lg p-6 ${getStatusBg(withdrawal.status)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(withdrawal.status)}
                    <div>
                      <h3 className="text-lg font-bold text-github-text">
                        {withdrawal.amount.toFixed(2)} SEK
                      </h3>
                      <p className="text-sm text-github-text-secondary">
                        {withdrawal.profile_name} • {new Date(withdrawal.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    withdrawal.status === 'pending' ? 'bg-yellow-900/30 text-yellow-300' :
                    withdrawal.status === 'approved' ? 'bg-blue-900/30 text-blue-300' :
                    withdrawal.status === 'completed' ? 'bg-green-900/30 text-green-300' :
                    'bg-red-900/30 text-red-300'
                  }`}>
                    {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                  </span>
                </div>

                {withdrawal.status === 'pending' && (
                  <div className="space-y-3">
                    <textarea
                      value={adminNotes[withdrawal.id] || ''}
                      onChange={(e) => setAdminNotes({ ...adminNotes, [withdrawal.id]: e.target.value })}
                      placeholder="Add notes (optional)..."
                      className="w-full px-3 py-2 bg-github-card border border-github-border rounded text-github-text text-sm focus:outline-none focus:border-github-blue"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(withdrawal.id)}
                        disabled={isProcessing === withdrawal.id}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded transition-all"
                      >
                        {isProcessing === withdrawal.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(withdrawal.id)}
                        disabled={isProcessing === withdrawal.id}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded transition-all"
                      >
                        {isProcessing === withdrawal.id ? 'Processing...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                )}

                {withdrawal.status === 'approved' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarkCompleted(withdrawal.id)}
                      disabled={isProcessing === withdrawal.id}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded transition-all"
                    >
                      {isProcessing === withdrawal.id ? 'Processing...' : 'Mark as Completed'}
                    </button>
                  </div>
                )}

                {withdrawal.notes && (
                  <div className="mt-4 pt-4 border-t border-github-border/50">
                    <p className="text-sm font-semibold text-github-text mb-2">Notes:</p>
                    <p className="text-sm text-github-text-secondary">{withdrawal.notes}</p>
                  </div>
                )}

                {withdrawal.stripe_payout_id && (
                  <div className="mt-4 pt-4 border-t border-github-border/50">
                    <p className="text-sm font-semibold text-github-text mb-2">Stripe Payout:</p>
                    <p className="text-xs text-github-text-secondary font-mono">{withdrawal.stripe_payout_id}</p>
                  </div>
                )}

                {withdrawal.payout_error && (
                  <div className="mt-4 pt-4 border-t border-red-900/50 bg-red-900/20 p-3 rounded">
                    <p className="text-sm font-semibold text-red-400 mb-2">⚠️ Payout Error:</p>
                    <p className="text-sm text-red-300">{withdrawal.payout_error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
