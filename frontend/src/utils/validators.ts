/**
 * Shared Input Validators
 *
 * Centralized validation functions for all auth pages.
 * These provide UX-level guard rails — the real security
 * is enforced by the backend middleware.
 */

// ── Regex Patterns ────────────────────────────────────────────────────────────

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const AKGEC_EMAIL_REGEX = /^[a-zA-Z]{3,}25\d{5,7}@akgec\.ac\.in$/;
const OTP_REGEX = /^\d{6}$/;
const NAME_REGEX = /^[a-zA-Z\s.'-]{2,100}$/;
const MOBILE_REGEX = /^\+?\d{10,15}$/;
// Matches MongoDB operator patterns like $gt, $ne, etc.
const NOSQL_OPERATOR_REGEX = /\$[a-zA-Z]/;

// ── Validators ────────────────────────────────────────────────────────────────

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required.';
  if (email.length > 254) return 'Email is too long.';
  if (NOSQL_OPERATOR_REGEX.test(email)) return 'Email contains invalid characters.';
  if (!AKGEC_EMAIL_REGEX.test(email.trim())) return 'Please use your valid college email ID.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password is too long.';
  return null;
}

export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required.';
  if (NOSQL_OPERATOR_REGEX.test(trimmed)) return 'Name contains invalid characters.';
  if (!NAME_REGEX.test(trimmed)) return 'Name must be 2-100 characters (letters, spaces, dots, apostrophes, hyphens only).';
  return null;
}

export function validateOtp(otp: string): string | null {
  if (!otp.trim()) return 'OTP is required.';
  if (!OTP_REGEX.test(otp.trim())) return 'OTP must be exactly 6 digits.';
  return null;
}

export function validateMobile(mobile: string): string | null {
  if (!mobile.trim()) return null; // Mobile is optional
  const cleaned = mobile.trim();
  if (NOSQL_OPERATOR_REGEX.test(cleaned)) return 'Mobile number contains invalid characters.';
  if (!MOBILE_REGEX.test(cleaned)) return 'Mobile number must be 10-15 digits, optionally prefixed with +.';
  return null;
}

/**
 * Sanitize an input string by stripping MongoDB operator patterns.
 * This is a frontend-side defense — the backend has its own sanitizer.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  // Remove any $ followed by letters (MongoDB operators like $gt, $ne)
  return input.replace(/\$[a-zA-Z]+/g, '').trim();
}
