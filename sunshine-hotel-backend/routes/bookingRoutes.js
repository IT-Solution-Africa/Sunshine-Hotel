// routes/bookingRoutes.js
import express from 'express';
import {
  checkAvailability,
  initiateBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
} from '../controllers/bookingController.js';
import { validateBookingRequest } from '../middleware/validation.js';

const router = express.Router();

router.get('/availability', checkAvailability);
router.post('/initiate', validateBookingRequest, initiateBooking);

router.get('/', getAllBookings);
router.get('/:id', getBookingById);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

export default router;