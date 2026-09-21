import { useEffect, useState } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Spinner from '../../../components/Spinner';
import api from '../../../lib/api';

function PlanForm({ initial = {}, onClose, onSaved, serviceId }) {
  const [form, setForm] = useState({ name: '', price: 0, deliveryDays: 1, details: '', featuresText: '', isActive: true, imagePreview: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!initial || Object.keys(initial).length === 0) { setForm({ name: '', price: 0, deliveryDays: 1, details: '', featuresText: '', isActive: true, imagePreview: '' }); return; }
    const featuresText = initial.features ? (Array.isArray(initial.features) ? initial.features.join('\n') : (typeof initial.features === 'string' ? (() => { try { const p = JSON.parse(initial.features); return Array.isArray(p) ? p.join('\n') : initial.features; } catch (e) { return initial.features; } })() : '')) : '';
    setForm({ name: initial.name || '', price: initial.price || 0, deliveryDays: initial.deliveryDays || 1, details: initial.details || '', featuresText, isActive: initial.isActive !== false });
  }, [initial]);
  const submit = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      // convert featuresText (newline-separated) to array
      if (form.featuresText) payload.features = form.featuresText.split('\n').map((s) => s.trim()).filter(Boolean);
      if (form.imagePreview) payload.imageDataUrl = form.imagePreview;
      if (initial && initial.id) {
        await api.patch(`/admin/packages/${initial.id}`, payload);
        toast.success('Plan updated');
      } else {
        await api.post(`/admin/services/${serviceId}/packages`, payload);
        toast.success('Plan added');
      }
      onSaved();
    } catch (err) { toast.error('Failed to save plan'); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="card max-h-[90vh] w-full max-w-md overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">{initial?.id ? 'Edit Plan' : 'Add Plan'}</h3><button onClick={onClose}>Close</button></div>
        <div className="space-y-3">
          <div><label className="input-label">Name</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <label className="input-label">Package Image</label>
            <div className="flex items-center gap-3">
              <label className="btn-secondary">Upload<input type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files && e.target.files[0]; if (!f) return; const reader = new FileReader(); reader.onload = () => setForm((s) => ({ ...s, imagePreview: reader.result })); reader.readAsDataURL(f);
              }} className="hidden" /></label>
              {form.imagePreview && <img src={form.imagePreview} className="h-12 w-12 object-cover rounded" />}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className="input-label">Price</label><input type="number" className="input-field" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div><div><label className="input-label">Delivery Days</label><input type="number" className="input-field" value={form.deliveryDays} onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })} /></div></div>
          <div><label className="input-label">Details</label><textarea className="input-field" rows={3} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></div>
          <div>
            <label className="input-label">Features (one per line)</label>
            <textarea className="input-field" rows={4} value={form.featuresText} onChange={(e) => setForm({ ...form, featuresText: e.target.value })} />
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
          <div className="flex gap-3"><button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button><button className="btn-secondary" onClick={onClose}>Cancel</button></div>
        </div>
      </div>
    </div>
  );
}

export default function ManagePlans({ query }) {
  const id = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : query?.id;
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try { const { data } = await api.get(`/admin/services/${id}`); setService(data.data.service); } catch (err) { toast.error('Failed to load'); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [id]);

  const handleDelete = async (pkgId) => {
    if (!confirm('Delete this plan?')) return;
    try { await api.delete(`/admin/packages/${pkgId}`); toast.success('Plan deleted'); fetch(); } catch (err) { toast.error('Delete failed'); }
  };

  return (
    <ProtectedRoute adminOnly>
      <Layout>
        <Head><title>Manage Plans — Admin</title></Head>
        <section className="section">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Manage Plans</h1>
              <p className="text-sm text-gray-500">Service: {service?.platform} — {service?.name}</p>
            </div>
            <div><button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary"><FiPlus /> Add Plan</button></div>
          </div>

          {loading ? <Spinner full /> : (
            <div className="grid gap-4">
              {service?.packages?.map((p) => (
                <div key={p.id} className="card p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                        <h3 className="font-semibold">{p.name}</h3>
                        {p.imageUrl && <img src={p.imageUrl} className="h-16 w-16 object-cover rounded mt-2" />}
                    <p className="text-sm text-gray-500">₦{p.price} · {p.deliveryDays} days</p>
                    <p className="text-sm text-gray-500 mt-1">{p.details}</p>
                    {p.features && (
                      <ul className="mt-2 text-sm text-gray-500 list-disc list-inside">
                        {(typeof p.features === 'string' ? (() => { try { return JSON.parse(p.features); } catch (e) { return [p.features]; } })() : p.features).map((f, i) => (<li key={i}>{f}</li>))}
                      </ul>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(p); setShowForm(true); }} className="btn-secondary"><FiEdit2 /></button>
                    <button onClick={() => handleDelete(p.id)} className="btn-danger"><FiTrash2 /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {showForm && <PlanForm initial={editing} serviceId={id} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetch(); }} />}
      </Layout>
    </ProtectedRoute>
  );
}
