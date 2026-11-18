import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  guest_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', required: true },
  room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  check_in_date: { type: Date, required: true },
  check_out_date: { type: Date, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Cancelled'],
    default: 'Pending',
  },
  created_at: { type: Date, default: Date.now },
});

// Add index here to speed up date-overlap checks and conflict queries
reservationSchema.index({ room_id: 1, status: 1, check_in_date: 1, check_out_date: 1 });

export default mongoose.model('Reservation', reservationSchema);