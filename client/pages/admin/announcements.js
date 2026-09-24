import { useEffect, useState } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { FiMegaphone, FiSend, FiClock } from 'react-icons/fi';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../lib/api';

function AnnouncementsContent() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('ALL');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    try {
      const { data } = await api.get('/admin/announcements');
      setHistory(data.data.announcements || []);
    } catch (err) {
      toast.error('Could not load announcement history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const send = async (ev) => {
    ev.preventDefault();
    if (title.trim().length < 3) { toast.error('Give the announcement a title (3+ characters)'); return; }
    if (message.trim().length < 3) { toast.error('Write the announcement message first'); return; }
    setSending(true);
    try {
      const { data } = await api.post('/admin/announcements', { title: title.trim(), message: message.trim(), audience });
      toast.success(data?.message || 'Announcement sent');
      setTitle('');
      setMessage('');
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send announcement');
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <Head><title>Announcements — Admin</title></Head>
      <section className="section">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40"><FiMegaphone size={22} /></span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcement Room</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Broadcast a message — every recipient gets it in their notification area.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={send} className="card h-fit space-y-5 p-6 sm:p-7">
            <div>
              <label className="input-label">Title <span className="text-red-500">*</span></label>
              <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New weekend promo is live" maxLength={120} />
            </div>
            <div>
              <label className="input-label">Message <span className="text-red-500">*</span></label>
              <textarea className="input-field min-h-[140px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write what users should see in their notifications…" maxLength={2000} />
              <p className="mt-1 text-right text-xs text-gray-400">{message.length}/2000</p>
            </div>
            <div>
              <label className="input-label">Send to</label>
              <select className="input-field" value={audience} onChange={(e) => setAudience(e.target.value)}>
                <option value="ALL">Everyone (all active users)</option>
                <option value="USERS">Regular users only</option>
                <option value="ADMINS">Admins only</option>
              </select>
            </div>
            <button disabled={sending} className="btn-primary w-full">
              {sending ? 'Sending…' : <><FiSend /> Send announcement</>}
            </button>
          </form>

          <div className="card h-fit p-6 sm:p-7">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><FiClock /> Sent announcements</h2>
            <div className="mt-4 max-h-[520px] space-y-4 overflow-y-auto">
              {loadingHistory ? <p className="text-sm text-gray-500">Loading…</p>
                : history.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">No announcements sent yet.</p>
                  : history.map((a) => (
                    <div key={a.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">{a.title}</p>
                        <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{a.audience} · {a.recipients ?? '?'} users</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{a.message}</p>
                      <p className="mt-2 text-xs text-gray-400">{a.sentAt ? new Date(a.sentAt).toLocaleString() : ''}</p>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default function AdminAnnouncements() {
  return (
    <ProtectedRoute adminOnly>
      <AnnouncementsContent />
    </ProtectedRoute>
  );
}
