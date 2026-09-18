import ProtectedRoute from '../../components/ProtectedRoute';
import DashboardLayout from '../../components/DashboardLayout';
import Head from 'next/head';
// import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
// import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import Spinner from '../../components/Spinner';

const money = (value) => `₦${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const badge = (status) => status?.replaceAll('_', ' ');

function Affiliates() {
  const [data, setData] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Bank transfer');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();
  const load = async () => {
    setLoading(true);
    try {
      const asAffiliate = router.query.asAffiliate || router.query.asAffiliateId;
      if (asAffiliate && user?.role === 'ADMIN') {
        // Admin viewing a specific affiliate
        const [summary, history, payoutHistory] = await Promise.all([
          api.get(`/admin/affiliates/${asAffiliate}`),
          api.get(`/admin/affiliates/commissions?affiliateId=${asAffiliate}`),
          api.get(`/admin/affiliates/withdrawals?affiliateId=${asAffiliate}`),
        ]);
        setData(summary.data.data); setCommissions(history.data.data.commissions || []); setWithdrawals(payoutHistory.data.data.withdrawals || []);
      } else {
        const [summary, history, payoutHistory] = await Promise.all([api.get('/affiliates/me'), api.get('/affiliates/commissions'), api.get('/affiliates/withdrawals')]);
        setData(summary.data.data); setCommissions(history.data.data.commissions || []); setWithdrawals(payoutHistory.data.data.withdrawals || []);
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Could not load affiliate data'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [router.query.asAffiliate, router.query.asAffiliateId, user]);
  // If loading finished but we couldn't load data, show retry UI instead of crashing
  if (!loading && !data) {
    return (
      <DashboardLayout>
        <Head><title>Affiliates — Dashboard</title></Head>
        <div className="w-full py-12 text-center">
          <p className="text-sm text-red-500">Unable to load affiliate data.</p>
          <div className="mt-4"><button className="btn-primary" onClick={load}>Retry</button></div>
        </div>
      </DashboardLayout>
    );
  }
  const copy = async (value, label) => { try { await navigator.clipboard.writeText(value); toast.success(`${label} copied.`); } catch { toast.error('Copy is not supported in this browser'); } };
  // const { user } = useAuth();
  const withdraw = async () => { try { await api.post('/affiliates/withdrawals', { amount: Number(amount), paymentMethod: method, accountName, accountNumber, bankName }); toast.success('Withdrawal requested.'); setAmount(''); setAccountName(''); setAccountNumber(''); setBankName(''); load(); } catch (err) { toast.error(err.response?.data?.message || 'Withdrawal failed'); } };
  if (loading) return <DashboardLayout><Spinner full /></DashboardLayout>;
  // Accept either `enable` or `enabled` from API and either `isActive` or `active` on affiliate.
  // Default to active when fields are missing so the UI doesn't incorrectly show unavailable.
  const settingsEnabled = data?.settings?.enable ?? data?.settings?.enabled;
  const affiliateActive = data?.affiliate?.isActive ?? data?.affiliate?.active;
  const enabled = typeof settingsEnabled === 'boolean' || typeof affiliateActive === 'boolean'
    ? !!(settingsEnabled || affiliateActive)
    : true;
  const affiliate = data?.affiliate || {};
  const settings = data?.settings || {};
  const stats = data?.stats || {};
  const referrals = data?.referrals || [];
  return (
    <DashboardLayout>
      <Head><title>Affiliates — Dashboard</title></Head>
      <div className="w-full space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white sm:text-2xl">Affiliate Program</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Earn commissions by referring new customers to our platform.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user?.role === 'ADMIN' && <Link href="/admin/affiliates" className="btn-secondary text-sm">View All Affiliates</Link>}
            <span className={`badge ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{enabled ? 'Active' : 'Inactive'}</span>
          </div>
        </div>

        {!enabled && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-50 p-3.5 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            The affiliate program is currently unavailable. Ask an administrator if you need more information.
          </div>
        )}

        <div className="card p-4 sm:p-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Your Referral Link</h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200 sm:text-sm">{affiliate.referralLink || '—'}</code>
            <button onClick={() => copy(affiliate.referralLink || '', 'Referral link')} className="btn-primary shrink-0 text-sm">Copy Link</button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Referral Code: <strong className="text-gray-900 dark:text-white">{affiliate.code || '—'}</strong></span>
            <span>Affiliate ID: <strong className="text-gray-900 dark:text-white">{affiliate.id ?? '—'}</strong></span>
            <button onClick={() => copy(affiliate.code || '', 'Referral code')} className="btn-secondary !px-3 !py-1.5 text-xs">Copy Code</button>
            {typeof navigator !== 'undefined' && navigator.share && affiliate.referralLink && (
              <button onClick={() => navigator.share({ title: 'Join me', url: affiliate.referralLink })} className="btn-secondary !px-3 !py-1.5 text-xs">Share</button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['Total Referrals', stats.totalReferrals || 0], ['Total Earnings', money(stats.total)], ['Pending Earnings', money(stats.pending)], ['Available Balance', money(stats.available)]].map(([label, value]) => (
            <div key={label} className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
              <p className="mt-1.5 truncate text-lg font-bold tabular-nums text-gray-900 dark:text-white sm:text-xl">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="card min-w-0 p-4 sm:p-5 lg:col-span-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Referrals</h2>
            <div className="-mx-4 mt-3 overflow-x-auto sm:-mx-5">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-4 pb-2 font-medium sm:px-5">Customer</th>
                    <th className="px-4 pb-2 font-medium sm:px-5">Joined</th>
                    <th className="px-4 pb-2 font-medium sm:px-5">Purchase</th>
                    <th className="px-4 pb-2 font-medium sm:px-5">Commission</th>
                    <th className="px-4 pb-2 font-medium sm:px-5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.length ? referrals.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-gray-900 dark:text-gray-100 sm:px-5">{r.name || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-gray-500 dark:text-gray-400 sm:px-5">{r.joinedAt ? new Date(r.joinedAt).toLocaleDateString() : '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 tabular-nums sm:px-5">{r.orderAmount ? money(r.orderAmount) : '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 sm:px-5">{r.commission ? money(r.commission) : '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 sm:px-5"><span className="badge bg-brand-500/10 text-brand-700 dark:text-brand-300">{badge(r.status)}</span></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">You don't have any referrals yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-4 sm:p-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Commission Rate</h2>
            <p className="mt-2 text-2xl font-bold tabular-nums text-brand-600 sm:text-3xl">{(((affiliate.commissionRate ?? settings.commissionRate) ?? 0) * 100).toFixed(0)}%</p>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Commissions become available after {settings.holdDays ?? '—'} day(s). Minimum withdrawal: {money(settings.minimumWithdrawal)}</p>
            {enabled && (
              <div className="mt-4 space-y-2.5">
                <input
                  type="number"
                  min={Number(settings.minimumWithdrawal) || 0}
                  className="input-field"
                  placeholder="Withdrawal amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <select className="input-field" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option>Bank transfer</option>
                </select>
                <input className="input-field" placeholder="Account name" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                <input className="input-field" placeholder="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                <input className="input-field" placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                <button
                  disabled={!(amount && accountName.trim() && accountNumber.trim() && bankName.trim() && Number.isFinite(Number(amount)) && Number(amount) > 0 && Number(amount) >= (Number(settings.minimumWithdrawal) || 0) && Number(amount) <= (Number(stats.available) || 0))}
                  onClick={withdraw}
                  className="btn-primary w-full text-sm"
                >
                  Withdraw
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">Minimum: {money(Number(settings.minimumWithdrawal) || 0)} · Available: {money(Number(stats.available) || 0)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card min-w-0 p-4 sm:p-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Commission History</h2>
          <div className="-mx-4 mt-3 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 pb-2 font-medium sm:px-5">Order</th>
                  <th className="px-4 pb-2 font-medium sm:px-5">Customer</th>
                  <th className="px-4 pb-2 font-medium sm:px-5">Amount</th>
                  <th className="px-4 pb-2 font-medium sm:px-5">Rate</th>
                  <th className="px-4 pb-2 font-medium sm:px-5">Commission</th>
                  <th className="px-4 pb-2 font-medium sm:px-5">Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-gray-500 dark:text-gray-400 sm:px-5">{c.order?.reference || c.orderReference || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium text-gray-900 dark:text-gray-100 sm:px-5">{c.referredCustomer || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 tabular-nums sm:px-5">{money(c.orderAmount)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-gray-500 dark:text-gray-400 sm:px-5">{((c.rate ?? 0) * 100).toFixed(0)}%</td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 sm:px-5">{money(c.amount)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 sm:px-5"><span className="badge bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">{badge(c.status)}</span></td>
                  </tr>
                ))}
                {!commissions.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">No commissions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">How It Works</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-300">
            <li>Share your referral link.</li>
            <li>A new customer registers using your referral link.</li>
            <li>They complete a qualifying successful purchase.</li>
            <li>Your commission is recorded and becomes available after the hold period.</li>
          </ol>
          {withdrawals.length > 0 && <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Latest withdrawal: {money(withdrawals[0].amount)} · {withdrawals[0].status}{withdrawals[0].reason ? ` · ${withdrawals[0].reason}` : ''}</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <Affiliates />
    </ProtectedRoute>
  );
}
