import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, History } from 'lucide-react';
import type { Profile } from '../types/models';
import { WithdrawalWidget } from './WithdrawalWidget';

interface Transaction {
  id: string;
  type: 'tip' | 'order' | 'withdrawal';
  amount: number;
  description: string;
  donor_name?: string;
  customer_name?: string;
  profile_id: string;
  profile_name: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

interface WalletProps {
  userProfiles: Profile[];
}

export function Wallet({ userProfiles }: WalletProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tip' | 'order' | 'withdrawal'>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID on mount
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
    };
    getUserId();
  }, []);

  // Load transactions when currentUserId or userProfiles change
  const loadTransactions = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setIsLoading(true);
      const allTransactions: Transaction[] = [];

      // Load transactions for each profile
      for (const profile of userProfiles) {
        // Fetch tips received
        const { data: allTips, error: allTipsError } = await supabase
          .from('tips')
          .select('*')
          .eq('profile_id', profile.id)
          .order('created_at', { ascending: false });

        if (allTipsError) {
          console.error(`Error loading tips for profile ${profile.id}:`, allTipsError);
        }

        // Show only completed tips
        const completedTips = allTips?.filter(t => t.payment_status === 'completed') || [];

        completedTips.forEach((tip: { id: string; amount: number; donor_name: string; payment_status: string; created_at: string }) => {
          allTransactions.push({
            id: tip.id,
            type: 'tip',
            amount: tip.amount,
            description: `Tip from ${tip.donor_name}`,
            donor_name: tip.donor_name,
            profile_id: profile.id,
            profile_name: profile.name,
            status: 'completed',
            created_at: tip.created_at,
          });
        });

        // Fetch orders - only show orders from OTHER customers (not your own purchases)
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, customer_email, customer_name, total_amount, payment_status, created_at')
          .eq('profile_id', profile.id)
          .eq('payment_status', 'paid')
          .order('created_at', { ascending: false });

        if (ordersError) {
          console.error(`Error loading orders for profile ${profile.id}:`, ordersError);
        }

        if (orders) {
          orders.forEach((order: { id: string; customer_email: string; customer_name: string; total_amount: number; created_at: string }) => {
            // Only show orders from OTHER customers - exclude your own purchases from your own shop
            if (order.customer_email !== currentUserId) {
              allTransactions.push({
                id: order.id,
                type: 'order',
                amount: order.total_amount / 100, // Convert from cents
                description: `Sale from ${order.customer_name || 'Customer'}`,
                customer_name: order.customer_name,
                profile_id: profile.id,
                profile_name: profile.name,
                status: 'completed',
                created_at: order.created_at,
              });
            }
          });
        }

        // Fetch completed withdrawals
        const { data: withdrawals, error: withdrawalsError } = await supabase
          .from('withdrawals')
          .select('id, amount, status, processed_at')
          .eq('profile_id', profile.id)
          .eq('status', 'completed')
          .order('processed_at', { ascending: false });

        if (withdrawalsError) {
          console.error(`Error loading withdrawals for profile ${profile.id}:`, withdrawalsError);
        }

        if (withdrawals) {
          withdrawals.forEach((withdrawal: { id: string; amount: number; status: string; processed_at: string }) => {
            allTransactions.push({
              id: withdrawal.id,
              type: 'withdrawal',
              amount: -withdrawal.amount, // Negative because money goes out
              description: `Withdrawal to bank account`,
              profile_id: profile.id,
              profile_name: profile.name,
              status: 'completed',
              created_at: withdrawal.processed_at,
            });
          });
        }
      }

      // Sort by date
      allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTransactions(allTransactions);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userProfiles, currentUserId]);

  // Trigger load when dependencies change
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filteredTransactions = transactions.filter(tx => 
    filter === 'all' || tx.type === filter
  );

  // Fetch total saldo from user_wallets instead of summing profiles
  useEffect(() => {
    const fetchUserWallet = async () => {
      if (!currentUserId) return;
      try {
        const { data: wallet } = await supabase
          .from('user_wallets')
          .select('saldo')
          .eq('user_id', currentUserId)
          .single();
        
        if (wallet) {
          // Update totalSaldo when wallet changes
        }
      } catch (err) {
        console.error('Error fetching wallet:', err);
      }
    };
    fetchUserWallet();
  }, [currentUserId]);

  // This should now be fetched from user_wallets, not from profile.saldo
  // For now, keeping this for display but it's read from server
  const totalSaldo = userProfiles.reduce((sum, profile) => sum + (profile.saldo || 0), 0);

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
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700';
      case 'order':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700';
      case 'withdrawal':
        return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700';
      default:
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-light-text dark:text-github-text mb-6 flex items-center gap-3">
        <DollarSign size={28} />
        Financial Overview
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-8">
        {/* Total Saldo */}
        <div className="bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-light-text-secondary dark:text-github-text-secondary text-sm font-medium">Total Saldo</span>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-4xl font-bold text-green-600 dark:text-green-400">${totalSaldo.toFixed(2)}</p>
          <p className="text-light-text-secondary dark:text-github-text-secondary text-xs mt-2">Available balance from tips</p>
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
                ? 'bg-light-blue dark:bg-github-blue text-white dark:text-github-text border border-light-blue dark:border-github-blue'
                : 'bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border text-light-text-secondary dark:text-github-text-secondary hover:border-light-blue dark:hover:border-github-blue'
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
          <div className="text-center py-8 text-light-text-secondary dark:text-github-text-secondary">
            Loading transactions...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-light-text-secondary dark:text-github-text-secondary">
            <History size={32} className="mx-auto mb-2 opacity-50" />
            <p>No transactions yet</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg p-4 flex items-center justify-between hover:border-light-blue dark:hover:border-github-blue transition-all duration-200"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl border ${getTransactionColor(tx.type)}`}>
                  {getTransactionIcon(tx.type)}
                </div>
                <div className="flex-1">
                  <p className="text-light-text dark:text-github-text font-medium">{tx.description}</p>
                  <p className="text-light-text-secondary dark:text-github-text-secondary text-xs">
                    {tx.profile_name} • {new Date(tx.created_at).toLocaleDateString('en-US', {
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
                <p className={`text-light-text dark:text-github-text font-bold text-lg ${
                  tx.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                }`}>
                  {tx.amount < 0 ? '−$' : '+$'}{Math.abs(tx.amount).toFixed(2)}
                </p>
                <p className={`text-xs font-semibold ${
                  tx.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                  tx.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Withdrawal Section - Only show when withdrawal filter is selected */}
      {filter === 'withdrawal' && (
        <div className="mt-8 pt-8 border-t border-light-border dark:border-github-border">
          <WithdrawalWidget userProfiles={userProfiles} />
        </div>
      )}
    </div>
  );
}
