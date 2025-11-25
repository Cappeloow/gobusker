import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Tip {
  id: string;
  profile_id: string;
  donor_name: string;
  amount: number;
  message?: string;
  created_at: string;
  payment_status?: string;
}

interface TipWallProps {
  profileId: string;
}

export function TipWall({ profileId }: TipWallProps) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTipForm, setShowTipForm] = useState(false);
  const [formData, setFormData] = useState({
    donor_name: '',
    donor_email: '',
    amount: 5,
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tips
  useEffect(() => {
    loadTips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const loadTips = async () => {
    try {
      setIsLoading(true);
      const { data, error: err } = await supabase
        .from('tips')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setTips(data || []);
    } catch (err) {
      console.error('Error loading tips:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitTip = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.donor_name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!formData.donor_email.trim()) {
      setError('Please enter your email');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.donor_email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (formData.amount < 1) {
      setError('Tip amount must be at least $1');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Create a temporary tip record first (before payment)
      const { data: tempTip, error: insertError } = await supabase
        .from('tips')
        .insert([
          {
            profile_id: profileId,
            donor_name: formData.donor_name.trim(),
            amount: formData.amount,
            message: formData.message.trim() || null,
            payment_status: 'pending'
          }
        ])
        .select();

      if (insertError) throw insertError;
      if (!tempTip || tempTip.length === 0) throw new Error('Failed to create tip record');

      const tipId = tempTip[0].id;

      // Redirect to Stripe checkout
      const response = await fetch('http://localhost:3000/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: formData.amount,
          profileId: profileId,
          email: formData.donor_email.trim(),
          tipId: tipId,
          tipAmount: Math.round(formData.amount * 100), // Convert to cents
        }),
      });

      const data = await response.json();
      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process tip');
      setIsSubmitting(false);
    }
  };

  const tipAmounts = [1, 5, 10, 20, 50];

  return (
    <div className="mt-8 pt-8 border-t border-github-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-github-text">💰 Tip Wall</h2>
        <button
          onClick={() => setShowTipForm(!showTipForm)}
          className="px-4 py-2 bg-github-blue hover:bg-github-blue-dark text-github-text font-semibold rounded-lg transition-all duration-200"
        >
          {showTipForm ? 'Cancel' : 'Send a Tip'}
        </button>
      </div>

      {/* Tip Form */}
      {showTipForm && (
        <div className="mb-6 p-6 bg-github-bg border border-github-border rounded-lg">
          <form onSubmit={handleSubmitTip} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-700 text-red-300 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Donor Name */}
            <div>
              <label className="block text-sm font-medium text-github-text mb-2">
                Your Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={formData.donor_name}
                onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
                className="w-full px-4 py-2 bg-github-card border border-github-border rounded-lg text-github-text placeholder-github-text-muted focus:outline-none focus:border-github-blue"
              />
            </div>

            {/* Donor Email */}
            <div>
              <label className="block text-sm font-medium text-github-text mb-2">
                Your Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={formData.donor_email}
                onChange={(e) => setFormData({ ...formData, donor_email: e.target.value })}
                className="w-full px-4 py-2 bg-github-card border border-github-border rounded-lg text-github-text placeholder-github-text-muted focus:outline-none focus:border-github-blue"
              />
            </div>

            {/* Tip Amount */}
            <div>
              <label className="block text-sm font-medium text-github-text mb-2">
                Tip Amount
              </label>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {tipAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setFormData({ ...formData, amount })}
                    className={`py-2 rounded-lg font-semibold transition-all duration-200 ${
                      formData.amount === amount
                        ? 'bg-github-blue text-github-text border border-github-blue'
                        : 'bg-github-card border border-github-border text-github-text-secondary hover:border-github-blue'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-github-card border border-github-border rounded-lg text-github-text focus:outline-none focus:border-github-blue"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-github-text mb-2">
                Message (Optional)
              </label>
              <textarea
                placeholder="Write a message..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                maxLength={150}
                rows={3}
                className="w-full px-4 py-2 bg-github-card border border-github-border rounded-lg text-github-text placeholder-github-text-muted focus:outline-none focus:border-github-blue resize-none"
              />
              <p className="text-xs text-github-text-muted mt-1">
                {formData.message.length}/150 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-github-blue hover:bg-github-blue-dark disabled:opacity-50 text-github-text font-semibold rounded-lg transition-all duration-200"
            >
              {isSubmitting ? 'Processing...' : 'Send Tip'}
            </button>
          </form>
        </div>
      )}

      {/* Tips Display */}
      {isLoading ? (
        <div className="text-center py-8 text-github-text-secondary">Loading tips...</div>
      ) : tips.length === 0 ? (
        <div className="text-center py-8 text-github-text-secondary">
          No tips yet. Be the first to support this artist!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tips.map((tip) => (
            <div
              key={tip.id}
              className="p-4 bg-github-bg border border-github-border rounded-lg hover:border-github-blue transition-all duration-200 transform hover:scale-105"
              style={{
                backgroundColor: `hsl(${Math.random() * 360}, 70%, 15%)`,
                borderColor: `hsl(${Math.random() * 360}, 70%, 40%)`
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-github-text text-sm">{tip.donor_name}</p>
                  <p className="text-xs text-github-text-muted">
                    ${tip.amount.toFixed(2)}
                  </p>
                </div>
                <span className="text-lg">💝</span>
              </div>
              {tip.message && (
                <p className="text-xs text-github-text-secondary italic">"{tip.message}"</p>
              )}
              <p className="text-xs text-github-text-muted mt-2">
                {new Date(tip.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
