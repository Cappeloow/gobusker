import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  description?: string;
}

interface OrderData {
  id: string;
  status: string;
  customer_email: string;
  customer_name?: string;
  total_amount: number;
  currency: string;
  items: OrderItem[];
  created_at: string;
  payment_method?: string;
  type?: 'order' | 'tip';
  tipId?: string;
  message?: string;
}

export function Success() {
  const [searchParams] = useSearchParams();
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'success' | 'failure'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderData] = useState<OrderData | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const sessionId = searchParams.get('session_id');

    if (sessionId) {
      let attempts = 0;
      const maxAttempts = 4;

      const verifySession = () => {
        fetch(`http://localhost:3000/api/checkout/session-status?session_id=${sessionId}`)
          .then(res => {
            if (!res.ok) {
              throw new Error(`API responded with status: ${res.status}`);
            }
            return res.json();
          })
          .then(data => {
            attempts++;
            if (data.status === 'complete') {
                setSessionStatus('success');
            } else if (attempts < maxAttempts) {
                setTimeout(verifySession, 1500);
            } else {
              setSessionStatus('failure');
              setErrorMessage(data.message || 'Payment could not be verified in time.');
            }
          })
          .catch(() => {
            setSessionStatus('failure');
            setErrorMessage('An error occurred while verifying your payment. Please contact support.');
          });
      };
      verifySession();
    } else {
      setSessionStatus('failure');
      setErrorMessage('No session ID found. Payment status cannot be determined.');
    }
  }, [searchParams]);

  return (
    <div className="max-w-2xl mx-auto my-10 px-5">
      {sessionStatus === 'loading' && (
        <div className="p-10 bg-white dark:bg-secondary rounded-lg shadow-md text-center">
          <div className="text-5xl mb-5">⏳</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verifying your payment...</h2>
          <p className="text-gray-600 dark:text-gray-300">Please wait while we confirm your transaction.</p>
        </div>
      )}

      {sessionStatus === 'success' && orderData && (
        <div className="bg-white dark:bg-secondary rounded-lg shadow-md">
          {/* Success Header */}
          <div className="p-10 text-center border-b border-gray-300 dark:border-gray-600">
            <div className="text-5xl mb-5">
              {orderData.type === 'tip' ? '💰' : '✅'}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {orderData.type === 'tip' ? 'Tip Sent Successfully!' : 'Payment Successful!'}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {orderData.type === 'tip' 
                ? 'Thank you for supporting this artist!' 
                : 'Thank you for your purchase'}
            </p>
          </div>

          {/* Tip Summary (if applicable) */}
          {orderData.type === 'tip' && (
            <div className="p-7">
              <div className="mb-5 pb-5 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Tip Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">TIP AMOUNT</p>
                    <p className="text-gray-900 dark:text-white font-medium text-lg">
                      ${(orderData.total_amount / 100).toFixed(2)} {orderData.currency?.toUpperCase() || 'USD'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">DATE</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {new Date(orderData.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-4">
                <Link 
                  to="/dashboard"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* Order Summary (if order, not tip) */}
          {orderData.type !== 'tip' && (
            <div className="p-7">
            {/* Order ID & Date */}
            <div className="mb-5 pb-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Order Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ORDER ID</p>
                  <p className="text-gray-900 dark:text-white font-medium">{orderData.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">DATE</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {new Date(orderData.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-5 pb-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Customer Information</h3>
              <div className="text-sm">
                <p className="text-gray-900 dark:text-white mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">EMAIL</span>
                  {orderData.customer_email}
                </p>
                {orderData.customer_name && (
                  <p className="text-gray-900 dark:text-white">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">NAME</span>
                    {orderData.customer_name}
                  </p>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="mb-5 pb-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Items Ordered</h3>
              {orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0 ? (
                <div>
                  {orderData.items.map((item: OrderItem) => (
                    <div key={item.id} className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <div className="flex justify-between mb-2">
                        <p className="text-gray-900 dark:text-white font-medium">{item.name}</p>
                        <p className="text-gray-900 dark:text-white font-semibold">
                          {item.price && item.quantity ? ((item.price * item.quantity) / 100).toFixed(2) : 'N/A'} {orderData.currency || 'USD'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Qty: {item.quantity || 0} × {item.price ? (item.price / 100).toFixed(2) : 'N/A'} {orderData.currency || 'USD'}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No items in this order</p>
              )}
            </div>

            {/* Total */}
            <div className="mb-5 pb-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Total Amount</h3>
                <p className="text-primary font-bold text-xl">
                  {orderData.total_amount ? (orderData.total_amount / 100).toFixed(2) : '0.00'} {orderData.currency || 'USD'}
                </p>
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="p-4 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 rounded mb-5">
              <p className="text-green-700 dark:text-green-300 text-sm">
                A confirmation email has been sent to <strong>{orderData.customer_email}</strong>
              </p>
            </div>

            {/* Action Button */}
            <Link to="/dashboard" className="block text-center py-3 px-5 bg-primary text-white no-underline rounded font-medium transition-colors duration-200 hover:bg-accent">
              Go to Dashboard
            </Link>
            </div>
          )}
        </div>
      )}

      {sessionStatus === 'failure' && (
        <div className="p-10 bg-white dark:bg-secondary rounded-lg shadow-md text-center">
          <div className="text-5xl mb-5">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Verification Failed</h2>
          <p className="text-red-500 mb-5">{errorMessage}</p>
          <Link to="/dashboard" className="inline-block py-2 px-5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white no-underline rounded">
            Return to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}