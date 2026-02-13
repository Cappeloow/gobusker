import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, History } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'tip' | 'order' | 'withdrawal';
  amount: number;
  description: string;
  donor_name?: string;
  customer_name?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

interface FinancialHubProps {
  profileId: string;
  currentSaldo: number;
}

export function FinancialHub({ profileId, currentSaldo }: FinancialHubProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tip' | 'order' | 'withdrawal'>('all');

  const loadTransactions = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch tips received
      const { data: tips } = await supabase
        .from('tips')
        .select('id, donor_name, amount, payment_status, created_at')
        .eq('profile_id', profileId)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false });

      // Fetch orders (if applicable for this profile)
      const { data: orders } = await supabase
        .from('orders')
        .select('id, customer_name, total_amount, payment_status, created_at')
        .eq('profile_id', profileId)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });

      // Fetch completed withdrawals
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('id, amount, status, processed_at')
        .eq('profile_id', profileId)
        .eq('status', 'completed')
        .order('processed_at', { ascending: false });

      // Combine and map transactions
      const allTransactions: Transaction[] = [];

      if (tips) {
        tips.forEach((tip: { id: string; donor_name: string; amount: number; payment_status: string; created_at: string }) => {
          allTransactions.push({
            id: tip.id,
            type: 'tip',
            amount: tip.amount,
            description: `Tip from ${tip.donor_name}`,
            donor_name: tip.donor_name,
            status: 'completed',
            created_at: tip.created_at,
          });
        });
      }

      if (orders) {
        orders.forEach((order: { id: string; customer_name: string; total_amount: number; payment_status: string; created_at: string }) => {
          allTransactions.push({
            id: order.id,
            type: 'order',
            amount: order.total_amount / 100, // Convert from cents
            description: `Sale to ${order.customer_name || 'Customer'}`,
            customer_name: order.customer_name,
            status: 'completed',
            created_at: order.created_at,
          });
        });
      }

      if (withdrawals) {
        withdrawals.forEach((withdrawal: { id: string; amount: number; status: string; processed_at: string }) => {
          allTransactions.push({
            id: withdrawal.id,
            type: 'withdrawal',
            amount: -withdrawal.amount, // Negative because it's money going out
            description: `Withdrawal to bank account`,
            status: 'completed',
            created_at: withdrawal.processed_at,
          });
        });
      }

      // Sort by date
      allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTransactions(allTransactions);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filteredTransactions = transactions.filter(tx => 
    filter === 'all' || tx.type === filter
  );

  const totalEarnings = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'tip':
        return '💰';
      case 'order':
        return '🛍️';
      case 'withdrawal':
        return '💳';
      default:
        return '💵';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'tip':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
      case 'order':
        return 'text-[#D2B48C] bg-[#D2B48C]/20 border-[#B8956F]';
      case 'withdrawal':
        return 'text-purple-400 bg-purple-900/20 border-purple-700';
      default:
        return 'text-green-400 bg-green-900/20 border-green-700';
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-github-border">
      <h2 className="text-2xl font-bold text-github-text mb-6 flex items-center gap-3">
        <DollarSign size={28} />
        Financial Hub
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Current Saldo */}
        <div className="bg-github-bg border border-github-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-github-text-secondary text-sm font-medium">Current Saldo</span>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-bold text-green-400">${currentSaldo.toFixed(2)}</p>
          <p className="text-github-text-secondary text-xs mt-2">Available balance</p>
        </div>

        {/* Total Earnings */}
        <div className="bg-github-bg border border-github-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-github-text-secondary text-sm font-medium">Total Earnings</span>
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-3xl font-bold text-[#D2B48C]">${totalEarnings.toFixed(2)}</p>
          <p className="text-github-text-secondary text-xs mt-2">All time</p>
        </div>

        {/* Transactions Count */}
        <div className="bg-github-bg border border-github-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-github-text-secondary text-sm font-medium">Transactions</span>
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-3xl font-bold text-purple-400">{transactions.length}</p>
          <p className="text-github-text-secondary text-xs mt-2">Total received</p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(['all', 'tip', 'order', 'withdrawal'] as const).map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === filterType
                ? 'bg-github-blue text-github-text border border-github-blue'
                : 'bg-github-bg border border-github-border text-github-text-secondary hover:border-github-blue'
            }`}
          >
            {filterType === 'all' && 'All Transactions'}
            {filterType === 'tip' && '💰 Tips'}
            {filterType === 'order' && '🛍️ Orders'}
            {filterType === 'withdrawal' && '💳 Withdrawals'}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-github-text-secondary">
            Loading transactions...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-github-text-secondary">
            <History size={32} className="mx-auto mb-2 opacity-50" />
            <p>No transactions yet</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-github-bg border border-github-border rounded-lg p-4 flex items-center justify-between hover:border-github-blue transition-all duration-200"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl border ${getTransactionColor(tx.type)}`}>
                  {getTransactionIcon(tx.type)}
                </div>
                <div className="flex-1">
                  <p className="text-github-text font-medium">{tx.description}</p>
                  <p className="text-github-text-secondary text-xs">
                    {new Date(tx.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-github-text font-bold text-lg ${
                  tx.amount < 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {tx.amount < 0 ? '−$' : '+$'}{Math.abs(tx.amount).toFixed(2)}
                </p>
                <p className={`text-xs font-semibold ${
                  tx.status === 'completed' ? 'text-green-400' :
                  tx.status === 'pending' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Withdrawal Section (Placeholder) */}
      <div className="mt-8 pt-8 border-t border-github-border">
        <div className="bg-github-bg border border-github-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-github-text mb-4">Withdrawals</h3>
          <p className="text-github-text-secondary mb-4">
            Contact the app owner to request a withdrawal of your accumulated saldo.
          </p>
          <button className="px-6 py-2 bg-github-blue hover:bg-github-blue-dark text-github-text font-semibold rounded-lg transition-all duration-200">
            Request Withdrawal
          </button>
        </div>
      </div>
    </div>
  );
}
