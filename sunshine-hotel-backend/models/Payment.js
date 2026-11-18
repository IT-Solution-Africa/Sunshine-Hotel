// models/Payment.js
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  reservation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true },
  transaction_ref: { type: String, required: true, unique: true, index: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Success', 'Failed', 'Pending'], default: 'Pending' },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model('Payment', paymentSchema);