import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import DashboardLayout from '../../../../components/DashboardLayout';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Spinner from '../../../../components/Spinner';
import api from '../../../../lib/api';

const money = (n) => `₦${Number(n || 0).toLocaleString()}`;

function WithdrawalDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [withdrawal, setWithdrawal] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/affiliates/withdrawals/${id}`);
      setWithdrawal(data.data.withdrawal);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load withdrawal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const decide = async (status) => {
    let reason;
    if (status === 'REJECTED') {
      reason = window.prompt('Reason for rejection:');
      if (!reason) return;
    }
    try {
      await api.patch(`/admin/affiliates/withdrawals/${id}`, { status, reason });
      toast.success(status === 'APPROVED' ? 'Withdrawal approved' : 'Withdrawal rejected');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  if (loading) return <DashboardLayout><Spinner full /></DashboardLayout>;

  if (!withdrawal) {
    return (
      <DashboardLayout>
        <Head><title>Withdrawal — Admin</title></Head>
        <section className="section">
          <div className="py-12 text-center">
            <p className="text-red-500">Withdrawal not found.</p>
            <div className="mt-4"><Link href="/admin/affiliates" className="btn-secondary">Back to Affiliates</Link></div>
          </div>
        </section>
      </DashboardLayout>
    );
  }

  const user = withdrawal.affiliate?.user || {};
  const details = withdrawal.bankDetails || {};
  const isPending = withdrawal.status === 'PENDING';
  const statusColor = (s) => (s === 'APPROVED' || s === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : s === 'REJECTED' || s === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300');

  return (
    <DashboardLayout>
      <Head><title>Withdrawal #{withdrawal.id} — Admin</title></Head>
      <section className="section">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold sm:text-2xl">Withdrawal Request #{withdrawal.id}</h1>
          <Link href="/admin/affiliates" className="btn-secondary">← Back to Affiliates</Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="card flex min-w-0 flex-col p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Amount</p>
            <p className="mt-2 break-words text-xl font-bold tabular-nums leading-snug text-gray-900 dark:text-white sm:text-2xl">{money(withdrawal.amount)}</p>
          </div>
          <div className="card flex min-w-0 flex-col p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</p>
            <span className={`badge mt-2 self-start ${statusColor(withdrawal.status)}`}>{withdrawal.status}</span>
          </div>
          <div className="card flex min-w-0 flex-col p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Requested</p>
            <p className="mt-2 break-words text-xs font-semibold leading-relaxed text-gray-900 dark:text-white sm:text-sm">{new Date(withdrawal.requestedAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="card min-w-0 p-4 sm:p-6">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white sm:text-base">User Details</h2>
            <dl className="mt-4 space-y-3 text-xs leading-relaxed sm:text-sm">
              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-4"><dt className="whitespace-nowrap text-gray-500 dark:text-gray-400">Name</dt><dd className="min-w-0 break-words text-right font-medium text-gray-900 dark:text-white">{user.fullName || '—'}</dd></div>
              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-4"><dt className="whitespace-nowrap text-gray-500 dark:text-gray-400">Username</dt><dd className="min-w-0 break-words text-right font-medium text-gray-900 dark:text-white">@{user.username || '—'}</dd></div>
              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-4"><dt className="whitespace-nowrap text-gray-500 dark:text-gray-400">Email</dt><dd className="min-w-0 break-all text-right font-medium text-gray-900 dark:text-white">{user.email || '—'}</dd></div>
              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-4"><dt className="whitespace-nowrap text-gray-500 dark:text-gray-400">Phone</dt><dd className="min-w-0 break-words text-right font-medium tabular-nums text-gray-900 dark:text-white">{user.phone || '—'}</dd></div>
              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-4"><dt className="whitespace-nowrap text-gray-500 dark:text-gray-400">Method</dt><dd className="min-w-0 break-words text-right font-medium text-gray-900 dark:text-white">{withdrawal.paymentMethod || 'Bank transfer'}</dd></div>
            </dl>
          </div>

          <div className={`card min-w-0 p-4 sm:p-6 ${details.accountNumber ? 'border-2 border-brand-500' : ''}`}>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white sm:text-base">Bank Details for Payment</h2>
            {details.accountNumber ? (
              <dl className="mt-4 space-y-3 text-xs leading-relaxed sm:text-sm">
                <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-x-4"><dt className="whitespace-nowrap text-gray-500 dark:text-gray-400">Account Name</dt><dd className="min-w-0 break-words text-right font-semibold text-gray-900 dark:text-white">{details.accountName || '—'}</dd></div>
                <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-x-4"><dt className="whitespace-nowrap text-gray-500 dark:text-gray-400">Account Number</dt><dd className="min-w-0 break-all text-right font-semibold tabular-nums text-gray-900 dark:text-white">{details.accountNumber || '—'}</dd></div>
                <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-x-4"><dt className="whitespace-nowrap text-gray-500 dark:text-gray-400">Bank</dt><dd className="min-w-0 break-words text-right font-semibold text-gray-900 dark:text-white">{details.bankName || '—'}</dd></div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No bank details were provided with this request.</p>
            )}
          </div>
        </div>
{isPending && (
          <div className="mt-6 card p-6 border-2 border-brand-500 bg-brand-50 dark:bg-brand-950/30">
            <h2 className="font-bold text-brand-700 dark:text-brand-300">Review Request</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Use the bank details above to send the money, then approve or reject this request. The user will be notified of your decision.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => decide('APPROVED')} className="btn-primary">✓ Approve Request</button>
              <button onClick={() => decide('REJECTED')} className="btn-danger">✗ Reject Request</button>
            </div>
          </div>
        )}

        {withdrawal.status === 'APPROVED' && (
          <div className="mt-6 card p-6 bg-emerald-50 dark:bg-emerald-950/30">
            <h2 className="font-bold text-emerald-700 dark:text-emerald-300">Approved — Send the money</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">This request has been reviewed. Send exactly <strong>{money(withdrawal.amount)}</strong> to the bank account above. The user's bank details will remain saved here.</p>
          </div>
        )}

        {withdrawal.status === 'REJECTED' && withdrawal.reason && (
          <div className="mt-6 card p-6 border-2 border-red-500">
            <h2 className="font-bold text-red-700">Rejected</h2>
            <p className="mt-2 text-sm"><strong>Reason:</strong> {withdrawal.reason}</p>
          </div>
        )}

        {withdrawal.status === 'CANCELLED' && (
          <div className="mt-6 card p-6"><h2 className="font-bold">Cancelled</h2><p className="mt-2 text-sm">This withdrawal was cancelled.</p></div>
        )}
      </section>
    </DashboardLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute adminOnly>
      <WithdrawalDetail />
    </ProtectedRoute>
  );
}