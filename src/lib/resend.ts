import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn('RESEND_API_KEY is missing. Emails will not be sent.');
}

export const resend = new Resend(apiKey || 'dummy_key_for_build');
