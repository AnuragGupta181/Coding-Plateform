import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, setAuth, setError } from '../../store/authSlice';
import testService, { getApiErrorMessage } from '../../utils/apiService';
import type { RootState } from '../../store';
import AlertMessage from '../../components/common/AlertMessage';
import AuthLayout from '../../components/auth/AuthLayout';

const VerifyOTP: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const { email } = location.state || {};

  useEffect(() => {
    dispatch(setLoading(false));
    if (!email) {
      navigate('/signup');
    }
  }, [email, navigate, dispatch]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setLoading(true));
    try {
      const res = await testService.verifyOTP(email, otp);
      dispatch(setAuth({ user: res.data.user, token: res.data.token }));

      if (res.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error: unknown) {
      dispatch(setError(getApiErrorMessage(error, 'Verification failed. Please check your connection.')));
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    dispatch(setLoading(true));
    try {
      await testService.resendOTP(email);
      setTimer(60);
      setCanResend(false);
      dispatch(setLoading(false));
    } catch (error: unknown) {
      dispatch(setError(getApiErrorMessage(error, 'Failed to resend OTP.')));
    }
  };

  return (
    <AuthLayout
      title="Verify Identity"
      subtitle={
        <div>
          <p>Verification code dispatched to <span className="font-bold text-foreground">{email}</span></p>
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
            💡 If you don't see the email in your inbox, please check your <strong>Spam / Junk</strong> folder.
          </p>
        </div>
      }
      footer="Security Protocol 4.0 &bull; NextGen"
      logoLinksHome={false}
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <AlertMessage message={error} />

        <div>
          <label htmlFor="otp" className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 text-center">
            Secure Authentication Code
          </label>
          <input
            id="otp"
            type="text"
            required
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="0 0 0 0 0 0"
            className="block w-full border border-border rounded-sm px-4 py-4 text-center text-3xl font-sans tracking-[0.5em] focus:ring-0 focus:border-cream-900 transition-colors placeholder:text-cream-100"
          />
        </div>

        <button type="submit" disabled={isLoading || otp.length !== 6} className="w-full flex justify-center py-3 px-4 border border-border hover:border-primary rounded-sm text-xs font-bold uppercase tracking-widest text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none transition-all disabled:opacity-50 shadow-md cursor-pointer">
          {isLoading ? 'Verifying...' : 'Authorize Access'}
        </button>
      </form>

      <div className="mt-8 text-center">
        {canResend ? (
          <button onClick={handleResend} className="text-xs text-foreground-bold font-bold hover:underline underline-offset-4 uppercase tracking-widest">
            Resend Code
          </button>
        ) : (
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            Resend available in <span className="text-foreground-bold">{timer}s</span>
          </p>
        )}
      </div>
    </AuthLayout>
  );
};

export default VerifyOTP;
