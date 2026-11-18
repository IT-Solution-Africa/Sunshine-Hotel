// models/Guest.js
import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema({
  full_name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model('Guest', guestSchema);