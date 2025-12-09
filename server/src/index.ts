import dotenv from 'dotenv';
// Load environment variables from a .env file at the very top.
dotenv.config();

import express from 'express';
import { productRouter } from './routes/productRoutes'; // Import the product router
import { checkoutRouter } from './routes/checkoutRoutes'; // Import the new checkout router
import { withdrawalRouter } from './routes/withdrawalRoutes'; // Import the withdrawal router
import inviteRouter from './routes/inviteRoutes'; // Import the invite router


const app = express();
const PORT = process.env.PORT || 3000;
import cors from 'cors'; 
const corsOptions = {
  origin: 'http://localhost:5173', 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
};

// Apply CORS middleware
app.use(cors(corsOptions));
// --- Middleware ---
app.use(express.json()); // For parsing application/json bodies

// --- Routes ---
// A simple health-check route to confirm the server is running.
app.get('/health', (req, res) => {
  res.status(200).send({ status: 'UP', timestamp: new Date().toISOString() });
});

// Register your product routes under the `/api` namespace.
// All routes in `productRouter` will be prefixed with `/api`.
// Example: GET /api/products
app.use('/api', productRouter);
app.use('/api/checkout', checkoutRouter); // Register the checkout routes
app.use('/api/withdrawals', withdrawalRouter); // Register the withdrawal routes
app.use('/api/invites', inviteRouter); // Register the invite routes

// --- Server Activation ---
app.listen(PORT, () => {
  console.log(`🚀 Server is running and listening on http://localhost:${PORT}`);
});
