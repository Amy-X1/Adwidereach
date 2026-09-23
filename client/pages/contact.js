import { useState } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { FiMapPin, FiPhone, FiMail, FiSend } from 'react-icons/fi';
import Layout from '../components/Layout';
import FormField from '../components/FormField';
import api from '../lib/api';

const initial = { name: '', email: '', phone: '', subject: '', message: '' };

export default function Contact() {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.subject.trim()) e.subject = 'Subject is required';
    if (!form.message.trim() || form.message.trim().length < 10) e.message = 'Message should be at least 10 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/contact', form);
      toast.success("Message sent! We'll get back to you soon.");
      setForm(initial);
      setErrors({});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head><title>Contact Us — AdWideReach</title></Head>
      <section className="section grid gap-12 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">Contact</span>
          <h1 className="mt-4 text-4xl font-extrabold text-gray-900 dark:text-white">Get in touch</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Have a question about your account or our services? Send us a message and we'll respond within one business day.</p>

          <div className="mt-8 space-y-5">
            {[[FiMapPin, '145 market road by adazi, Aba, Abia State NG'], [FiPhone, '+234 814 057 0354'], [FiMail, 'techj9252@gmail.com']].map(([Icon, text]) => (
              <div key={text} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600/10 text-brand-600 shrink-0"><Icon size={17} /></span>
                {text}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-7 sm:p-8 lg:col-span-3 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Full Name" required error={errors.name}>
              <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
            </FormField>
            <FormField label="Email Address" required error={errors.email}>
              <input className="input-field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" />
            </FormField>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Phone Number" error={errors.phone}>
              <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234 800 000 0000" />
            </FormField>
            <FormField label="Subject" required error={errors.subject}>
              <input className="input-field" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="How can we help?" />
            </FormField>
          </div>
          <FormField label="Message" required error={errors.message}>
            <textarea className="input-field min-h-[140px] resize-none" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us more..." />
          </FormField>
          <button disabled={loading} className="btn-primary w-full sm:w-auto">
            {loading ? 'Sending...' : <>Send Message <FiSend /></>}
          </button>
        </form>
      </section>
    </Layout>
  );
}
