import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import { sanitizeInput } from './middleware/sanitization.js';
import bookingRoutes from './routes/bookingRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import roomRoutes from './routes/roomRoutes.js';

dotenv.config();

connectDB();

const app = express();

app.use(helmet());
app.use(cors());

// Rate limiter to prevent spam or abuse on booking attempts
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 booking requests per window
  message: { error: 'Too many booking requests from this IP, please try again later.' },
});

// Capture raw body buffer specifically for webhook cryptographic signature verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Global Input Sanitization Middleware (Prevent NoSQL Injection)
app.use(sanitizeInput);

// Apply rate limiting specifically to the booking initiation endpoint
app.use('/api/bookings/initiate', bookingLimiter);

// API Routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/rooms', roomRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Sunshine Hotel Backend is running successfully! 🚀', 
    status: 'OK',
    timestamp: new Date() 
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Sunshine Hotel Backend running on port ${PORT}`);
});