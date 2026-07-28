import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, setError } from '../../store/authSlice';
import testService, { getApiErrorMessage } from '../../utils/apiService';
import type { RootState } from '../../store';
import AlertMessage from '../../components/common/AlertMessage';
import FormField from '../../components/common/FormField';
import AuthFooterLink from '../../components/auth/AuthFooterLink';
import AuthLayout from '../../components/auth/AuthLayout';

import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileInstance>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      dispatch(setError('Please complete the bot verification.'));
      return;
    }
    dispatch(setLoading(true));
    try {
      await testService.signup(name, email, password, mobileNumber, turnstileToken);
      dispatch(setLoading(false));
      navigate('/verify', { state: { name, email } });
    } catch (error: unknown) {
      dispatch(setError(getApiErrorMessage(error, 'Signup failed.')));
      // Reset Turnstile — tokens are single-use, need a fresh one for retry
      setTurnstileToken('');
      turnstileRef.current?.reset();
    }
  };

  return (
    <AuthLayout title="Create Identity" subtitle="Join the next generation of technical assessments" footer="NextGen Assessment Systems">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <AlertMessage message={error} />

        <FormField label="Full Legal Name" id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Johnathan Doe" />
        <FormField label="Professional Email" id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
        <FormField label="Mobile Number" id="mobile" type="tel" required value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="+91 9876543210" />
        <FormField label="Password" id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" />

        <div className="flex justify-center my-3 w-full overflow-hidden">
          <div className="w-full max-w-[300px]">
            <Turnstile 
              ref={turnstileRef}
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"} 
              onSuccess={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken('')}
              options={{ theme: 'dark' }}
            />
          </div>
        </div>

        <button type="submit" disabled={isLoading || !turnstileToken} className="w-full flex justify-center py-3 px-4 border border-border hover:border-primary rounded-sm text-xs font-bold uppercase tracking-widest text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none transition-all disabled:opacity-50 shadow-md cursor-pointer">
          {isLoading ? 'Processing...' : !turnstileToken ? 'Complete Captcha Below' : 'Register'}
        </button>
      </form>

      <AuthFooterLink prompt="Already have an account?" to="/login" label="Log In" />
    </AuthLayout>
  );
};

export default Signup;
