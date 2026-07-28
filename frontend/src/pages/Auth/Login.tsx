import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, setAuth, setError } from '../../store/authSlice';
import testService, { getApiErrorMessage } from '../../utils/apiService';
import type { RootState } from '../../store';
import AlertMessage from '../../components/common/AlertMessage';
import FormField from '../../components/common/FormField';
import AuthFooterLink from '../../components/auth/AuthFooterLink';
import AuthLayout from '../../components/auth/AuthLayout';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
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
      const res = await testService.login(email, password, turnstileToken);
      dispatch(setAuth({ user: res.data.user, token: res.data.token }));
      
      if (res.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error: unknown) {
      dispatch(setError(getApiErrorMessage(error, 'Login failed. Please check your credentials.')));
      setTurnstileToken('');
      turnstileRef.current?.reset();
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Enter your credentials to access the platform" footer="NextGen Assessment Systems">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <AlertMessage message={error} />

        <FormField
          label="Professional Email"
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
        />

        <FormField
          label="Password"
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />

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
          {isLoading ? 'Processing...' : !turnstileToken ? 'Complete Captcha Below' : 'Sign In'}
        </button>
      </form>

      <div className="mt-5 text-center">
        <Link to="/forgot-password" className="text-[10px] text-muted-foreground hover:text-foreground-bold transition-colors uppercase tracking-widest font-bold">
          Forgot password?
        </Link>
      </div>

      <AuthFooterLink prompt="New to the platform?" to="/signup" label="Create Account" />
    </AuthLayout>
  );
};

export default Login;
