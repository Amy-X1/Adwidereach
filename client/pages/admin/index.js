import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { FiUsers, FiUserPlus, FiActivity, FiMail, FiDownload, FiSearch, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import Link from 'next/link';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import Spinner from '../../components/Spinner';
import api from '../../lib/api';
import DashboardLayout from '../../components/DashboardLayout';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card overflow-hidden p-4 sm:p-6">
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${color}`}>
        <Icon size={20} />
      </div>
      <p className="mt-4 text-2xl font-extrabold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    fullName: user.fullName, phone: user.phone, country: user.country,
    state: user.state, city: user.city, role: user.role, isActive: user.isActive,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/users/${user.id}`, form);
      toast.success('User updated');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 animate-fade-in">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-7">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit User</h3>
          <button onClick={onClose}><FiX size={20} className="text-gray-400" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="input-label">Full Name</label>
            <input className="input-field" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="input-label">Phone</label>
              <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Role</label>
              <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="input-label">Country</label>
              <input className="input-field" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div>
              <label className="input-label">State</label>
              <input className="input-field" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <label className="input-label">City</label>
              <input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Account active
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <button disabled={saving} onClick={save} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Changes'}</button>
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AdminContent() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [contactMessages, setContactMessages] = useState([]);
  const [contactReplies, setContactReplies] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);

  const fetchStats = useCallback(async () => {
    const { data } = await api.get('/admin/stats');
    setStats(data.data);
  }, []);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', {
        params: { page, limit: 8, search: search || undefined, role: roleFilter || undefined },
      });
      setUsers(data.data.users);
      setPagination(data.data.pagination);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    api.get('/admin/contacts', { params: { limit: 20 } }).then(({ data }) => setContactMessages(data.data.messages || [])).catch(() => toast.error('Failed to load contact messages'));
  }, []);
  useEffect(() => {
    const t = setTimeout(() => fetchUsers(1), 350);
    return () => clearTimeout(t);
  }, [search, roleFilter, fetchUsers]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      fetchUsers(pagination.page);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const exportCsv = async () => {
    try {
      const res = await api.get('/admin/users/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users-export-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const replyToContact = async (id) => {
    const reply = contactReplies[id]?.trim();
    if (!reply) return toast.error('Type a reply first.');
    setReplyingTo(id);
    try {
      const { data } = await api.patch(`/admin/contacts/${id}/reply`, { reply });
      setContactMessages((messages) => messages.map((message) => message.id === id ? data.data.message : message));
      setContactReplies((replies) => ({ ...replies, [id]: '' }));
      toast.success('Reply saved');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save reply'); }
    finally { setReplyingTo(null); }
  };

  return (
    <DashboardLayout>
    {/* <Layout> */}
      <Head><title>Admin Dashboard — AdWideReach</title></Head>
      <section className="section">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <div className="flex gap-3">
            <button onClick={exportCsv} className="btn-secondary text-sm"><FiDownload size={15} /> Export Users CSV</button>
          </div>
        </div>

        {stats ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <StatCard icon={FiUsers} label="Total Users" value={stats.totalUsers} color="bg-brand-600/10 text-brand-600" />
              <StatCard icon={FiUserPlus} label="New Users Today" value={stats.newUsersToday} color="bg-emerald-500/10 text-emerald-600" />
              <StatCard icon={FiActivity} label="Active Users (7d)" value={stats.activeUsers} color="bg-amber-500/10 text-amber-600" />
              <StatCard icon={FiMail} label="Contact Messages" value={stats.totalContactMessages} color="bg-purple-500/10 text-purple-600" />
            </div>

            <div className="card mb-8 p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white sm:text-base">Registration Trend (Last 30 Days)</h3>
              <p className="mb-3 mt-1 text-xs text-gray-500 dark:text-gray-400">New sign-ups per day — sized to fit without stretching.</p>
              <div className="h-56 w-full sm:h-64 lg:h-72">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={stats.registrationTrend} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3660ff" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3660ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickMargin={8} tickFormatter={(d) => d.slice(5)} minTickGap={28} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickMargin={4} width={40} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} labelStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="count" stroke="#3660ff" fill="url(#colorCount)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : <Spinner full />}

        <div className="card overflow-hidden p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[220px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                className="input-field pl-9"
                placeholder="Search name, email, username, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="input-field w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          {loading ? <Spinner full /> : (
            <>
              <div className="-mx-4 overflow-x-auto sm:-mx-6">
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                      <th className="px-5 py-4 font-semibold leading-relaxed first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6">Name</th>
                      <th className="px-5 py-4 font-semibold leading-relaxed first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6">Email</th>
                      <th className="px-5 py-4 font-semibold leading-relaxed first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6">Location</th>
                      <th className="px-5 py-4 font-semibold leading-relaxed first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6">Role</th>
                      <th className="px-5 py-4 font-semibold leading-relaxed first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6">Status</th>
                      <th className="px-5 py-4 font-semibold leading-relaxed first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6">Joined</th>
                      <th className="px-5 py-4 text-right font-semibold leading-relaxed first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="whitespace-nowrap px-5 py-5 align-middle font-medium leading-relaxed first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6 text-gray-900 dark:text-white">{u.fullName}<br /><span className="text-xs text-gray-400">@{u.username}</span></td>
                        <td className="whitespace-nowrap px-5 py-5 align-middle leading-relaxed text-gray-600 first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6 dark:text-gray-300">{u.email}</td>
                        <td className="whitespace-nowrap px-5 py-5 align-middle leading-relaxed text-gray-600 first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6 dark:text-gray-300">{u.city}, {u.country}</td>
                        <td className="whitespace-nowrap px-5 py-5 align-middle leading-relaxed first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6">
                          <span className={`badge ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>{u.role}</span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-5 align-middle leading-relaxed first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6">
                          <span className={`badge ${u.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>{u.isActive ? 'Active' : 'Disabled'}</span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-5 align-middle leading-relaxed text-gray-500 first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6 dark:text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="whitespace-nowrap px-5 py-5 align-middle leading-relaxed first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingUser(u)} className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-brand-600"><FiEdit2 size={14} /></button>
                            <button onClick={() => setDeletingId(u.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-red-600"><FiTrash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={7} className="px-5 py-10 sm:px-6 text-center text-gray-400">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-5 text-sm text-gray-500 dark:text-gray-400">
                <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} users</span>
                <div className="flex gap-2">
                  <button disabled={pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)} className="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-40">Prev</button>
                  <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchUsers(pagination.page + 1)} className="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-40">Next</button>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="card mt-8 p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">Contact Messages</h2>
          {contactMessages.length === 0 ? <p className="text-sm text-gray-500">No contact messages yet.</p> : <div className="space-y-5">{contactMessages.map((message) => <div key={message.id} className="border-b border-gray-200 pb-5 last:border-0 last:pb-0 dark:border-gray-800"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-medium text-gray-900 dark:text-white">{message.subject}</p><p className="text-xs text-gray-500">{message.name} · {message.email}</p></div><span className="text-xs text-gray-500">{new Date(message.createdAt).toLocaleString()}</span></div><p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{message.message}</p>{message.reply && <p className="mt-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-800 dark:bg-brand-900/20 dark:text-brand-200"><strong>Reply:</strong> {message.reply}</p>}<div className="mt-3 flex flex-col gap-2 sm:flex-row"><textarea className="input-field min-h-20 flex-1" value={contactReplies[message.id] || ''} onChange={(event) => setContactReplies({ ...contactReplies, [message.id]: event.target.value })} placeholder="Type a response..." /><button onClick={() => replyToContact(message.id)} disabled={replyingTo === message.id} className="btn-primary self-start sm:self-end">{replyingTo === message.id ? 'Saving...' : 'Reply'}</button></div></div>)}</div>}
        </div>
      </section>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); fetchUsers(pagination.page); }}
        />
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="card w-full max-w-sm p-6 text-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">Delete this user?</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">This action is permanent and cannot be undone.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => handleDelete(deletingId)} className="btn-danger flex-1">Delete</button>
              <button onClick={() => setDeletingId(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    {/* </Layout> */}
    </DashboardLayout>
  );
}

export default function Admin() {
  return (
    <ProtectedRoute adminOnly>
      <AdminContent />
    </ProtectedRoute>
  );
}
