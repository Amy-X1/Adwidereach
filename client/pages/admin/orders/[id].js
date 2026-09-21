import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import DashboardLayout from '../../../components/DashboardLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import api from '../../../lib/api';

export default function OrderDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await api.get(`/admin/orders/${id}`);
        setOrder(data.data.order);
      } catch (err) { toast.error('Failed to load order'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const changeStatus = async (s, statusReason) => {
    try {
      await api.put(`/admin/orders/${id}/status`, { status: s, reason: s === 'REJECTED' ? statusReason : undefined });
      toast.success('Status updated');
      const { data } = await api.get(`/admin/orders/${id}`);
      setOrder(data.data.order);
    } catch (err) { toast.error('Update failed'); }
  };

  return (
    <ProtectedRoute adminOnly>
      <DashboardLayout>
        <Head><title>Order {id}</title></Head>
        <section className="section">
          <h1 className="text-2xl font-bold mb-4">Order #{id}</h1>
          {loading ? <p>Loading...</p> : order ? (
            <div className="card p-4">
              <p><strong>User:</strong> {order.user?.email || order.userId}</p>
              <p><strong>Status:</strong> {order.status}</p>
              <p><strong>Total:</strong> {order.currency} {Number(order.total || 0).toFixed(2)}</p>
              {order.status === 'REJECTED' && <p className="mt-2 text-red-600"><strong>Rejection reason:</strong> {order.rejectionReason || 'See order history.'}</p>}
              {order.items?.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Items & Checkout Info</h3>
                  {order.items.map((item) => {
                    let info = {};
                    try { info = item.requirements ? JSON.parse(item.requirements) : {}; } catch (e) { info = {}; }
                    return (
                      <div key={item.id} className="border rounded p-3 mb-2">
                        <p className="font-medium">{item.servicePackage?.name || `Package ${item.servicePackageId}`} × {item.quantity} — {order.currency} {Number(item.totalPrice || 0).toFixed(2)}</p>
                        {Object.keys(info).length > 0 && (
                          <ul className="mt-2 text-sm space-y-1">
                            {Object.entries(info).map(([k, v]) => <li key={k}><strong>{k}:</strong> {String(v)}</li>)}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {order.status === 'PENDING' && <><button onClick={() => changeStatus('ACCEPTED')} className="btn-primary">Accept Order</button><button onClick={() => { const value = window.prompt('Reason for rejection'); if (value?.trim()) changeStatus('REJECTED', value); }} className="btn-danger">Reject Order</button></>}
                {order.status === 'ACCEPTED' && <button onClick={() => changeStatus('PROCESSING')} className="btn-primary">Start Processing</button>}
                {order.status === 'PROCESSING' && <button onClick={() => changeStatus('IN_PROGRESS')} className="btn-primary">Mark In Progress</button>}
                {order.status === 'IN_PROGRESS' && <button onClick={() => changeStatus('COMPLETED')} className="btn-primary">Mark Completed</button>}
                {order.status !== 'COMPLETED' && order.status !== 'REJECTED' && <button onClick={() => changeStatus('CANCELLED')} className="btn-secondary">Cancel</button>}
              </div>
            </div>
          ) : <p>Order not found</p>}
        </section>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
