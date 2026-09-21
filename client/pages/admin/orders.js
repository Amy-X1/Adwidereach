import { useEffect, useState } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../lib/api';
import Link from 'next/link';
import { FiTrash2, FiX } from 'react-icons/fi';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/admin/orders');
        setOrders(data.data.orders || []);
      } catch (err) {
        toast.error('Failed to load orders');
      } finally { setLoading(false); }
    })();
  }, []);

  const handleDelete = async (order) => {
    try {
      await api.delete(`/admin/orders/${order.id}`);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      toast.success(`Order #${order.id} deleted successfully.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete order');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <DashboardLayout>
        <Head><title>Admin — Orders</title></Head>
        <section className="section">
          <h1 className="text-2xl font-bold mb-4">Orders</h1>
          <div className="card p-4">
            {loading ? <p>Loading...</p> : (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th>Id</th><th>User</th><th>Total</th><th>Status</th><th>Created</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-t">
                      <td className="py-2">{o.id}</td>
                      <td className="py-2">{o.user?.email || o.userId}</td>
                      <td className="py-2">{o.totalAmount}</td>
                      <td className="py-2">{o.status}</td>
                      <td className="py-2">{new Date(o.createdAt).toLocaleString()}</td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/orders/${o.id}`} className="text-brand-600 ">View</Link>
                          <button
                            onClick={() => setDeleteConfirm(o)}
                            className="grid h-7 w-7 place-items-center rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-red-600 hover:border-red-300 transition-colors"
                            aria-label={`Delete order ${o.id}`}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </section>

        {/* Delete confirmation popup */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Order</h3>
                <button onClick={() => setDeleteConfirm(null)} className="text-gray-400 hover:text-gray-600">
                  <FiX size={20} />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete order <strong>#{deleteConfirm.id}</strong> from {deleteConfirm.user?.email || `user ${deleteConfirm.userId}`}? This action cannot be undone and will reverse any associated affiliate commissions.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Delete Order
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
