import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../lib/api';

function UserServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/services')
      .then(({ data }) => setServices(data.data.services || []))
      .catch((err) => setError(err.response?.data?.message || 'Unable to load services.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <Head><title>Services / Plans — Dashboard</title></Head>
      <section className="section">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services / Plans</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Choose a service and plan to get started.</p>
        {loading && <p className="mt-6 text-sm text-gray-500">Loading services...</p>}
        {error && <p className="mt-6 text-sm text-red-500">{error}</p>}
        {!loading && !error && services.length === 0 && <p className="mt-6 text-sm text-gray-500">No services are available right now.</p>}
        {!loading && !error && services.length > 0 && <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{services.map((service) => <div key={service.id} className="card overflow-hidden p-5"><div className="flex items-start gap-3">{service.imageUrl ? <img src={service.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-brand-600/10 font-semibold text-brand-600">{service.platform?.[0]?.toUpperCase() || 'S'}</div>}<div><h2 className="font-semibold text-gray-900 dark:text-white">{service.platform} — {service.name}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{service.description}</p></div></div><p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{service.packages?.length || 0} plan{service.packages?.length === 1 ? '' : 's'} available</p><Link href={`/dashboard/services/${service.id}`} className="btn-primary mt-4 w-full">View Plans</Link></div>)}</div>}
      </section>
    </DashboardLayout>
  );
}

export default function Page() {
  return <ProtectedRoute><UserServices /></ProtectedRoute>;
}
