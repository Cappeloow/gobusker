import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

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
  const { user } = useAuth();
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
    setIsRedirecting(priceId);

    if (!id) {
      setError('Profile ID is missing. Please try again.');
      setIsRedirecting(null);
      return;
    }

    if (!user?.email) {
      setError('User email is missing. Please log in again.');
      setIsRedirecting(null);
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          priceId,
          profileId: id,
          email: user.email
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session.');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (e: unknown) {
      console.error('Purchase failed:', e);
      setError('Could not initiate purchase. Please try again.');
      setIsRedirecting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-github-bg to-github-card p-4">
      <div className="max-w-5xl mx-auto bg-github-card border border-github-border rounded-lg p-8 shadow-xl">
        <div className="flex items-center justify-between mb-8 pb-8 border-b border-github-border">
          <h1 className="text-4xl font-bold text-github-text">Shop</h1>
          <button
            onClick={() => navigate(`/profile/${id}`)}
            className="px-6 py-2 bg-github-bg border border-github-border hover:border-github-blue text-github-text hover:text-github-blue rounded-lg font-medium transition-all duration-200"
          >
            Back to Profile
          </button>
        </div>

        {isLoading && <div className="text-center py-12 text-github-text-secondary text-lg">Loading products...</div>}

        {error && (
          <div className="text-center py-12 px-6 border-2 border-dashed border-red-700 rounded-lg bg-red-900/20">
            <h2 className="text-xl font-bold text-red-300 mb-2">Error</h2>
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!isLoading && !error && products.length === 0 && (
          <div className="text-center py-12 px-6 border-2 border-dashed border-github-border rounded-lg">
            <h2 className="text-2xl font-bold text-github-text mb-2">Shop is Empty</h2>
            <p className="text-github-text-secondary">
              This artist hasn't added any merchandise yet. Check back later!
            </p>
          </div>
        )}

        {!isLoading && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-github-bg border border-github-border rounded-lg overflow-hidden shadow-lg hover:border-github-blue transition-all duration-300 flex flex-col">
                <img src={product.images[0]} alt={product.name} className="w-full h-48 object-cover" />
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-github-text mb-2">{product.name}</h3>
                  <p className="text-github-text-secondary text-sm flex-1 mb-4">{product.description}</p>
                  <div className="flex justify-between items-center pt-4 border-t border-github-border">
                    {product.default_price ? (
                      <span className="text-xl font-bold text-github-blue">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: product.default_price.currency,
                        }).format(product.default_price.unit_amount / 100)}
                      </span>
                    ) : (
                      <span className="text-sm text-github-text-secondary">Price not set</span>
                    )}
                    <button
                      onClick={() => product.default_price && handlePurchase(product.default_price.id)}
                      disabled={!product.default_price || isRedirecting === product.id}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                        !product.default_price || isRedirecting === product.id
                          ? 'bg-github-text-secondary/30 text-github-text-muted cursor-not-allowed'
                          : 'bg-github-blue hover:bg-github-blue-dark text-github-text'
                      }`}
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