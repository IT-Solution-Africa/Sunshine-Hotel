// controllers/bookingController.js
import mongoose from 'mongoose';
import Room from '../models/Room.js';
import Guest from '../models/Guest.js';
import Reservation from '../models/Reservation.js';
import Payment from '../models/Payment.js';
import { requestKitovuCollection } from '../services/kitovuPayService.js';

// GET /api/rooms/availability
export const checkAvailability = async (req, res) => {
  try {
    const { check_in_date, check_out_date } = req.query;
    if (!check_in_date || !check_out_date) {
      return res.status(400).json({ error: 'check_in_date and check_out_date query parameters are required.' });
    }

    const requestedCheckIn = new Date(check_in_date);
    const requestedCheckOut = new Date(check_out_date);

    if (requestedCheckIn >= requestedCheckOut) {
      return res.status(400).json({ error: 'check_out_date must be strictly after check_in_date.' });
    }

    // Find overlapping active or pending reservations
    const overlappingReservations = await Reservation.find({
      status: { $in: ['Pending', 'Confirmed'] },
      check_in_date: { $lt: requestedCheckOut },
      check_out_date: { $gt: requestedCheckIn },
    });

    const bookedRoomIds = overlappingReservations.map((r) => r.room_id.toString());

    // Get available rooms excluding booked ones
    const availableRooms = await Room.find({
      _id: { $nin: bookedRoomIds },
    });

    res.status(200).json({ availableRooms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/bookings/initiate
export const initiateBooking = async (req, res) => {
  try {
    const { full_name, email, phone, room_number, check_in_date, check_out_date, bypass_gateway } = req.body;

    if (!full_name || !email || !phone || !room_number || !check_in_date || !check_out_date) {
      return res.status(400).json({ error: 'All booking fields (full_name, email, phone, room_number, check_in_date, check_out_date) are required.' });
    }

    const room = await Room.findOne({ room_number });
    if (!room) {
      return res.status(404).json({ error: 'Room not found with the specified 3-digit number.' });
    }

    const requestedCheckIn = new Date(check_in_date);
    const requestedCheckOut = new Date(check_out_date);

    if (isNaN(requestedCheckIn.getTime()) || isNaN(requestedCheckOut.getTime())) {
      return res.status(400).json({ error: 'Invalid date format for check_in_date or check_out_date.' });
    }

    if (requestedCheckIn >= requestedCheckOut) {
      return res.status(400).json({ error: 'check_out_date must be strictly after check_in_date.' });
    }

    // Enforce overlap validation check to prevent double booking
    const conflict = await Reservation.findOne({
      room_id: room._id,
      status: { $in: ['Pending', 'Confirmed'] },
      check_in_date: { $lt: requestedCheckOut },
      check_out_date: { $gt: requestedCheckIn },
    });

    if (conflict) {
      return res.status(409).json({ error: 'Room is already booked for the selected date range.' });
    }

    // Find or create guest
    let guest = await Guest.findOne({ email });
    if (!guest) {
      guest = await Guest.create({ full_name, email, phone });
    }

    // Create Reservation with "Pending" status
    const reservation = await Reservation.create({
      guest_id: guest._id,
      room_id: room._id,
      check_in_date: requestedCheckIn,
      check_out_date: requestedCheckOut,
      status: 'Pending',
    });

    // Calculate total price based on nights
    const nights = Math.ceil((requestedCheckOut - requestedCheckIn) / (1000 * 60 * 60 * 24));
    const amount = room.price * (nights > 0 ? nights : 1);

    // Generate unique transaction reference for payment gateway
    const transaction_ref = `SUN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payment = await Payment.create({
      reservation_id: reservation._id,
      transaction_ref,
      amount,
      status: 'Pending',
    });

    let gatewayResponse = { message: 'Gateway bypassed for testing' };

    // Trigger KitovuPay Collection API request unless bypassed
    if (!bypass_gateway) {
      try {
        gatewayResponse = await requestKitovuCollection({
          refid: transaction_ref,
          amount: amount,
          currency: 'RWF',
          phone: phone,
          email: email,
          name: full_name,
          description: `Sunshine Hotel Booking - Room ${room_number}`,
        });
      } catch (gatewayError) {
        // Roll back Pending status so a failed gateway request does not permanently lock the room
        payment.status = 'Failed';
        await payment.save();

        reservation.status = 'Cancelled';
        await reservation.save();

        return res.status(502).json({
          error: 'Payment gateway trigger failed and room lock was released: ' + gatewayError.message,
          reservation_id: reservation._id,
          transaction_ref,
        });
      }
    }

    res.status(201).json({
      message: 'Booking initialized successfully.',
      transaction_ref,
      amount,
      reservation_id: reservation._id,
      gateway_response: gatewayResponse,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// GET /api/bookings (Get all reservations with guest and room details)
export const getAllBookings = async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate('guest_id', 'full_name email phone')
      .populate('room_id', 'room_number category price')
      .sort({ createdAt: -1 });

    res.status(200).json({ count: reservations.length, reservations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/bookings/:id (Get single reservation + associated payment)
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid reservation ID format.' });
    }

    const reservation = await Reservation.findById(id)
      .populate('guest_id', 'full_name email phone')
      .populate('room_id', 'room_number category price');

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    const payment = await Payment.findOne({ reservation_id: reservation._id });

    res.status(200).json({ reservation, payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/bookings/:id (Update reservation dates, room, or status)
export const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { room_number, check_in_date, check_out_date, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid reservation ID format.' });
    }

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    let targetRoomId = reservation.room_id;
    let roomPrice = null;

    // If changing room, verify the new 3-digit room exists
    if (room_number) {
      const room = await Room.findOne({ room_number });
      if (!room) {
        return res.status(404).json({ error: 'Room not found with the specified 3-digit number.' });
      }
      targetRoomId = room._id;
      roomPrice = room.price;
    }

    const updatedCheckIn = check_in_date ? new Date(check_in_date) : reservation.check_in_date;
    const updatedCheckOut = check_out_date ? new Date(check_out_date) : reservation.check_out_date;

    if (updatedCheckIn >= updatedCheckOut) {
      return res.status(400).json({ error: 'check_out_date must be strictly after check_in_date.' });
    }

    // Re-run overlap check excluding the current reservation itself
    if (room_number || check_in_date || check_out_date) {
      const conflict = await Reservation.findOne({
        _id: { $ne: reservation._id },
        room_id: targetRoomId,
        status: { $in: ['Pending', 'Confirmed'] },
        check_in_date: { $lt: updatedCheckOut },
        check_out_date: { $gt: updatedCheckIn },
      });

      if (conflict) {
        return res.status(409).json({ error: 'Target room is already booked for the updated dates.' });
      }
    }

    reservation.room_id = targetRoomId;
    reservation.check_in_date = updatedCheckIn;
    reservation.check_out_date = updatedCheckOut;
    if (status) reservation.status = status;

    await reservation.save();

    // Recalculate pending payment amount if dates or room changed
    if (room_number || check_in_date || check_out_date) {
      const roomDoc = roomPrice ? { price: roomPrice } : await Room.findById(targetRoomId);
      const nights = Math.ceil((updatedCheckOut - updatedCheckIn) / (1000 * 60 * 60 * 24));
      const updatedAmount = roomDoc.price * (nights > 0 ? nights : 1);

      await Payment.findOneAndUpdate(
        { reservation_id: reservation._id, status: 'Pending' },
        { amount: updatedAmount }
      );
    }

    res.status(200).json({
      message: 'Reservation updated successfully.',
      reservation,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/bookings/:id (Cancel/Delete a reservation)
export const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid reservation ID format.' });
    }

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    if (reservation.status === 'Confirmed') {
      return res.status(400).json({ error: 'Cannot delete a confirmed reservation. Cancel it instead.' });
    }

    await Payment.deleteMany({ reservation_id: reservation._id });
    await reservation.deleteOne();

    res.status(200).json({ message: 'Reservation and associated records deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};