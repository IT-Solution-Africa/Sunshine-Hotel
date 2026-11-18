// controllers/webhookController.js
import Payment from '../models/Payment.js';
import Reservation from '../models/Reservation.js';
import Guest from '../models/Guest.js';
import Room from '../models/Room.js';
import { sendFrontDeskAlert } from '../services/notificationService.js';

// POST /api/webhooks/payment
export const handlePaymentWebhook = async (req, res) => {
  try {
    // Support both flat payloads and nested { data: { ... } } gateway payloads
    const payload = req.body?.data || req.body;
    const transaction_ref =
      payload.transaction_ref || payload.reference || payload.transactionReference || payload.tx_ref;
    const rawStatus = payload.status || payload.transaction_status;

    if (!transaction_ref || !rawStatus) {
      return res.status(400).json({ error: 'Invalid webhook payload structure.' });
    }

    const normalizedStatus = String(rawStatus).trim().toUpperCase();

    // Find payment record by unique transaction reference
    const payment = await Payment.findOne({ transaction_ref });
    if (!payment) {
      return res.status(404).json({ error: 'Transaction reference not found.' });
    }

    // Idempotency check: If already processed successfully, return 200 immediately
    if (payment.status === 'Success') {
      return res.status(200).json({ message: 'Webhook already processed (Idempotent success).' });
    }

    // Ignore intermediate pending/processing webhooks without failing the booking
    if (['PENDING', 'PROCESSING', 'INITIATED'].includes(normalizedStatus)) {
      return res.status(200).json({ message: 'Payment still processing.' });
    }

    if (['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'PAID'].includes(normalizedStatus)) {
      payment.status = 'Success';
      await payment.save();

      // Update reservation status to Confirmed
      const reservation = await Reservation.findById(payment.reservation_id);
      if (reservation) {
        reservation.status = 'Confirmed';
        await reservation.save();

        const guest = await Guest.findById(reservation.guest_id);
        const room = await Room.findById(reservation.room_id);

        // Isolate email errors so Nodemailer issues don't cause gateway webhook retries
        try {
          await sendFrontDeskAlert({ guest, room, reservation, payment });
        } catch (emailError) {
          console.error('Front desk alert email failed after payment confirmation:', emailError.message);
        }
      }

      return res.status(200).json({ message: 'Payment verified and reservation confirmed.' });
    } else {
      // Payment failed/cancelled -> mark payment Failed AND release the Pending room lock
      payment.status = 'Failed';
      await payment.save();

      await Reservation.findByIdAndUpdate(payment.reservation_id, { status: 'Cancelled' });

      return res.status(200).json({ message: 'Payment failure logged and room lock released.' });
    }
  } catch (error) {
    console.error('Webhook processing error:', error.message);
    res.status(500).json({ error: error.message });
  }
};