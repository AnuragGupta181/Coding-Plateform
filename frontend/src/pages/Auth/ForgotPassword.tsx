import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import testService, { getApiErrorMessage } from '../../utils/apiService';
import AlertMessage from '../../components/common/AlertMessage';
import FormField from '../../components/common/FormField';
import AuthFooterLink from '../../components/auth/AuthFooterLink';
import AuthLayout from '../../components/auth/AuthLayout';
import { validateEmail, validatePassword, validateOtp, sanitizeInput } from '../../utils/validators';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Only allow digit characters in OTP input
  const handleOtpChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = event.target.value.replace(/\D/g, '');
    setOtp(digitsOnly);
  };

  const handleRequestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    // Validate email
    const emailError = validateEmail(email);
    if (emailError) { setError(emailError); return; }

    setIsLoading(true);

    try {
      const sanitizedEmail = sanitizeInput(email).toLowerCase();
      const response = await testService.forgotPassword(sanitizedEmail);
      setMessage(response.data.message);
      setStep('reset');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Failed to send reset OTP.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    // Validate OTP
    const otpError = validateOtp(otp);
    if (otpError) { setError(otpError); return; }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) { setError(passwordError); return; }

    setIsLoading(true);

    try {
      const sanitizedEmail = sanitizeInput(email).toLowerCase();
      const response = await testService.resetPassword(sanitizedEmail, otp, password);
      setMessage(response.data.message);
      setTimeout(() => navigate('/login'), 1200);
    } catch (resetError: unknown) {
      setError(getApiErrorMessage(resetError, 'Failed to reset password.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle={
        step === 'request' ? (
          'Request a reset code for your account'
        ) : (
          <div>
            <p>Enter the reset code sent to <span className="font-bold text-foreground">{email}</span></p>
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
              💡 If you don't see the email in your inbox, please check your <strong>Spam / Junk</strong> folder.
            </p>
          </div>
        )
      }
    >
      <AlertMessage message={error} className="mb-6" />
      <AlertMessage message={message} tone="success" className="mb-6" />

      {step === 'request' ? (
        <form className="space-y-6" onSubmit={handleRequestReset}>
          <FormField label="Professional Email" id="email" type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" />
          <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-sm text-xs font-bold uppercase tracking-widest text-primary-foreground bg-primary hover:bg-primary focus:outline-none transition-all disabled:opacity-50 shadow-lg shadow-cream-200">
            {isLoading ? 'Sending...' : 'Send Reset Code'}
          </button>
        </form>
      ) : (
        <form className="space-y-6" onSubmit={handleResetPassword}>
          <FormField label="Reset Code" id="otp" type="text" inputMode="numeric" required maxLength={6} value={otp} onChange={handleOtpChange} placeholder="000000" />
          <FormField label="New Password" id="password" type="password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 8 characters" />
          <button type="submit" disabled={isLoading || otp.length !== 6} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-sm text-xs font-bold uppercase tracking-widest text-primary-foreground bg-primary hover:bg-primary focus:outline-none transition-all disabled:opacity-50 shadow-lg shadow-cream-200">
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}

      <AuthFooterLink to="/login" label="Return to Login" />
    </AuthLayout>
  );
};

export default ForgotPassword;

