import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export function ProfileShop() {
  // This interface now accurately reflects the Stripe Product object from your API
  interface Product {
    id: string;
    name: string;
    description: string | null;
    images: string[];
    default_price: {
      id: string; // The Price ID is essential for checkout
      unit_amount: number;
      currency: string;
    } | null;
  }

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState<string | null>(null); // To show feedback

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:3000/api/products');
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data: Product[] = await response.json();
        setProducts(data);
      } catch (e: any) {
        console.error("Failed to fetch products:", e);
        setError(e.message || "An unknown error occurred while fetching products.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handlePurchase = async (priceId: string) => {
    setIsRedirecting(priceId); // Set loading state for the specific button

    try {
      const response = await fetch('http://localhost:3000/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session.');
      }

      const { url } = await response.json();
      // Redirect the user to the Stripe Checkout page
      window.location.href = url;
    } catch (e: any) {
      console.error('Purchase failed:', e);
      setError('Could not initiate purchase. Please try again.');
      setIsRedirecting(null); // Reset loading state on error
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '40px auto',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '30px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h1 style={{ marginBottom: '10px' }}>Shop</h1>
          <button
            onClick={() => navigate(`/profile/${id}`)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f5f5f5',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Profile
          </button>
        </div>

        {isLoading && <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading products...</div>}

        {error && (
          <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #f44336', borderRadius: '8px', color: '#f44336' }}>
            <h2>Error</h2>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #ddd', borderRadius: '8px' }}>
            <h2 style={{ color: '#555' }}>Shop is Empty</h2>
            <p style={{ color: '#777', marginTop: '10px' }}>
              This artist hasn't added any merchandise yet. Check back later!
            </p>
          </div>
        )}

        {!isLoading && products.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            {products.map((product) => (
              <div key={product.id} style={{
                border: '1px solid #eee',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1em' }}>{product.name}</h3>
                  <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9em', flex: 1 }}>{product.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    {product.default_price ? (
                      <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: product.default_price.currency,
                        }).format(product.default_price.unit_amount / 100)}
                      </span>
                    ) : (
                      <span style={{ fontSize: '1em', color: '#777' }}>Price not set</span>
                    )}
                    <button
                      onClick={() => product.default_price && handlePurchase(product.default_price.id)}
                      disabled={!product.default_price || isRedirecting === product.id}
                      style={{
                        padding: '8px 12px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                        opacity: !product.default_price || isRedirecting === product.id ? 0.5 : 1,
                      }}
                    >
                      {isRedirecting === product.id ? 'Redirecting...' : 'Buy Now'}
                    </button>
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