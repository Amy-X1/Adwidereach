import Head from 'next/head';
import Link from 'next/link';
import { FiCheckCircle } from 'react-icons/fi';
import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get('/services').then((res) => {
      if (!mounted) return;
      setServices(res.data.data.services || []);
    }).catch((err) => {
      setError(err.response?.data?.message || 'Failed to load services');
    }).finally(() => setLoading(false));
    return () => { mounted = false; };
  }, []);

  return (
    <Layout>
      <Head><title>Services — NimbusWorks</title></Head>
      <section className="section">
        <div className="max-w-2xl">
          <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">Services</span>
          <h1 className="mt-4 text-4xl font-extrabold text-gray-900 dark:text-white">Available Services</h1>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Browse available services and select a plan to purchase.</p>
        </div>

        <div className="mt-8">
          {loading && <p>Loading services…</p>}
          {error && <p className="text-red-500">{error}</p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div key={s.id} className="card p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{s.platform} — {s.name}</h3>
                    {s.imageUrl && <img src={s.imageUrl} className="h-20 w-20 object-cover rounded mt-2" />}
                    <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm text-gray-500">From</p>
                    <p className="font-bold">₦{s.packages?.[0]?.price?.toFixed(2) ?? '0.00'}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Link href={`/dashboard/services/${s.id}`} className="btn-primary">View Plans</Link>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>
    </Layout>
  );
}
