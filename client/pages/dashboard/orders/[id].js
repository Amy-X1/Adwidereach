import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';

function OrderDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/orders/${id}`).then((res) => setOrder(res.data.data.order)).catch((err) => setError(err.response?.data?.message || err.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <DashboardLayout>
      <Head><title>Order — Dashboard</title></Head>
      <section className="section">Loading…</section>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <Head><title>Order — Dashboard</title></Head>
      <section className="section"><p className="text-red-500">{error}</p></section>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <Head><title>Order {order.reference} — Dashboard</title></Head>
      <section className="section">
        <div className="card p-4 sm:p-5">
          <h2 className="break-all text-sm font-semibold text-gray-900 dark:text-white sm:text-base">
            <span className="text-gray-500 dark:text-gray-400">Order </span>{order.reference}
          </h2>
          <p className="mt-1.5 text-sm text-gray-500">Status: {order.status}</p>
          <p className="mt-0.5 text-sm text-gray-500">Total: {order.currency} {order.total.toFixed(2)}</p>
          {order.status === 'REJECTED' && order.rejectionReason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">Reason for rejection: {order.rejectionReason}</p>}
          <div className="mt-4">
            <h3 className="font-semibold">Items</h3>
            <ul className="mt-2">
              {order.items.map((it) => (
                <li key={it.id} className="border-b border-gray-100 py-2.5 last:border-0 dark:border-gray-800">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium">{it.servicePackage?.name || `Package ${it.servicePackageId}`}</div>
                      <div className="text-sm text-gray-500">Qty: {it.quantity}</div>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">{order.currency} {(it.totalPrice).toFixed(2)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <OrderDetail />
    </ProtectedRoute>
  );
}
