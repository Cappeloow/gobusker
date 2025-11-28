"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllStripeProducts = exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
// This check ensures your app fails fast if the Stripe key is missing.
if (!process.env.STRIPE_SECRET_KEY) {
    //   throw new Error('FATAL_ERROR: STRIPE_SECRET_KEY is not set in environment variables.');
}
/**
 * A singleton instance of the Stripe client.
 *
 * Configured with the API key from your environment variables. Pinning the
 * `apiVersion` is a best practice to prevent breaking changes from
 * affecting your integration.
 */
exports.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-10-29.clover',
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
const getAllStripeProducts = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield exports.stripe.products.list({
            limit: 100, // The maximum number of products to fetch in one request.
            active: true, // Only fetch products that are currently active.
            expand: ['data.default_price'], // Embeds the default price object for each product.
        });
        return products.data;
    }
    catch (error) {
        console.error("Stripe API Error: Failed to fetch products.", error);
        // Re-throw a more specific error to be caught by the route handler.
        throw new Error("Could not fetch product list from Stripe.");
    }
});
exports.getAllStripeProducts = getAllStripeProducts;
