import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading, setError } from '../../store/authSlice';
import testService, { getApiErrorMessage } from '../../utils/apiService';
import type { RootState } from '../../store';
import AlertMessage from '../../components/common/AlertMessage';
import FormField from '../../components/common/FormField';
import AuthFooterLink from '../../components/auth/AuthFooterLink';
import AuthLayout from '../../components/auth/AuthLayout';

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setLoading(true));
    try {
      await testService.signup(name, email, password, mobileNumber);
      dispatch(setLoading(false));
      navigate('/verify', { state: { name, email } });
    } catch (error: unknown) {
      dispatch(setError(getApiErrorMessage(error, 'Signup failed.')));
    }
  };

  return (
    <AuthLayout title="Create Identity" subtitle="Join the next generation of technical assessments" footer="NextGen Assessment Systems">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <AlertMessage message={error} />

        <FormField label="Full Legal Name" id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Johnathan Doe" />
        <FormField label="Professional Email" id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
        <FormField label="Mobile Number" id="mobile" type="tel" required value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="+91 9876543210" />
        <FormField label="Password" id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" />

        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-sm text-xs font-bold uppercase tracking-widest text-primary-foreground bg-primary hover:bg-primary focus:outline-none transition-all disabled:opacity-50 shadow-lg shadow-cream-200">
          {isLoading ? 'Processing...' : 'Register'}
        </button>
      </form>

      <AuthFooterLink prompt="Already have an account?" to="/login" label="Log In" />
    </AuthLayout>
  );
};

export default Signup;
