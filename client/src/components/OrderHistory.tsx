import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  profile_id: string;
  stripe_session_id: string;
  customer_email: string;
  customer_name?: string;
  total_amount: number;
  currency: string;
  payment_status: string;
  items: OrderItem[];
  created_at: string;
}

export function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user?.id) {
          setError('You must be logged in to view orders');
          setIsLoading(false);
          return;
        }

        // Fetch orders for the current user's profiles
        const { data, error: dbError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbError) {
          throw dbError;
        }

        setOrders(data || []);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load order history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (amount: number, currency: string) => {
    return (amount / 100).toLocaleString('en-US', {
      style: 'currency',
      currency
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">Loading order history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
        <p className="text-gray-600 mt-1">Track all your purchases</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <p className="text-gray-500 text-lg">No orders yet</p>
          <p className="text-gray-400 text-sm mt-1">Your purchases will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              {/* Order Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Order ID</p>
                    <p className="font-mono text-sm text-gray-700">{order.stripe_session_id.slice(0, 12)}...</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date</p>
                    <p className="text-sm text-gray-700">{formatDate(order.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                    <p className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {order.payment_status === 'paid' ? '✓ Paid' : order.payment_status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Items</p>
                    <p className="text-sm font-semibold text-gray-900">{order.items?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Currency</p>
                    <p className="text-sm text-gray-700">{order.currency}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Amount</p>
                    <p className="text-lg font-bold text-gray-900">{formatPrice(order.total_amount, order.currency)}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="p-6 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 mb-3">Items Purchased</p>
                <div className="space-y-2">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <div>
                          <p className="text-gray-700 font-medium">{item.name}</p>
                          <p className="text-gray-500 text-xs">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-gray-900 font-semibold">{formatPrice(item.price * item.quantity, order.currency)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No items information available</p>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-6 bg-gray-50">
                <p className="text-sm font-semibold text-gray-900 mb-2">Customer Information</p>
                <div className="space-y-1">
                  <p className="text-sm text-gray-700">
                    <span className="text-gray-500">Email:</span> {order.customer_email}
                  </p>
                  {order.customer_name && (
                    <p className="text-sm text-gray-700">
                      <span className="text-gray-500">Name:</span> {order.customer_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
