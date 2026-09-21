import { useState } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import Spinner from '../../components/Spinner';
import api from '../../lib/api';

export default function SetCommissionPage() {
  const [id, setId] = useState('');
  const [percent, setPercent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const affiliateId = Number(id);
    if (!Number.isInteger(affiliateId) || affiliateId <= 0) return toast.error('Enter a valid affiliate id');
    const p = Number(percent);
    if (!Number.isFinite(p) || p < 0) return toast.error('Enter a valid percentage');
    const commissionRate = Math.round((p / 100) * 100000) / 100000; // store as decimal
    setLoading(true);
    try {
      const res = await api.patch(`/admin/affiliates/${affiliateId}`, { commissionRate });
      toast.success('Commission rate updated');
      setResult(res.data.data.affiliate);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <Layout>
        <Head>
          <title>Admin — Set Affiliate Commission</title>
        </Head>
        <section className="section">
          <h1 className="text-2xl font-bold mb-4">Set Affiliate Commission Rate</h1>
          <form onSubmit={submit} className="max-w-md space-y-3">
            <label className="block text-sm">Affiliate ID
              <input className="input-field mt-1" value={id} onChange={(e) => setId(e.target.value)} placeholder="Enter affiliate id (e.g. 12)" />
            </label>
            <label className="block text-sm">Commission Percentage
              <input className="input-field mt-1" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="e.g. 10 for 10%" />
            </label>
            <div>
              <button type="submit" className="btn-primary">Save</button>
            </div>
            {loading && <Spinner />}
            {result && <div className="card p-4 mt-3">
              <p><strong>Updated Affiliate</strong></p>
              <p>ID: {result.id}</p>
              <p>Code: {result.code}</p>
              <p>Active: {result.isActive ? 'Yes' : 'No'}</p>
              <p>CommissionRate: {result.commissionRate}</p>
            </div>}
          </form>
        </section>
      </Layout>
    </ProtectedRoute>
  );
}
