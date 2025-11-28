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
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRouter = void 0;
const express_1 = require("express");
const stripe_1 = require("../services/stripe");
// Create a new router instance to encapsulate product-related routes.
exports.productRouter = (0, express_1.Router)();
/**
 * GET /api/products
 *
 * An endpoint to retrieve and display all active products from the Stripe catalog.
 * It features robust error handling to ensure server stability.
 */
exports.productRouter.get('/products', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield (0, stripe_1.getAllStripeProducts)();
        res.status(200).json(products);
    }
    catch (error) {
        console.error("Error in /api/products route:", error);
        // Send a generic, user-friendly error message to the client.
        res.status(500).json({
            statusCode: 500,
            message: "An error occurred while fetching products. Please try again later."
        });
    }
}));
