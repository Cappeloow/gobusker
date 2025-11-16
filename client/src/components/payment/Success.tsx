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
}

export function Success() {
  const [searchParams] = useSearchParams();
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'success' | 'failure'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const sessionId = searchParams.get('session_id');

    if (sessionId) {
        console.log(sessionId, "session ID found, verifying...");
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
            console.log('Payment verification response:', data);
            if (data.status === 'complete') {
                console.log("Payment complete, setting order data");
                setOrderData(data);
                setSessionStatus('success');
            } else if (attempts < maxAttempts) {
                console.log(`Attempt ${attempts}: Status is '${data.status}'. Retrying...`);
                setTimeout(verifySession, 1500);
            } else {
              setSessionStatus('failure');
              setErrorMessage(data.message || 'Payment could not be verified in time.');
            }
          })
          .catch(error => {
            console.error('Error verifying session:', error);
            setSessionStatus('failure');
            setErrorMessage('An error occurred while verifying your payment. Please contact support.');
          });
      };
      verifySession();
    } else {
    console.log("No session ID found in URL.");
      setSessionStatus('failure');
      setErrorMessage('No session ID found. Payment status cannot be determined.');
    }
  }, [searchParams]);

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      {sessionStatus === 'loading' && (
        <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '3em', marginBottom: '20px' }}>⏳</div>
          <h2>Verifying your payment...</h2>
          <p>Please wait while we confirm your transaction.</p>
        </div>
      )}

      {sessionStatus === 'success' && orderData && (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          {/* Success Header */}
          <div style={{ padding: '40px', textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: '3em', marginBottom: '20px' }}>✅</div>
            <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>Payment Successful!</h2>
            <p style={{ margin: '0', color: '#666' }}>Thank you for your purchase</p>
          </div>

          {/* Order Summary */}
          <div style={{ padding: '30px' }}>
            {/* Order ID & Date */}
            <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '16px' }}>Order Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '14px' }}>
                <div>
                  <p style={{ margin: '0 0 5px 0', color: '#999', fontSize: '12px' }}>ORDER ID</p>
                  <p style={{ margin: '0', color: '#333', fontWeight: '500' }}>{orderData.id}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 5px 0', color: '#999', fontSize: '12px' }}>DATE</p>
                  <p style={{ margin: '0', color: '#333', fontWeight: '500' }}>
                    {new Date(orderData.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '16px' }}>Customer Information</h3>
              <div style={{ fontSize: '14px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#333' }}>
                  <span style={{ color: '#999', fontSize: '12px', display: 'block', marginBottom: '3px' }}>EMAIL</span>
                  {orderData.customer_email}
                </p>
                {orderData.customer_name && (
                  <p style={{ margin: '0', color: '#333' }}>
                    <span style={{ color: '#999', fontSize: '12px', display: 'block', marginBottom: '3px' }}>NAME</span>
                    {orderData.customer_name}
                  </p>
                )}
              </div>
            </div>

            {/* Items */}
            <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '16px' }}>Items Ordered</h3>
              {orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0 ? (
                <div>
                  {orderData.items.map((item: OrderItem) => (
                    <div key={item.id} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <p style={{ margin: '0', color: '#333', fontWeight: '500' }}>{item.name}</p>
                        <p style={{ margin: '0', color: '#333', fontWeight: '600' }}>
                          {item.price && item.quantity ? ((item.price * item.quantity) / 100).toFixed(2) : 'N/A'} {orderData.currency || 'USD'}
                        </p>
                      </div>
                      <p style={{ margin: '0 0 5px 0', color: '#999', fontSize: '13px' }}>
                        Qty: {item.quantity || 0} × {item.price ? (item.price / 100).toFixed(2) : 'N/A'} {orderData.currency || 'USD'}
                      </p>
                      {item.description && (
                        <p style={{ margin: '0', color: '#999', fontSize: '13px', fontStyle: 'italic' }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: '0', color: '#999' }}>No items in this order</p>
              )}
            </div>

            {/* Total */}
            <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: '0', color: '#333', fontSize: '16px' }}>Total Amount</h3>
                <p style={{ margin: '0', color: '#182632', fontWeight: '700', fontSize: '20px' }}>
                  {orderData.total_amount ? (orderData.total_amount / 100).toFixed(2) : '0.00'} {orderData.currency || 'USD'}
                </p>
              </div>
            </div>

            {/* Confirmation Message */}
            <div style={{ padding: '15px', backgroundColor: '#f0f8f0', borderLeft: '4px solid #4caf50', borderRadius: '4px', marginBottom: '20px' }}>
              <p style={{ margin: '0', color: '#2e7d32', fontSize: '14px' }}>
                A confirmation email has been sent to <strong>{orderData.customer_email}</strong>
              </p>
            </div>

            {/* Action Button */}
            <Link to="/dashboard" style={{ display: 'block', textAlign: 'center', padding: '12px 20px', backgroundColor: '#182632', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: '500', transition: 'background-color 0.2s' }}>
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}

      {sessionStatus === 'failure' && (
        <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '3em', marginBottom: '20px' }}>❌</div>
          <h2>Payment Verification Failed</h2>
          <p style={{ color: '#f44336', marginBottom: '20px' }}>{errorMessage}</p>
          <Link to="/dashboard" style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', textDecoration: 'none', borderRadius: '4px' }}>
            Return to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}