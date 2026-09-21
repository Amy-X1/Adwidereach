import { useEffect, useState } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../lib/api';

const paymentFields = [
  { key: 'BANK_NAME', label: 'Bank Name' },
  { key: 'ACCOUNT_NUMBER', label: 'Account Number' },
  { key: 'ACCOUNT_NAME', label: 'Account Name' },
];

export default function AdminSettings() {
  const [payment, setPayment] = useState({ BANK_NAME: '', ACCOUNT_NUMBER: '', ACCOUNT_NAME: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/admin/settings');
        const rows = data.data.settings || [];
        const pay = {};
        for (const f of paymentFields) pay[f.key] = rows.find((r) => r.key === f.key)?.value || '';
        setPayment(pay);
      } catch (err) { toast.error('Failed to load settings'); }
    })();
  }, []);

  const update = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', { settings: paymentFields.map((f) => ({ key: f.key, value: payment[f.key] })) });
      toast.success('Saved');
    } catch (err) { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <ProtectedRoute adminOnly>
      <DashboardLayout>
        <Head><title>Admin — Settings</title></Head>
        <section className="section">
          <h1 className="text-2xl font-bold mb-4">Settings</h1>
          <div className="card p-4 mb-6">
            <h2 className="font-semibold mb-1">Bank Transfer Details</h2>
            <p className="text-sm text-gray-500 mb-3">Shown to users on Add Funds and at checkout.</p>
            <div className="space-y-4">
              {paymentFields.map((f) => (
                <div key={f.key} className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-3 sm:items-center">
                  <div className="font-medium">{f.label}</div>
                  <input className="input-field sm:col-span-2" value={payment[f.key]} onChange={(e) => setPayment({ ...payment, [f.key]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button disabled={saving} onClick={update} className="btn-primary">{saving ? 'Saving...' : 'Save Settings'}</button>
            </div>
          </div>
        </section>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
