"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from a .env file at the very top.
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const productRoutes_1 = require("./routes/productRoutes"); // Import the product router
const checkoutRoutes_1 = require("./routes/checkoutRoutes"); // Import the new checkout router
const withdrawalRoutes_1 = require("./routes/withdrawalRoutes"); // Import the withdrawal router
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const cors_1 = __importDefault(require("cors"));
const corsOptions = {
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
};
// Apply CORS middleware
app.use((0, cors_1.default)(corsOptions));
// --- Middleware ---
app.use(express_1.default.json()); // For parsing application/json bodies
// --- Routes ---
// A simple health-check route to confirm the server is running.
app.get('/health', (req, res) => {
    res.status(200).send({ status: 'UP', timestamp: new Date().toISOString() });
});
// Register your product routes under the `/api` namespace.
// All routes in `productRouter` will be prefixed with `/api`.
// Example: GET /api/products
app.use('/api', productRoutes_1.productRouter);
app.use('/api/checkout', checkoutRoutes_1.checkoutRouter); // Register the checkout routes
app.use('/api/withdrawals', withdrawalRoutes_1.withdrawalRouter); // Register the withdrawal routes
// --- Server Activation ---
app.listen(PORT, () => {
    console.log(`🚀 Server is running and listening on http://localhost:${PORT}`);
});
