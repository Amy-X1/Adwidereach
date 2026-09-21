import Head from 'next/head';
import Link from 'next/link';
import { FiArrowRight, FiShield, FiZap, FiTrendingUp, FiUsers } from 'react-icons/fi';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const features = [
  { icon: FiShield, title: 'Bank-grade Security', desc: 'JWT auth, hashed passwords, rate limiting, and sanitized input on every request.' },
  { icon: FiZap, title: 'Blazing Fast', desc: 'Optimized APIs and a lightweight frontend for a snappy experience on any device.' },
  { icon: FiTrendingUp, title: 'Built to Scale', desc: 'A clean relational schema and REST API that grows with your business.' },
  { icon: FiUsers, title: 'Team Ready', desc: 'Role-based dashboards for customers and administrators out of the box.' },
];

export default function Home() {
  const { user, loading } = useAuth();
  const showGuestCtas = !loading && !user;

  return (
    <Layout>
      <Head><title>NimbusWorks — Modern Business Platform</title></Head>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-transparent dark:from-brand-950/40" />
        <div className="section grid items-center gap-12 lg:grid-cols-2">
          <div className="animate-slide-up">
            <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">Now onboarding new businesses</span>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Run your business on one modern platform
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-xl">
              Register in minutes, manage your profile, and let our team support your growth with tools built for speed, security, and simplicity.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {showGuestCtas && <Link href="/register" className="btn-primary">Create an Account <FiArrowRight /></Link>}
              <Link href="/services" className="btn-secondary">Explore Services</Link>
            </div>
          </div>
          <div className="card p-8 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              {features.map((f) => (
                <div key={f.title} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-5">
                  <f.icon className="text-brand-600" size={22} />
                  <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{f.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Everything you need to get started</h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300">A complete toolkit for customers and admins, from onboarding to ongoing account management.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600/10 text-brand-600">
                <f.icon size={20} />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {showGuestCtas && (
        <section className="section">
          <div className="card overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 p-10 sm:p-16 text-center">
            <h2 className="text-3xl font-bold text-white">Ready to join NimbusWorks?</h2>
            <p className="mt-3 text-brand-100 max-w-xl mx-auto">Create your account today and get instant access to your personal dashboard.</p>
            <Link href="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-brand-700 hover:bg-brand-50 transition-colors">
              Create Free Account <FiArrowRight />
            </Link>
          </div>
        </section>
      )}
    </Layout>
  );
}
