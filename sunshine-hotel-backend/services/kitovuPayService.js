import axios from 'axios';

const generateKitovuHeaders = () => {
  const username = process.env.KITOVUPAY_USERNAME?.trim();
  const password = process.env.KITOVUPAY_PASSWORD?.trim();
  const apiKey = process.env.KITOVUPAY_API_KEY?.trim();

  if (!username || !password || !apiKey) {
    throw new Error('Missing KitovuPay credentials in environment variables.');
  }

  const basicAuthToken = Buffer.from(`${username}:${password}`).toString('base64');

  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Basic ${basicAuthToken}`,
    'x-api-key': apiKey,
  };
};

export const requestKitovuCollection = async (paymentData) => {
  try {
    const headers = generateKitovuHeaders();
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

    if (status === 404) {
      throw new Error('KitovuPay UAT endpoint URL path not found (404). Please verify the collection API route in your documentation.');
    }

    if (status >= 500) {
      throw new Error(`KitovuPay UAT gateway server error (${status}). The sandbox server may be temporarily offline.`);
    }

    throw new Error(typeof errorData === 'string' && errorData.includes('nginx') 
      ? 'KitovuPay UAT gateway Nginx proxy rejected the request.' 
      : (errorData?.message || error.message));
  }
};