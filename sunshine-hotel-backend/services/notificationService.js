// services/notificationService.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendFrontDeskAlert = async (reservationDetails) => {
  const { guest, room, reservation, payment } = reservationDetails;

  const mailOptions = {
    from: `"Sunshine Hotel Booking System" <${process.env.SMTP_USER}>`,
    to: process.env.FRONT_DESK_EMAIL,
    subject: `🚨 New Confirmed Booking - Room ${room.room_number}`,
    html: `
      <h2>New Confirmed Reservation (Manual HMS Logging Required)</h2>
      <p><strong>Guest Name:</strong> ${guest.full_name}</p>
      <p><strong>Email:</strong> ${guest.email}</p>
      <p><strong>Phone:</strong> ${guest.phone}</p>
      <p><strong>Room Number:</strong> ${room.room_number} (${room.category})</p>
      <p><strong>Check-In Date:</strong> ${new Date(reservation.check_in_date).toDateString()}</p>
      <p><strong>Check-Out Date:</strong> ${new Date(reservation.check_out_date).toDateString()}</p>
      <p><strong>Transaction Ref:</strong> ${payment.transaction_ref}</p>
      <p><strong>Amount Paid:</strong> RWF ${payment.amount}</p>
      <hr />
      <p style="color: red; font-weight: bold;">Action Required: Please record this booking immediately into the Smart Biashara HMS.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Front desk notification dispatched for room ${room.room_number}`);
  } catch (error) {
    console.error(`Failed to dispatch front desk notification: ${error.message}`);
  }
};