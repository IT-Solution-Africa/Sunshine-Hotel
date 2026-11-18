// routes/webhookRoutes.js
import express from 'express';
import { handlePaymentWebhook } from '../controllers/webhookController.js';
import { verifyWebhookSignature } from '../middleware/verifyWebhook.js';

const router = express.Router();

router.post('/payment', verifyWebhookSignature, handlePaymentWebhook);

export default router;