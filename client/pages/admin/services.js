import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { FiEdit2, FiImage, FiPackage, FiPlus, FiPower, FiSearch, FiTrash2, FiX } from 'react-icons/fi';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import Spinner from '../../components/Spinner';
import api from '../../lib/api';

const categories = ['Video Promotion', 'Social Media Advertising', 'Profile Promotion', 'Post Promotion', 'Channel Promotion', 'App Promotion', 'Other'];
const emptyService = { platform: '', name: '', description: '', category: '', requirements: '', isActive: true, imageDataUrl: '' };
const emptyPlan = { name: '', price: '', deliveryDays: '3', details: '', features: '', requirements: '', isActive: true };
const money = (value) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value || 0);
const listToPayload = (value) => value.split('\n').map((item) => item.trim()).filter(Boolean);
const listToText = (value) => { try { return Array.isArray(value) ? value.join('\n') : JSON.parse(value || '[]').join('\n'); } catch { return value || ''; } };

function ServiceForm({ service, onClose, onSaved }) {
  const [form, setForm] = useState(service ? { ...service, requirements: listToText(service.requirements), imageDataUrl: '' } : emptyService);
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Validate type and size (max 2MB)
    if (!file.type.startsWith('image/')) { toast.error('Only image files are allowed'); return; }
    const MAX = 2 * 1024 * 1024;
    if (file.size > MAX) { toast.error('Image too large (max 2MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => set('imageDataUrl', reader.result);
    reader.readAsDataURL(file);
  };
  const save = async (event) => {
    event.preventDefault();
    if (!form.platform.trim() || !form.name.trim() || !form.description.trim()) return toast.error('Platform, service name, and description are required.');
    setSaving(true);
    try {
      if (!form.platform || !form.name) { toast.error('Platform and name are required'); setSaving(false); return; }
      const payload = { platform: form.platform, name: form.name, description: form.description, isActive: form.isActive, category: form.category || null, requirements: listToPayload(form.requirements) };
      if (form.imageDataUrl) payload.imageDataUrl = form.imageDataUrl;
      if (service) await api.patch(`/admin/services/${service.id}`, payload);
      else await api.post('/admin/services', payload);
      toast.success(service ? 'Service updated successfully.' : 'Service created successfully.');
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Unable to save service.'); }
    finally { setSaving(false); }
  };
  const preview = form.imageDataUrl || form.imageUrl;
  return <Modal title={service ? 'Edit Service' : 'Add Service'} onClose={onClose}>
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center gap-4"><label className="grid h-20 w-20 cursor-pointer place-items-center overflow-hidden rounded-lg border border-gray-700 bg-gray-900 text-gray-400">{preview ? <img src={preview} alt="Service preview" className="h-full w-full object-cover" /> : <FiImage size={24} />}<input type="file" accept="image/png,image/jpeg" className="hidden" onChange={chooseImage} /></label><p className="text-sm text-gray-400">Platform logo<br />PNG or JPEG, max 1 MB</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Platform Name" value={form.platform} onChange={(v) => set('platform', v)} /><Field label="Service Name" value={form.name} onChange={(v) => set('name', v)} /></div>
      <Field label="Description" textarea value={form.description} onChange={(v) => set('description', v)} />
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-gray-300">Category<select className="input-field mt-1" value={form.category || ''} onChange={(e) => set('category', e.target.value)}><option value="">Select category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="flex items-center gap-2 pt-6 text-sm text-gray-300"><input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Active and purchasable</label></div>
      <Field label="Requirements (one per line)" textarea value={form.requirements} onChange={(v) => set('requirements', v)} placeholder="Video URL\nCampaign target" />
      <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Service'}</button></div>
    </form>
  </Modal>;
}

function PlanManager({ service, onClose, onSaved }) {
  const [plans, setPlans] = useState(service.packages || []); const [editing, setEditing] = useState(null); const [showPlanForm, setShowPlanForm] = useState(false); const [form, setForm] = useState(emptyPlan); const [saving, setSaving] = useState(false);
  const openPlan = (plan = null) => { setEditing(plan); setShowPlanForm(true); setForm(plan ? { ...plan, price: String(plan.price), deliveryDays: String(plan.deliveryDays), features: listToText(plan.features), requirements: listToText(plan.requirements) } : emptyPlan); };
  const closePlan = () => { setShowPlanForm(false); setEditing(null); setForm(emptyPlan); };
  const save = async (event) => { event.preventDefault(); if (!form.name.trim() || Number(form.price) < 0 || form.price === '') return toast.error('Plan name and a valid price are required.'); setSaving(true); try { const payload = { ...form, price: Number(form.price), deliveryDays: Number(form.deliveryDays), features: listToPayload(form.features), requirements: listToPayload(form.requirements) }; const { data } = editing ? await api.patch(`/admin/packages/${editing.id}`, payload) : await api.post(`/admin/services/${service.id}/packages`, payload); setPlans((items) => editing ? items.map((item) => item.id === editing.id ? data.data.package : item) : [...items, data.data.package]); closePlan(); toast.success(editing ? 'Plan updated successfully.' : 'Plan added successfully.'); onSaved(); } catch (err) { toast.error(err.response?.data?.message || 'Unable to save plan.'); } finally { setSaving(false); } };
  const remove = async (id) => { if (!window.confirm('Delete this plan? Existing orders will remain available.')) return; try { await api.delete(`/admin/packages/${id}`); setPlans((items) => items.filter((item) => item.id !== id)); toast.success('Plan deleted.'); onSaved(); } catch (err) { toast.error(err.response?.data?.message || 'Unable to delete plan.'); } };
  return <Modal title={`Manage Plans: ${service.name}`} onClose={onClose} wide><div className="mb-5 flex justify-end"><button className="btn-primary" onClick={() => openPlan()}><FiPlus /> Add Plan</button></div>{plans.length === 0 ? <p className="py-8 text-center text-gray-400">No plans have been created yet.</p> : <div className="space-y-3">{plans.map((plan) => <div key={plan.id} className="rounded-lg border border-gray-800 p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold text-white">{plan.name} {!plan.isActive && <span className="text-xs text-amber-400">Inactive</span>}</p><p className="mt-1 text-sm text-gray-400">{plan.details || 'No description'} · {plan.deliveryDays} days</p></div><div className="flex items-center gap-3"><b>{money(plan.price)}</b><button aria-label="Edit plan" onClick={() => openPlan(plan)} className="icon-button"><FiEdit2 /></button><button aria-label="Delete plan" onClick={() => remove(plan.id)} className="icon-button text-red-400"><FiTrash2 /></button></div></div></div>)}</div>}{showPlanForm && <div className="mt-6 rounded-lg border border-blue-800 bg-gray-950 p-4"><h3 className="mb-4 font-semibold text-white">{editing ? 'Edit Plan' : 'Add Plan'}</h3><form onSubmit={save} className="space-y-3"><div className="grid gap-3 sm:grid-cols-3"><Field label="Plan Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} /><Field label="Price (NGN)" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} /><Field label="Delivery (days)" type="number" value={form.deliveryDays} onChange={(v) => setForm({ ...form, deliveryDays: v })} /></div><Field label="Description" textarea value={form.details || ''} onChange={(v) => setForm({ ...form, details: v })} /><Field label="Features (one per line)" textarea value={form.features} onChange={(v) => setForm({ ...form, features: v })} /><Field label="Requirements (one per line, overrides service requirements)" textarea value={form.requirements} onChange={(v) => setForm({ ...form, requirements: v })} /><label className="text-sm text-gray-300"><input type="checkbox" className="mr-2" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Active and purchasable</label><div className="flex justify-end gap-3"><button type="button" onClick={closePlan} className="btn-secondary">Cancel</button><button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Plan'}</button></div></form></div>}</Modal>;
}

function Field({ label, value, onChange, textarea, type = 'text', placeholder = '' }) { return <label className="block text-sm text-gray-300">{label}{textarea ? <textarea className="input-field mt-1 min-h-24" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /> : <input className="input-field mt-1" type={type} min={type === 'number' ? '0' : undefined} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}</label>; }
function Modal({ title, children, onClose, wide }) { return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4"><div className={`mx-auto my-8 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-lg border border-gray-800 bg-gray-950 p-5 shadow-2xl sm:p-6`}><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold text-white">{title}</h2><button onClick={onClose} aria-label="Close" className="icon-button"><FiX /></button></div>{children}</div></div>; }

function AdminServices() {
  const [services, setServices] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [category, setCategory] = useState(''); const [editing, setEditing] = useState(null); const [plansFor, setPlansFor] = useState(null);
  const load = useCallback(async () => { setLoading(true); try { const { data } = await api.get('/admin/services'); setServices(data.data.services || []); setError(''); } catch (err) { setError(err.response?.data?.message || 'Unable to load services.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = useMemo(() => services.filter((service) => (!search || `${service.platform} ${service.name}`.toLowerCase().includes(search.toLowerCase())) && (!status || String(service.isActive) === status) && (!category || service.category === category)), [services, search, status, category]);
  const disable = async (id) => { if (!window.confirm('Disable this service? Users will no longer be able to purchase it.')) return; try { await api.patch(`/admin/services/${id}/disable`); toast.success('Service disabled successfully.'); load(); } catch (err) { toast.error(err.response?.data?.message || 'Unable to disable service.'); } };
  const remove = async (id) => { if (!window.confirm('Delete this service permanently? Its plans will be removed and this cannot be undone.')) return; try { await api.delete(`/admin/services/${id}`); toast.success('Service deleted successfully.'); load(); } catch (err) { toast.error(err.response?.data?.message || 'Unable to delete service.'); } };
  return <DashboardLayout><Head><title>Services / Plans | Admin</title></Head><section className="section  text-white"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-extrabold">Services / Plans</h1><p className="mt-2 text-gray-400">Manage the advertising services and plans available to users.</p></div><button className="btn-primary" onClick={() => setEditing({})}><FiPlus /> Add Service</button></div><div className="mb-5 grid gap-3 sm:grid-cols-3"><label className="relative sm:col-span-1"><FiSearch className="absolute left-3 top-3 text-gray-500" /><input className="input-field pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services" /></label><select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select><select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>{loading ? <Spinner full /> : error ? <p className="py-12 text-center text-red-400">{error}</p> : filtered.length === 0 ? <div className="rounded-lg border border-dashed border-gray-700 py-16 text-center text-gray-400">No services have been created yet.</div> : <div className="overflow-x-auto rounded-lg border border-gray-800"><table className="min-w-full text-left text-sm"><thead className="bg-gray-900 text-gray-400"><tr><th className="p-4">Platform</th><th className="p-4">Service</th><th className="p-4">From</th><th className="p-4">Plans</th><th className="p-4">Status</th><th className="p-4">Created</th><th className="p-4 text-right">Actions</th></tr></thead><tbody>{filtered.map((service) => { const prices = service.packages.filter((plan) => plan.isActive).map((plan) => plan.price); return <tr key={service.id} className="border-t border-gray-800 text-gray-200"><td className="p-4"><div className="flex items-center gap-3">{service.imageUrl ? <img src={service.imageUrl} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded bg-blue-950 text-blue-300">{service.platform[0]}</div>}<span>{service.platform}</span></div></td><td className="p-4"><p className="font-medium text-white">{service.name}</p><p className="max-w-xs truncate text-xs text-gray-500">{service.description}</p></td><td className="p-4">{prices.length ? money(Math.min(...prices)) : 'No active plan'}</td><td className="p-4">{service.packages.length}</td><td className="p-4"><span className={service.isActive ? 'text-emerald-400' : 'text-amber-400'}>{service.isActive ? 'Active' : 'Inactive'}</span></td><td className="p-4 text-gray-400">{new Date(service.createdAt).toLocaleDateString()}</td><td className="p-4"><div className="flex justify-end gap-2"><button title="Edit" className="icon-button" onClick={() => setEditing(service)}><FiEdit2 /></button><button title="Manage plans" className="icon-button" onClick={() => setPlansFor(service)}><FiPackage /></button><button title="Disable" className="icon-button" onClick={() => disable(service.id)} disabled={!service.isActive}><FiPower /></button><button title="Delete" className="icon-button text-red-400" onClick={() => remove(service.id)}><FiTrash2 /></button></div></td></tr>; })}</tbody></table></div>}{editing !== null && <ServiceForm service={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={load} />}{plansFor && <PlanManager service={plansFor} onClose={() => setPlansFor(null)} onSaved={load} />}</section></DashboardLayout>;
}

export default function Page() { return <ProtectedRoute adminOnly><AdminServices /></ProtectedRoute>; }
