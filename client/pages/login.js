import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { FiLogIn, FiEye, FiEyeOff, FiArrowLeft, FiMail, FiKey, FiLock } from 'react-icons/fi';
import Layout from '../components/Layout';
import FormField from '../components/FormField';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // Forgot-password flow state: 'login' | 'email' | 'code' | done handled via toast+redirect
  const [forgotMode, setForgotMode] = useState(false);
  const [fpStep, setFpStep] = useState('email');
  const [fpEmail, setFpEmail] = useState('');
  const [fpCode, setFpCode] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirm, setFpConfirm] = useState('');
  const [showFpNew, setShowFpNew] = useState(false);
  const [showFpConfirm, setShowFpConfirm] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!identifier.trim()) e.identifier = 'Email or username is required';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err) {
      const data = err.response?.data || {};
      // Unverified accounts must verify before they can log in.
      if (err.response?.status === 403 && data.code === 'EMAIL_NOT_VERIFIED') {
        toast.error(data.message || 'Please verify your email first');
        router.push(`/verify-email?email=${encodeURIComponent(data.email || identifier)}`);
        return;
      }
      toast.error(data.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const sendResetCode = async (ev) => {
    ev.preventDefault();
    const email = fpEmail.trim();
    if (!email) { setFpError('Enter your account email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFpError('Enter a valid email address'); return; }
    setFpLoading(true);
    setFpError('');
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Reset code sent — check your email');
      setFpStep('code');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Could not send reset code';
      // Required behaviour: unknown email -> "No account with this email"
      setFpError(status === 404 ? 'No account with this email' : msg);
    } finally {
      setFpLoading(false);
    }
  };

  const doResetPassword = async (ev) => {
    ev.preventDefault();
    if (fpCode.trim().length !== 6) { setFpError('Enter the 6-digit code from your email'); return; }
    if (fpNewPassword !== fpConfirm) { setFpError('Passwords do not match'); return; }
    if (fpNewPassword.length < 8) { setFpError('Use 8+ characters with uppercase, lowercase, a number, and a symbol'); return; }
    setFpLoading(true);
    setFpError('');
    try {
      await api.post('/auth/reset-password', {
        email: fpEmail.trim(), code: fpCode.trim(), newPassword: fpNewPassword, confirmNewPassword: fpConfirm,
      });
      toast.success('Password reset successful — log in with your new password');
      setForgotMode(false);
      setFpStep('email');
      setFpCode(''); setFpNewPassword(''); setFpConfirm('');
      setPassword('');
    } catch (err) {
      setFpError(err.response?.data?.message || 'Reset failed — check the code and try again');
    } finally {
      setFpLoading(false);
    }
  };

  const ForgotEmailForm = () => (
    <form onSubmit={sendResetCode} className="card p-7 sm:p-8 space-y-5">
      <button type="button" onClick={() => { setForgotMode(false); setFpError(''); }} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        <FiArrowLeft size={15} /> Back to login
      </button>
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Forgot password?</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Enter your account email for a 6-digit reset code.</p>
      </div>
      <FormField label="Email address" required error={fpError}>
        <div className="relative">
          <FiMail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-10" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} placeholder="jane@company.com" />
        </div>
      </FormField>
      <button disabled={fpLoading} className="btn-primary w-full">
        {fpLoading ? 'Sending code...' : 'Send reset code'}
      </button>
    </form>
  );

  const ResetCodeForm = () => (
    <form onSubmit={doResetPassword} className="card p-7 sm:p-8 space-y-5">
      <button type="button" onClick={() => { setFpStep('email'); setFpError(''); }} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        <FiArrowLeft size={15} /> Use a different email
      </button>
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Enter reset code</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Code sent to {fpEmail}. Expires in 10 minutes.</p>
      </div>
      <FormField label="6-digit code" required>
        <div className="relative">
          <FiKey size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-10 tracking-[0.3em] text-center font-bold" value={fpCode} onChange={(e) => setFpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" inputMode="numeric" />
        </div>
      </FormField>
      <FormField label="New password" required>
        <div className="relative">
          <FiLock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-10 pr-11" type={showFpNew ? 'text' : 'password'} value={fpNewPassword} onChange={(e) => setFpNewPassword(e.target.value)} placeholder="••••••••" />
          <button type="button" onClick={() => setShowFpNew((v) => !v)} aria-label="Toggle" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            {showFpNew ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        </div>
      </FormField>
      <FormField label="Confirm new password" required error={fpError}>
        <div className="relative">
          <FiLock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-10 pr-11" type={showFpConfirm ? 'text' : 'password'} value={fpConfirm} onChange={(e) => setFpConfirm(e.target.value)} placeholder="••••••••" />
          <button type="button" onClick={() => setShowFpConfirm((v) => !v)} aria-label="Toggle" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            {showFpConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        </div>
      </FormField>
      <button disabled={fpLoading} className="btn-primary w-full">
        {fpLoading ? 'Resetting...' : 'Reset password'}
      </button>
      <button type="button" disabled={fpLoading} onClick={sendResetCode} className="w-full text-center text-sm font-medium text-brand-600 hover:underline disabled:opacity-60">
        Resend code
      </button>
    </form>
  );

  return (
    <Layout>
      <Head><title>Login — AdWideReach</title></Head>
      <section className="section max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Welcome back</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            New here? <Link href="/register" className="text-brand-600 font-medium hover:underline">Create an account</Link>
          </p>
        </div>

        {!forgotMode ? (
        <form onSubmit={handleSubmit} className="card p-7 sm:p-8 space-y-5">
          <FormField label="Email or Username" required error={errors.identifier}>
            <input className="input-field" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="jane@company.com" />
          </FormField>
          <FormField label="Password" required error={errors.password}>
            <div className="relative">
              <input className="input-field pr-11" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </FormField>
          <div className="flex justify-end">
            <button type="button" onClick={() => { setForgotMode(true); setFpStep('email'); setFpError(''); }} className="text-sm font-medium text-brand-600 hover:underline">
              Forgot password?
            </button>
          </div>
          <button disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : <>Sign In <FiLogIn /></>}
          </button>
        </form>
        ) : fpStep === 'email' ? (
        <ForgotEmailForm />
        ) : (
        <ResetCodeForm />
        )}
      </section>
    </Layout>
  );
}
