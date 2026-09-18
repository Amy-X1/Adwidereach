import ProtectedRoute from '../../components/ProtectedRoute';
import DashboardLayout from '../../components/DashboardLayout';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import api from '../../lib/api';


function Support() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/tickets').then((res) => setTickets(res.data.data.tickets)).catch((err) => setError(err.response?.data?.message || err.message)).finally(() => setLoading(false));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/tickets', { subject, message });
      setTickets([res.data.data.ticket, ...tickets]);
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openTicket = async (ticket) => {
    try {
      const res = await api.get(`/tickets/${ticket.id}`);
      setSelectedTicket(res.data.data.ticket);
    } catch (err) { setError(err.response?.data?.message || 'Unable to load ticket.'); }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !selectedTicket) return;
    setReplying(true);
    try {
      const res = await api.post(`/tickets/${selectedTicket.id}/messages`, { message: reply });
      setSelectedTicket({ ...selectedTicket, messages: [...(selectedTicket.messages || []), res.data.data.message] });
      setReply('');
    } catch (err) { setError(err.response?.data?.message || 'Unable to send your message.'); }
    finally { setReplying(false); }
  };
  return (
    <DashboardLayout>
      <Head><title>Support — Dashboard</title></Head>
      <section className="section">
        <h1 className="text-xl font-bold sm:text-2xl">Support / Tickets</h1>
        <p className="mb-4 mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">Open a ticket and chat with support — sized to fit without stretching.</p>
        <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="card min-w-0 p-4 sm:p-5">
            <h3 className="text-sm font-semibold sm:text-base">Open a new ticket</h3>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <form onSubmit={submit}>
              <div>
                <label className="input-label">Subject</label>
                <input className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              </div>
              <div className="mt-3">
                <label className="input-label">Message</label>
                <textarea className="input-field h-28" value={message} onChange={(e) => setMessage(e.target.value)} required />
              </div>
              <div className="mt-3">
                <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send Ticket'}</button>
              </div>
            </form>
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold sm:text-base">Your tickets</h3>
            {loading && <p className="mt-2 text-sm text-gray-500">Loading…</p>}
            {!loading && tickets.length === 0 && <p className="mt-2 text-sm text-gray-500">No tickets yet.</p>}
            {!loading && tickets.length > 0 && (
              <div className="card mt-2 max-h-[70vh] min-w-0 overflow-y-auto p-4 sm:p-5">
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {tickets.map((t) => (
                    <li key={t.id} className="py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-sm">{t.subject}</div>
                          <div className="mt-0.5 text-xs text-gray-500">{new Date(t.createdAt).toLocaleString()}</div>
                        </div>
                        <button onClick={() => openTicket(t)} className="shrink-0 text-sm text-brand-600 hover:underline">View</button>
                      </div>
                      <p className="mt-2 break-words text-sm leading-relaxed text-gray-700 dark:text-gray-300">{t.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        {selectedTicket && <div className="card mx-auto mt-6 w-full max-w-2xl min-w-0 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-semibold sm:text-base">{selectedTicket.subject}</h3><p className="mt-0.5 text-xs text-gray-500 sm:text-sm">Ticket #{selectedTicket.id} · {selectedTicket.status}</p></div><button onClick={() => setSelectedTicket(null)} className="shrink-0 text-sm text-brand-600 hover:underline">Close</button></div><div className="mt-5 max-h-[50vh] space-y-3 overflow-y-auto pr-1">{(selectedTicket.messages || []).map((message) => <div key={message.id} className="rounded-lg bg-gray-50 p-3 leading-relaxed dark:bg-gray-800"><p className="break-words text-sm text-gray-700 dark:text-gray-200">{message.message}</p><p className="mt-1 text-xs text-gray-500">{new Date(message.createdAt).toLocaleString()}</p></div>)}</div>{!['RESOLVED', 'CLOSED'].includes(selectedTicket.status) && <form onSubmit={sendReply} className="mt-5 flex flex-col gap-2 sm:flex-row"><input className="input-field min-w-0 flex-1" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply..." /><button className="btn-primary shrink-0" disabled={replying}>{replying ? 'Sending...' : 'Send'}</button></form>}</div>}
      </section>
    </DashboardLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <Support />
    </ProtectedRoute>
  );
}
