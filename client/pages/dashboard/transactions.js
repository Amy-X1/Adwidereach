import ProtectedRoute from '../../components/ProtectedRoute';
import DashboardLayout from '../../components/DashboardLayout';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import api from '../../lib/api';

const LABELS = {
  ORDER_PAYMENT_COMPLETED: { text: 'Payment Completed', color: 'text-emerald-600 dark:text-emerald-400' },
  ORDER_PAYMENT_FAILED: { text: 'Payment Failed', color: 'text-red-600 dark:text-red-400' },
  ORDER_REFUND: { text: 'Refund', color: 'text-amber-600 dark:text-amber-400' },
  AFFILIATE_COMMISSION_AVAILABLE: { text: 'Affiliate Commission', color: 'text-emerald-600 dark:text-emerald-400' },
  AFFILIATE_WITHDRAWAL_REQUEST: { text: 'Withdrawal Request', color: 'text-blue-600 dark:text-blue-400' },
  AFFILIATE_WITHDRAWAL_APPROVED: { text: 'Withdrawal Approved', color: 'text-emerald-600 dark:text-emerald-400' },
  AFFILIATE_WITHDRAWAL_PAID: { text: 'Withdrawal Paid', color: 'text-emerald-600 dark:text-emerald-400' },
  AFFILIATE_WITHDRAWAL_REJECTED: { text: 'Withdrawal Rejected', color: 'text-red-600 dark:text-red-400' },
  AFFILIATE_WITHDRAWAL_CANCELLED: { text: 'Withdrawal Cancelled', color: 'text-amber-600 dark:text-amber-400' },
  AFFILIATE_COMMISSION_REVERSAL: { text: 'Commission Reversal', color: 'text-red-600 dark:text-red-400' },
  WALLET_TOPUP: { text: 'Wallet Funding', color: 'text-emerald-600 dark:text-emerald-400' },
};

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get('/transactions').then((res) => setTransactions(res.data.data.transactions)).catch((err) => setError(err.response?.data?.message || err.message)).finally(() => setLoading(false));
  }, []);
  return (
    <DashboardLayout>
      <Head><title>Transactions — Dashboard</title></Head>
      <section className="section">
        <h1 className="text-2xl font-bold mb-4">Transactions</h1>
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!loading && !error && (
          <div className="card p-3 sm:p-5">
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-500">No transactions yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {transactions.map((t) => {
                  const label = LABELS[t.type] || { text: t.type, color: 'text-gray-900 dark:text-gray-100' };
                  return (
                    <li key={t.id} className="flex flex-col gap-1.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="min-w-0">
                        <div className={`text-sm font-medium ${label.color}`}>{label.text}</div>
                        <div className="mt-0.5 break-all text-xs text-gray-500 dark:text-gray-400">{t.reference || '—'}</div>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 sm:block sm:shrink-0 sm:text-right">
                        <div className={`text-sm font-semibold tabular-nums ${t.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {t.amount >= 0 ? '+' : ''}{t.currency} {Number(t.amount).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-gray-400 dark:text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <Transactions />
    </ProtectedRoute>
  );
}
