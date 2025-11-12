import { Router, Request, Response } from 'express';
import { getAllStripeProducts } from '../services/stripe';

// Create a new router instance to encapsulate product-related routes.
export const productRouter = Router();

/**
 * GET /api/products
 *
 * An endpoint to retrieve and display all active products from the Stripe catalog.
 * It features robust error handling to ensure server stability.
 */
productRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const products = await getAllStripeProducts();
    res.status(200).json(products);
  } catch (error) {
    console.error("Error in /api/products route:", error);
    // Send a generic, user-friendly error message to the client.
    res.status(500).json({
      statusCode: 500,
      message: "An error occurred while fetching products. Please try again later."
    });
  }
});
