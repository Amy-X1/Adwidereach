import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiUserPlus } from 'react-icons/fi';
import Layout from '../components/Layout';
import FormField from '../components/FormField';
import { useAuth } from '../context/AuthContext';

const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const initial = {
  fullName: '', username: '', email: '', phone: '', dob: '', gender: '',
  country: '', state: '', city: '', businessName: '', address: '',
  password: '', confirmPassword: '', referralCode: '',
};

export default function Register() {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (router.isReady && typeof router.query.ref === 'string') {
      setForm((current) => ({ ...current, referralCode: router.query.ref.trim().toUpperCase() }));
    }
  }, [router.isReady, router.query.ref]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2) e.fullName = 'Full name must be at least 2 characters';
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(form.username)) e.username = 'Username must be 3-30 characters (letters, numbers, . or _)';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!PHONE_REGEX.test(form.phone)) e.phone = 'Use international format e.g. +15551234567';
    if (!form.dob) e.dob = 'Date of birth is required';
    else {
      const age = (Date.now() - new Date(form.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 13) e.dob = 'You must be at least 13 years old';
    }
    if (!form.gender) e.gender = 'Please select a gender';
    if (!form.country.trim()) e.country = 'Country is required';
    if (!form.state.trim()) e.state = 'State is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.address.trim() || form.address.trim().length < 5) e.address = 'Address must be at least 5 characters';
    if (!STRONG_PASSWORD_REGEX.test(form.password)) e.password = 'Min 8 chars incl. uppercase, lowercase, number & symbol';
    if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    setLoading(true);
    try {
      await register(form);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        const fieldErrors = {};
        data.errors.forEach((er) => {
          fieldErrors[er.field || er.path || er.param] = er.message || er.msg;
        });
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      toast.error(data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head><title>Register — NimbusWorks</title></Head>
      <section className="section max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Create your account</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Already have an account? <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-7 sm:p-10 space-y-6">
          {form.referralCode && <p className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-sm text-brand-700 dark:text-brand-300">Referral code applied: {form.referralCode}</p>}
          <fieldset className="space-y-5">
            <legend className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Personal Information</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Full Name" required error={errors.fullName}>
                <input className="input-field" value={form.fullName} onChange={set('fullName')} placeholder="Jane Doe" />
              </FormField>
              <FormField label="Username" required error={errors.username}>
                <input className="input-field" value={form.username} onChange={set('username')} placeholder="janedoe" />
              </FormField>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Email Address" required error={errors.email}>
                <input className="input-field" type="email" value={form.email} onChange={set('email')} placeholder="jane@company.com" />
              </FormField>
              <FormField label="Phone Number" required error={errors.phone}>
                <input className="input-field" value={form.phone} onChange={set('phone')} placeholder="+15551234567" />
              </FormField>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Date of Birth" required error={errors.dob}>
                <input className="input-field" type="date" value={form.dob} onChange={set('dob')} />
              </FormField>
              <FormField label="Gender" required error={errors.gender}>
                <select className="input-field" value={form.gender} onChange={set('gender')}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </FormField>
            </div>
          </fieldset>

          <fieldset className="space-y-5 border-t border-gray-200 dark:border-gray-800 pt-6">
            <legend className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Referral</legend>
            <FormField label="Referral Code (optional)" error={errors.referralCode}>
              <div className="relative">
                <input className="input-field" value={form.referralCode} onChange={set('referralCode')} placeholder="Enter referral code (e.g. REFABC123)" />
                {form.referralCode && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-500 font-medium">Referral detected</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">If someone referred you, enter their referral code here or use their referral link.</p>
            </FormField>
          </fieldset>

          <fieldset className="space-y-5 border-t border-gray-200 dark:border-gray-800 pt-6">
            <legend className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Location & Business</legend>
            <div className="grid gap-5 sm:grid-cols-3">
              <FormField label="Country" required error={errors.country}>
                <input className="input-field" value={form.country} onChange={set('country')} placeholder="Nigeria" />
              </FormField>
              <FormField label="State" required error={errors.state}>
                <input className="input-field" value={form.state} onChange={set('state')} placeholder="Rivers" />
              </FormField>
              <FormField label="City" required error={errors.city}>
                <input className="input-field" value={form.city} onChange={set('city')} placeholder="Port Harcourt" />
              </FormField>
            </div>
            <FormField label="Business Name (optional)" error={errors.businessName}>
              <input className="input-field" value={form.businessName} onChange={set('businessName')} placeholder="Acme Ventures" />
            </FormField>
            <FormField label="Address" required error={errors.address}>
              <input className="input-field" value={form.address} onChange={set('address')} placeholder="12 Market Street" />
            </FormField>
          </fieldset>

          <fieldset className="space-y-5 border-t border-gray-200 dark:border-gray-800 pt-6">
            <legend className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Security</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Password" required error={errors.password}>
                <input className="input-field" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
              </FormField>
              <FormField label="Confirm Password" required error={errors.confirmPassword}>
                <input className="input-field" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="••••••••" />
              </FormField>
            </div>
            <p className="text-xs text-gray-400">Use 8+ characters with uppercase, lowercase, a number, and a symbol.</p>
          </fieldset>

          <button disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : <>Create Account <FiUserPlus /></>}
          </button>
        </form>
      </section>
    </Layout>
  );
}
