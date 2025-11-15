import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export function Success() {
  const [searchParams] = useSearchParams();
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'success' | 'failure'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
        // Use a relative URL. This is more robust than hardcoding localhost.
        // Ensure you have a proxy setup in your vite.config.ts or package.json.
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
                console.log("1");
                setSessionStatus('success');
            } else if (attempts < maxAttempts) {
                console.log("2");
                console.log(`Attempt ${attempts}: Status is '${data.status}'. Retrying...`);
                setTimeout(verifySession, 1500); // Wait 1.5 seconds before retrying
            } else {
                console.log("3");
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
    console.log(sessionId,"No session ID found in URL.");
      setSessionStatus('failure');
      setErrorMessage('No session ID found. Payment status cannot be determined.');
    }
  }, [searchParams]);

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
      {sessionStatus === 'loading' && (
        <>
          <div style={{ fontSize: '3em', marginBottom: '20px' }}>⏳</div>
          <h2>Verifying your payment...</h2>
          <p>Please wait while we confirm your transaction.</p>
        </>
      )}

      {sessionStatus === 'success' && (
        <>
          <div style={{ fontSize: '3em', marginBottom: '20px' }}>✅</div>
          <h2>Payment Successful!</h2>
          <p>Thank you for your purchase. A confirmation has been sent to your email.</p>
          <Link to="/dashboard" style={{ display: 'inline-block', marginTop: '20px', padding: '10px 20px', backgroundColor: '#4caf50', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
            Go to Dashboard
          </Link>
        </>
      )}

      {sessionStatus === 'failure' && (
        <>
          <div style={{ fontSize: '3em', marginBottom: '20px' }}>❌</div>
          <h2>Payment Verification Failed</h2>
          <p style={{ color: '#f44336' }}>{errorMessage}</p>
          <Link to="/dashboard" style={{ display: 'inline-block', marginTop: '20px', padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', textDecoration: 'none', borderRadius: '4px' }}>
            Return to Dashboard
          </Link>
        </>
      )}
    </div>
  );
}