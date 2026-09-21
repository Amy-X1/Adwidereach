import ProtectedRoute from '../../components/ProtectedRoute';
import DashboardLayout from '../../components/DashboardLayout';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import Link from 'next/link';

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get('/orders').then((res) => setOrders(res.data.data.orders)).catch((err) => setError(err.response?.data?.message || err.message)).finally(() => setLoading(false));
  }, []);
  return (
    <DashboardLayout>
      <Head><title>Orders — Dashboard</title></Head>
      <section className="section">
        <h1 className="text-2xl font-bold mb-4">Orders</h1>
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!loading && !error && (
          <div className="card p-3 sm:p-5">
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500">You have no orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="py-2.5 pr-3 font-medium">Reference</th>
                    <th className="py-2.5 pr-3 font-medium">Total</th>
                    <th className="py-2.5 pr-3 font-medium">Status</th>
                    <th className="py-2.5 pr-3 font-medium">Created</th>
                    <th className="py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                      <td className="whitespace-nowrap py-4 pr-3 align-middle font-medium text-gray-900 dark:text-gray-100">{o.reference}</td>
                      <td className="whitespace-nowrap py-4 pr-3 align-middle tabular-nums">{o.currency} {o.total.toFixed(2)}</td>
                      <td className="whitespace-nowrap py-4 pr-3 align-middle">{o.status}</td>
                      <td className="whitespace-nowrap py-4 pr-3 align-middle text-gray-500 dark:text-gray-400">{new Date(o.createdAt).toLocaleString()}</td>
                      <td className="whitespace-nowrap py-4 align-middle">
                        <Link href={`/dashboard/orders/${o.id}`} className="text-brand-600 hover:underline">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <Orders />
    </ProtectedRoute>
  );
}
