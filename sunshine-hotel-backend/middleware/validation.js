// middleware/validation.js
export const validateBookingRequest = (req, res, next) => {
  const { full_name, email, phone, room_number, check_in_date, check_out_date } = req.body;

  if (!full_name || !email || !phone || !room_number || !check_in_date || !check_out_date) {
    return res.status(400).json({ error: 'Missing required booking fields.' });
  }

  const checkIn = new Date(check_in_date);
  const checkOut = new Date(check_out_date);

  if (checkIn >= checkOut) {
    return res.status(400).json({ error: 'check_out_date must be strictly after check_in_date.' });
  }

  next();
};