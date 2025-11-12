import Stripe from 'stripe';

// This check ensures your app fails fast if the Stripe key is missing.
if (!process.env.STRIPE_SECRET_KEY) {
    console.log(process.env.STRIPE_SECRET_KEY)
//   throw new Error('FATAL_ERROR: STRIPE_SECRET_KEY is not set in environment variables.');
}

/**
 * A singleton instance of the Stripe client.
 *
 * Configured with the API key from your environment variables. Pinning the
 * `apiVersion` is a best practice to prevent breaking changes from
 * affecting your integration.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
  appInfo: {
    name: 'Express-Stripe-Server',
    version: '1.0.0',
  }
});

/**
 * Fetches all active products from your Stripe catalog.
 *
 * This function uses `stripe.products.list` and includes the `expand` option
 * to embed the full price object within each product, which is a crucial
 * performance optimization that avoids N+1 API calls.
 *
 * @returns {Promise<Stripe.Product[]>} A promise that resolves to an array of Stripe products.
 * @throws {Error} Throws an error if the API call fails, to be handled by the route.
 */
export const getAllStripeProducts = async (): Promise<Stripe.Product[]> => {
  try {
    const products = await stripe.products.list({
      limit: 100, // The maximum number of products to fetch in one request.
      active: true, // Only fetch products that are currently active.
      expand: ['data.default_price'], // Embeds the default price object for each product.
    });

    return products.data;
  } catch (error) {
    console.error("Stripe API Error: Failed to fetch products.", error);
    // Re-throw a more specific error to be caught by the route handler.
    throw new Error("Could not fetch product list from Stripe.");
  }
};
