/**
 * reCAPTCHA v3 Configuration
 * Get your site key from: https://www.google.com/recaptcha/admin
 */

export const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || 'YOUR_RECAPTCHA_SITE_KEY_HERE';

// Minimum score threshold for considering a request valid
export const RECAPTCHA_MIN_SCORE = 0.5;
