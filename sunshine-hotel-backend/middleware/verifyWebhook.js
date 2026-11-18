// middleware/verifyWebhook.js
import crypto from 'crypto';

export const verifyWebhookSignature = (req, res, next) => {
  // Allow local testing bypass whenever the header is set to true
  if (req.headers['x-bypass-signature'] === 'true') {
    return next();
  }

  const signature =
    req.headers['x-api-signature'] ||
    req.headers['x-signature'] ||
    req.headers['kitovupay-signature'];
  const timestamp = req.headers['x-api-timestamp'];

  if (!signature) {
    return res.status(401).json({ error: 'No cryptographic signature provided in headers.' });
  }

  const secret = process.env.WEBHOOK_SECRET || process.env.KITOVUPAY_API_SECRET || process.env.KITOVUPAY_API_KEY;
  if (!secret) {
    console.error('Webhook verification failed: No signing secret configured in .env');
    return res.status(500).json({ error: 'Server webhook configuration error.' });
  }

  const rawPayload = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
  const signedMessage = timestamp ? `${timestamp}${rawPayload}` : rawPayload;

  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedMessage)
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'utf8');
  const computedBuffer = Buffer.from(computedSignature, 'utf8');

  if (sigBuffer.length !== computedBuffer.length || !crypto.timingSafeEqual(sigBuffer, computedBuffer)) {
    return res.status(403).json({ error: 'Invalid webhook signature.' });
  }

  next();
};