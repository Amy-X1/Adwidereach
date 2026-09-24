import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { FiMailCheck, FiKey, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import Layout from '../components/Layout';
import FormField from '../components/FormField';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const router = useRouter();
  const { verifyEmail, resendVerification } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (router.isReady && typeof router.query.email === 'string' && router.query.email) {
      setEmail(router.query.email);
    }
  }, [router.isReady, router.query.email]);

  const submit = async (ev) => {
    ev.preventDefault();
    if (!email.trim()) { setError('Enter the email you signed up with'); return; }
    if (code.trim().length !== 6) { setError('Enter the 6-digit code from your email'); return; }
    setLoading(true);
    setError('');
    try {
      await verifyEmail(email.trim(), code.trim());
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed — check the code and try again');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email.trim()) { setError('Enter your email first so we know where to send the code'); return; }
    setResending(true);
    setError('');
    try {
      await resendVerification(email.trim());
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not resend the code';
      setError(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <Layout>
      <Head><title>Verify Email — AdWideReach</title></Head>
      <section className="section max-w-md">
        <div className="text-center mb-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/40"><FiMailCheck size={26} /></span>
          <h1 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white">Verify your email</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">We sent a 6-digit code to your email. Enter it below to activate your account.</p>
        </div>
        <form onSubmit={submit} className="card p-7 sm:p-8 space-y-5">
          <FormField label="Email address" required>
            <input className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" autoComplete="email" />
          </FormField>
          <FormField label="6-digit code" required error={error}>
            <div className="relative">
              <FiKey size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-10 tracking-[0.3em] text-center font-bold" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" inputMode="numeric" />
            </div>
          </FormField>
          <button disabled={loading} className="btn-primary w-full">
            {loading ? 'Verifying...' : 'Verify & activate account'}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" disabled={resending} onClick={resend} className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:underline disabled:opacity-60">
              <FiRefreshCw size={14} /> {resending ? 'Sending...' : 'Resend code'}
            </button>
            <Link href="/login" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400">
              <FiArrowLeft size={14} /> Back to login
            </Link>
          </div>
        </form>
      </section>
    </Layout>
  );
}
