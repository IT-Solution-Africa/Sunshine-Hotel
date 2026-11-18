import Room from '../models/Room.js';
import mongoose from 'mongoose';

// GET /api/rooms
export const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find();
    res.status(200).json({ count: rooms.length, rooms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/rooms/:id
export const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid room ID format.' });
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    res.status(200).json({ room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/rooms
export const createRoom = async (req, res) => {
  try {
    const { room_number, category, price } = req.body;

    const existingRoom = await Room.findOne({ room_number });
    if (existingRoom) {
      return res.status(400).json({ error: 'Room number already exists.' });
    }

    const room = await Room.create({ room_number, category, price });
    res.status(201).json({ message: 'Room created successfully', room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/rooms/:id
export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { room_number, category, price } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid room ID format.' });
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    // If changing room number, check if it's already taken
    if (room_number && room_number !== room.room_number) {
      const existingRoom = await Room.findOne({ room_number });
      if (existingRoom) {
        return res.status(400).json({ error: 'Room number already in use by another room.' });
      }
      room.room_number = room_number;
    }

    if (category) room.category = category;
    if (price !== undefined) room.price = price;

    await room.save();
    res.status(200).json({ message: 'Room updated successfully', room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/rooms/:id
export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid room ID format.' });
    }

    const room = await Room.findByIdAndDelete(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    res.status(200).json({ message: 'Room deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};