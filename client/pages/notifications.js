import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import api from '../lib/api';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.data.notifications || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load notifications.');
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, isRead: true } : item));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
  };

  return (
    <DashboardLayout>
      <Head><title>Notifications — AdWideReach</title></Head>
      <section className="section">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div><h1 className="text-2xl font-bold">Notifications</h1><p className="mt-1 text-sm text-gray-500">Updates about your orders, payments, and support tickets.</p></div>
          <button onClick={markAllRead} className="btn-secondary text-sm">Mark all as read</button>
        </div>
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
        <div className="card p-4 max-w-3xl">
          {notifications.length === 0 ? <p className="py-8 text-center text-sm text-gray-500">No notifications yet.</p> : notifications.map((notification) => (
            <div key={notification.id} className={`border-b py-4 last:border-0 ${notification.isRead ? '' : 'bg-brand-50 dark:bg-gray-900'}`}>
              <div className="flex items-start justify-between gap-4">
                <div><p className="font-medium">{notification.title}</p><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{notification.message}</p><p className="mt-1 text-xs text-gray-500">{new Date(notification.createdAt).toLocaleString()}</p></div>
                {!notification.isRead && <button onClick={() => markRead(notification.id)} className="text-xs text-brand-600">Mark read</button>}
              </div>
              {(notification.ticketId || notification.orderId) && <Link href={notification.ticketId ? '/dashboard/support' : `/dashboard/orders/${notification.orderId}`} onClick={() => !notification.isRead && markRead(notification.id)} className="mt-2 inline-block text-sm font-medium text-brand-600">Open related item</Link>}
            </div>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}

export default function Page() {
  return <ProtectedRoute><Notifications /></ProtectedRoute>;
}
