import { useEffect, useState } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../lib/api';

function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/support'); setTickets(data.data.tickets || []); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const sendReply = async (event, isInternal = false) => {
    event.preventDefault();
    if (!reply.trim() || !selected) return;
    const { data } = await api.post(`/admin/support/${selected.id}/messages`, { message: reply, isInternal });
    setSelected({ ...selected, messages: [...(selected.messages || []), data.data.message] });
    setReply('');
    load();
  };

  const updateStatus = async (status) => {
    const { data } = await api.patch(`/admin/support/${selected.id}`, { status });
    setSelected({ ...selected, ...data.data.ticket });
    load();
  };

  return <DashboardLayout><Head><title>Admin Support — NimbusWorks</title></Head><section className="section"><div className="mb-6"><h1 className="text-2xl font-bold">Support Center</h1><p className="mt-1 text-sm text-gray-500">Review and respond to customer tickets.</p></div><div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"><div className="card max-h-[70vh] overflow-y-auto p-4 sm:p-5">{loading ? <p className="text-sm text-gray-500">Loading...</p> : tickets.length === 0 ? <p className="text-sm text-gray-500">No tickets found.</p> : tickets.map((ticket) => <button key={ticket.id} onClick={() => setSelected(ticket)} className={`block w-full border-b border-gray-100 px-3 py-3.5 text-left leading-relaxed last:border-0 dark:border-gray-800 last:border-0 ${selected?.id === ticket.id ? 'bg-brand-50 dark:bg-gray-800' : ''}`}><div className="flex justify-between gap-3"><span className="font-medium">#{ticket.id} {ticket.subject}</span><span className="text-xs text-brand-600">{ticket.status}</span></div><p className="mt-1 text-xs text-gray-500">{ticket.user?.fullName || 'Unassigned customer'} · {ticket.category}</p></button>)}</div>{selected ? <div className="card min-w-0 p-4 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{selected.subject}</h2><p className="text-sm text-gray-500">Ticket #{selected.id} · {selected.user?.email}</p></div><select className="input-field w-auto" value={selected.status} onChange={(event) => updateStatus(event.target.value)}><option>OPEN</option><option>IN_PROGRESS</option><option>WAITING_FOR_USER</option><option>RESOLVED</option><option>CLOSED</option></select></div><div className="mt-5 space-y-3">{(selected.messages || []).map((message) => <div key={message.id} className={`rounded-lg p-3 ${message.isInternal ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}><p className="text-xs font-semibold text-gray-500">{message.isInternal ? 'INTERNAL NOTE' : 'MESSAGE'}</p><p className="mt-1 text-sm">{message.message}</p></div>)}</div><form onSubmit={(event) => sendReply(event)} className="mt-5 space-y-2"><textarea className="input-field min-h-24" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Type your reply..." /><div className="flex flex-wrap gap-2"><button className="btn-primary">Send Reply</button><button type="button" onClick={(event) => sendReply(event, true)} className="btn-secondary">Add Internal Note</button></div></form></div> : <div className="card p-5 text-sm text-gray-500">Select a ticket to view the conversation.</div>}</div></section></DashboardLayout>;
}

export default function Page() { return <ProtectedRoute adminOnly><AdminSupport /></ProtectedRoute>; }
