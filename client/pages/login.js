import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiLogIn, FiEye, FiEyeOff } from 'react-icons/fi';
import Layout from '../components/Layout';
import FormField from '../components/FormField';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

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
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

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
          <button disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : <>Sign In <FiLogIn /></>}
          </button>
         
        </form>
      </section>
    </Layout>
  );
}
