import { useState } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { FiSave, FiLock, FiTrash2, FiUser, FiCalendar } from 'react-icons/fi';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import FormField from '../../components/FormField';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function DashboardContent() {
  const { user, refreshUser, logout, setAvatar, removeAvatar } = useAuth();
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({
    fullName: user.fullName, phone: user.phone,
    dob: user.dob?.slice(0, 10) || '', gender: user.gender,
    country: user.country, state: user.state, city: user.city,
    businessName: user.businessName || '', address: user.address,
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const saveProfile = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      await api.put('/users/profile', form);
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!pwForm.currentPassword) e.currentPassword = 'Required';
    if (!STRONG_PASSWORD_REGEX.test(pwForm.newPassword)) e.newPassword = 'Min 8 chars incl. uppercase, lowercase, number & symbol';
    if (pwForm.confirmNewPassword !== pwForm.newPassword) e.confirmNewPassword = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await api.put('/users/change-password', pwForm);
      toast.success('Password changed');
      setPwForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    try {
      await api.delete('/users/account');
      toast.success('Account deleted');
      logout();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    }
  };

  return (
    <DashboardLayout>
      <Head><title>My Profile — NimbusWorks</title></Head>
      <section className="section">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Hi, {user.fullName.split(' ')[0]} 👋</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <FiCalendar size={14} /> Member since {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Active Account</span>
        </div>

        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 mb-8 overflow-x-auto">
          {[['profile', 'Profile', FiUser], ['security', 'Security', FiLock], ['danger', 'Danger Zone', FiTrash2]].map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <form onSubmit={saveProfile} className="card p-7 sm:p-8 space-y-5 max-w-3xl">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="relative">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="h-20 w-20 rounded-full object-cover border" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 grid place-items-center text-xl font-semibold">{user.fullName.split(' ').map(n => n[0]).slice(0,2).join('')}</div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="btn-secondary !px-3 !py-2 text-sm inline-flex items-center gap-2">
                  Upload Profile Picture
                  <input accept="image/*" type="file" onChange={async (e) => {
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = reader.result;
                      setAvatar(dataUrl);
                    };
                    reader.readAsDataURL(f);
                  }} className="hidden" />
                </label>
                {user.avatarUrl && (
                  <button type="button" onClick={() => removeAvatar()} className="btn-danger !px-3 !py-2 text-sm">Delete Profile Picture</button>
                )}
                <p className="text-xs text-gray-500">Profile Picture is uploaded to your account.</p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Full Name"><input className="input-field" value={form.fullName} onChange={set('fullName')} /></FormField>
              <FormField label="Phone Number"><input className="input-field" value={form.phone} onChange={set('phone')} /></FormField>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Date of Birth"><input type="date" className="input-field" value={form.dob} onChange={set('dob')} /></FormField>
              <FormField label="Gender">
                <select className="input-field" value={form.gender} onChange={set('gender')}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </FormField>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <FormField label="Country"><input className="input-field" value={form.country} onChange={set('country')} /></FormField>
              <FormField label="State"><input className="input-field" value={form.state} onChange={set('state')} /></FormField>
              <FormField label="City"><input className="input-field" value={form.city} onChange={set('city')} /></FormField>
            </div>
            <FormField label="Business Name"><input className="input-field" value={form.businessName} onChange={set('businessName')} /></FormField>
            <FormField label="Address"><input className="input-field" value={form.address} onChange={set('address')} /></FormField>
            <div className="grid gap-5 sm:grid-cols-2 pt-2 border-t border-gray-200 dark:border-gray-800">
              <FormField label="Username (read-only)"><input className="input-field opacity-60" value={user.username} disabled /></FormField>
              <FormField label="Email (read-only)"><input className="input-field opacity-60" value={user.email} disabled /></FormField>
            </div>
            <button disabled={saving} className="btn-primary">{saving ? 'Saving...' : <>Save Changes <FiSave /></>}</button>
          </form>
        )}

        {tab === 'security' && (
          <form onSubmit={changePassword} className="card p-7 sm:p-8 space-y-5 max-w-md">
            <FormField label="Current Password" required error={errors.currentPassword}>
              <input type="password" className="input-field" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
            </FormField>
            <FormField label="New Password" required error={errors.newPassword}>
              <input type="password" className="input-field" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
            </FormField>
            <FormField label="Confirm New Password" required error={errors.confirmNewPassword}>
              <input type="password" className="input-field" value={pwForm.confirmNewPassword} onChange={(e) => setPwForm({ ...pwForm, confirmNewPassword: e.target.value })} />
            </FormField>
            <button disabled={saving} className="btn-primary w-full">{saving ? 'Updating...' : 'Change Password'}</button>
          </form>
        )}

        {tab === 'danger' && (
          <div className="card p-7 sm:p-8 max-w-md border-red-200 dark:border-red-900/50">
            <h3 className="font-semibold text-gray-900 dark:text-white">Delete your account</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">This permanently removes your profile and all associated data. This action cannot be undone.</p>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="btn-danger mt-5">
                <FiTrash2 /> Delete My Account
              </button>
            ) : (
              <div className="mt-5 flex gap-3">
                <button onClick={deleteAccount} className="btn-danger">Yes, delete permanently</button>
                <button onClick={() => setConfirmDelete(false)} className="btn-secondary">Cancel</button>
              </div>
            )}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

export { DashboardContent };
