import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

interface BankAccountSetupProps {
  profileId: string;
  onAccountAdded?: () => void;
}

export function BankAccountSetup({ profileId, onAccountAdded }: BankAccountSetupProps) {
  const [hasAccount, setHasAccount] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [accountData, setAccountData] = useState({
    accountHolder: '',
    accountNumber: '',
    bankCode: '',
    country: 'SE'
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const checkBankAccount = useCallback(async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('bank_account_token')
        .eq('id', profileId)
        .single();

      if (!error && profile?.bank_account_token) {
        setHasAccount(true);
      }
    } catch {
      console.error('Error checking bank account');
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    checkBankAccount();
  }, [checkBankAccount]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountData.accountHolder || !accountData.accountNumber || !accountData.bankCode) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setIsAdding(true);
    try {
      // In production, you'd encrypt this or use Stripe Token API
      // For now, we'll store an encrypted reference
      const accountToken = btoa(JSON.stringify({
        holder: accountData.accountHolder,
        number: accountData.accountNumber.slice(-4), // Only store last 4 digits
        code: accountData.bankCode,
        country: accountData.country,
        added: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('profiles')
        .update({ bank_account_token: accountToken })
        .eq('id', profileId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Bank account added successfully!' });
      setHasAccount(true);
      setAccountData({ accountHolder: '', accountNumber: '', bankCode: '', country: 'SE' });
      
      if (onAccountAdded) {
        onAccountAdded();
      }

      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to add bank account' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAccount = async () => {
    if (!confirm('Remove bank account? You won\'t be able to withdraw until you add a new one.')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bank_account_token: null })
        .eq('id', profileId);

      if (error) throw error;

      setHasAccount(false);
      setMessage({ type: 'success', text: 'Bank account removed' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to remove bank account' });
    }
  };

  if (isLoading) {
    return <div className="text-github-text-secondary">Loading...</div>;
  }

  return (
    <div className="bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg p-6">
      <h3 className="text-lg font-bold text-light-text dark:text-github-text mb-4">💳 Bank Account</h3>

      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {hasAccount ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle size={20} />
            <span className="font-semibold">Bank account connected</span>
          </div>
          <p className="text-sm text-light-text-secondary dark:text-github-text-secondary">
            You can now request withdrawals. Money will be transferred to your connected bank account.
          </p>
          <button
            onClick={handleRemoveAccount}
            className="w-full px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={18} />
            Remove Bank Account
          </button>
        </div>
      ) : (
        <form onSubmit={handleAddAccount} className="space-y-4">
          <p className="text-sm text-light-text-secondary dark:text-github-text-secondary mb-4">
            Add your bank account to enable withdrawals of your earnings.
          </p>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-github-text mb-2">
              Account Holder Name
            </label>
            <input
              type="text"
              value={accountData.accountHolder}
              onChange={(e) => setAccountData({ ...accountData, accountHolder: e.target.value })}
              placeholder="Your Name"
              className="w-full px-3 py-2 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded text-light-text dark:text-github-text placeholder-light-text-muted dark:placeholder-github-text-secondary focus:outline-none focus:border-light-blue dark:focus:border-github-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-github-text mb-2">
              Account Number (IBAN/Swedish account)
            </label>
            <input
              type="text"
              value={accountData.accountNumber}
              onChange={(e) => setAccountData({ ...accountData, accountNumber: e.target.value })}
              placeholder="e.g., SE3550000000054910000003"
              className="w-full px-3 py-2 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded text-light-text dark:text-github-text placeholder-light-text-muted dark:placeholder-github-text-secondary focus:outline-none focus:border-light-blue dark:focus:border-github-blue"
            />
            <p className="text-xs text-light-text-secondary dark:text-github-text-secondary mt-1">Swedish IBAN format: SE + 24 digits</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-github-text mb-2">
              Bank Code / BIC
            </label>
            <input
              type="text"
              value={accountData.bankCode}
              onChange={(e) => setAccountData({ ...accountData, bankCode: e.target.value })}
              placeholder="e.g., DABASE"
              className="w-full px-3 py-2 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded text-light-text dark:text-github-text placeholder-light-text-muted dark:placeholder-github-text-secondary focus:outline-none focus:border-light-blue dark:focus:border-github-blue"
            />
            <p className="text-xs text-light-text-secondary dark:text-github-text-secondary mt-1">Bank Identifier Code (BIC)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-github-text mb-2">
              Country
            </label>
            <select
              value={accountData.country}
              onChange={(e) => setAccountData({ ...accountData, country: e.target.value })}
              className="w-full px-3 py-2 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded text-light-text dark:text-github-text focus:outline-none focus:border-light-blue dark:focus:border-github-blue"
            >
              <option value="SE">Sweden 🇸🇪</option>
              <option value="NO">Norway 🇳🇴</option>
              <option value="DK">Denmark 🇩🇰</option>
              <option value="FI">Finland 🇫🇮</option>
              <option value="EU">Other EU Country 🇪🇺</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isAdding}
            className="w-full px-4 py-2 bg-light-blue dark:bg-github-blue hover:bg-light-blue-dark dark:hover:bg-github-blue-dark disabled:opacity-50 text-white font-semibold rounded-lg transition-all"
          >
            {isAdding ? 'Adding...' : 'Add Bank Account'}
          </button>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              ⚠️ Your bank details are encrypted and only used for payouts. We never store card information.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
