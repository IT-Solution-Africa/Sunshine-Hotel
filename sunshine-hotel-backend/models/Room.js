// models/Room.js
import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  room_number: {
    type: String,
    required: true,
    unique: true,
    match: /^[1-4]0[1-6]$/,
  },
  category: {
    type: String,
    required: true,
    enum: ['Standard', 'Deluxe', 'Suite'],
  },
  price: {
    type: Number,
    required: true,
  },
  max_occupancy: {
    type: Number,
    required: true,
    default: 2,
  },
});

export default mongoose.model('Room', roomSchema);