import ProtectedRoute from '../../components/ProtectedRoute';
import DashboardLayout from '../../components/DashboardLayout';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import api from '../../lib/api';

const LABELS = {
  ORDER_PAYMENT_COMPLETED: { text: 'Payment Completed', color: 'text-emerald-600 dark:text-emerald-400', status: 'Completed' },
  ORDER_PAYMENT_FAILED: { text: 'Payment Failed', color: 'text-red-600 dark:text-red-400', status: 'Failed' },
  ORDER_REFUND: { text: 'Refund', color: 'text-amber-600 dark:text-amber-400', status: 'Refund' },
  AFFILIATE_COMMISSION_AVAILABLE: { text: 'Affiliate Commission', color: 'text-emerald-600 dark:text-emerald-400', status: 'Completed' },
  AFFILIATE_WITHDRAWAL_REQUEST: { text: 'Withdrawal Request', color: 'text-blue-600 dark:text-blue-400', status: 'Pending' },
  AFFILIATE_WITHDRAWAL_APPROVED: { text: 'Withdrawal Approved', color: 'text-emerald-600 dark:text-emerald-400', status: 'Approved' },
  AFFILIATE_WITHDRAWAL_PAID: { text: 'Withdrawal Paid', color: 'text-purple-600 dark:text-purple-400', status: 'Paid' },
  AFFILIATE_WITHDRAWAL_REJECTED: { text: 'Withdrawal Rejected', color: 'text-red-600 dark:text-red-400', status: 'Rejected' },
  AFFILIATE_WITHDRAWAL_CANCELLED: { text: 'Withdrawal Cancelled', color: 'text-amber-600 dark:text-amber-400', status: 'Cancelled' },
  AFFILIATE_COMMISSION_REVERSAL: { text: 'Commission Reversal', color: 'text-red-600 dark:text-red-400', status: 'Reversed' },
  WALLET_TOPUP: { text: 'Wallet Funding', color: 'text-emerald-600 dark:text-emerald-400', status: 'Completed' },
};

function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get('/transactions?all=1').then((res) => setTransactions(res.data.data.transactions)).catch((err) => setError(err.response?.data?.message || err.message)).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <Head><title>Transactions — Admin</title></Head>
      <section className="section">
        <h1 className="text-2xl font-bold mb-4">All Transactions</h1>
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!loading && !error && (
          <div className="card overflow-hidden p-4 sm:p-6">
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-500">No transactions yet.</p>
            ) : (
              <div className="-mx-4 overflow-x-auto sm:-mx-6">
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:pl-5 last:pr-5 dark:text-gray-400 sm:px-6 sm:first:pl-6 sm:last:pr-6">Date</th>
                      <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:pl-5 last:pr-5 dark:text-gray-400 sm:px-6 sm:first:pl-6 sm:last:pr-6">Type</th>
                      <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:pl-5 last:pr-5 dark:text-gray-400 sm:px-6 sm:first:pl-6 sm:last:pr-6">User</th>
                      <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:pl-5 last:pr-5 dark:text-gray-400 sm:px-6 sm:first:pl-6 sm:last:pr-6">Reference</th>
                      <th className="whitespace-nowrap px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 first:pl-5 last:pr-5 dark:text-gray-400 sm:px-6 sm:first:pl-6 sm:last:pr-6">Amount</th>
                      <th className="whitespace-nowrap px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 first:pl-5 last:pr-5 dark:text-gray-400 sm:px-6 sm:first:pl-6 sm:last:pr-6">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => {
                      const label = LABELS[t.type] || { text: t.type, color: 'text-gray-900 dark:text-gray-100', status: t.status || '—' };
                      return (
                        <tr key={t.id} className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-gray-800/40">
                          <td className="whitespace-nowrap px-5 py-5 align-middle text-xs leading-relaxed text-gray-500 first:pl-5 last:pr-5 dark:text-gray-400 sm:px-6 sm:first:pl-6 sm:last:pr-6">{new Date(t.createdAt).toLocaleString()}</td>
                          <td className={`whitespace-nowrap px-5 py-5 align-middle leading-relaxed first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6 ${label.color}`}>{label.text}</td>
                          <td className="whitespace-nowrap px-5 py-5 align-middle leading-relaxed text-gray-700 first:pl-5 last:pr-5 dark:text-gray-300 sm:px-6 sm:first:pl-6 sm:last:pr-6">{t.user ? (t.user.fullName || t.user.email) : '—'}</td>
                          <td className="whitespace-nowrap px-5 py-5 align-middle font-mono text-xs leading-relaxed text-gray-700 first:pl-5 last:pr-5 dark:text-gray-300 sm:px-6 sm:first:pl-6 sm:last:pr-6">{t.reference || '—'}</td>
                          <td className={`whitespace-nowrap px-5 py-5 text-right align-middle font-semibold leading-relaxed tabular-nums first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6 ${t.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{t.amount >= 0 ? '+' : ''} {t.currency} {Number(t.amount).toFixed(2)}</td>
                          <td className="whitespace-nowrap px-5 py-5 text-center align-middle leading-relaxed first:pl-5 last:pr-5 sm:px-6 sm:first:pl-6 sm:last:pr-6">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${label.status === 'Completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' : label.status === 'Failed' || label.status === 'Rejected' || label.status === 'Reversed' || label.status === 'Cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' : label.status === 'Pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' : label.status === 'Paid' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'}`}>{label.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute adminOnly>
      <AdminTransactions />
    </ProtectedRoute>
  );
}
