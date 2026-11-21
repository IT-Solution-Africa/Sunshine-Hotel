import axios from 'axios';
import crypto from 'crypto';

const generateKitovuHeaders = (payload) => {
  const username = process.env.KITOVUPAY_USERNAME?.trim();
  const password = process.env.KITOVUPAY_PASSWORD?.trim();
  const apiKey = process.env.KITOVUPAY_API_KEY?.trim();
  // Check your KitovuPay docs to confirm if HMAC uses a separate secret or the API key
  const hmacSecret = (process.env.KITOVUPAY_HMAC_SECRET || apiKey)?.trim();

  if (!username || !password || !apiKey) {
    throw new Error('Missing KitovuPay credentials in environment variables.');
  }

  const basicAuthToken = Buffer.from(`${username}:${password}`).toString('base64');
  const timestamp = Date.now().toString(); // Check if docs specify seconds vs milliseconds or ISO string
  const rawBody = JSON.stringify(payload);

  // Verify the exact string format required by KitovuPay docs (e.g., `${timestamp}${rawBody}` or just `rawBody`)
  const signature = crypto
    .createHmac('sha256', hmacSecret)
    .update(`${timestamp}${rawBody}`)
    .digest('hex');

  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Basic ${basicAuthToken}`,
    'x-api-key': apiKey,
    // Verify the exact header names in your KitovuPay docs:
    'x-api-signature': signature,
    'x-api-timestamp': timestamp,
  };
};

export const requestKitovuCollection = async (paymentData) => {
  try {
    const headers = generateKitovuHeaders(paymentData);
    const baseUrl = process.env.KITOVUPAY_BASE_URL?.trim().replace(/\/+$/, '');
    const endpoint = `${baseUrl}/merchant-transaction/merchant/collection/mobile_money`;

    console.log('Attempting KitovuPay request to:', endpoint);

    const response = await axios.post(endpoint, paymentData, {
      headers,
      timeout: 15000,
    });

    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const errorData = error.response?.data;

    console.error('KitovuPay HTTP Status:', status);
    console.error('KitovuPay Response Data:', errorData);

    // Surface the exact gateway message (like "Missing HMAC headers") instead of masking it
    const gatewayMessage = errorData?.message || error.message;
    throw new Error(`KitovuPay Error (${status || 'Network'}): ${gatewayMessage}`);
  }
};