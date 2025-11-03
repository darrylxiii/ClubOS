/**
 * reCAPTCHA v3 Configuration
 * Get your site key from: https://www.google.com/recaptcha/admin
 */

const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

// Check if reCAPTCHA is properly configured
export const RECAPTCHA_ENABLED = siteKey && siteKey !== 'YOUR_RECAPTCHA_SITE_KEY_HERE';
export const RECAPTCHA_SITE_KEY = RECAPTCHA_ENABLED ? siteKey : '';

// Minimum score threshold for considering a request valid
export const RECAPTCHA_MIN_SCORE = 0.5;
