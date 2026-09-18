import ProtectedRoute from '../../components/ProtectedRoute';
import DashboardLayout from '../../components/DashboardLayout';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const quickAmounts = [1000, 3000, 5000, 10000, 20000, 50000];

function Wallet() {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [paySettings, setPaySettings] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const loadTransactions = async () => {
    const res = await api.get('/transactions');
    setTransactions((res.data.data.transactions || []).filter((transaction) => transaction.type === 'WALLET_TOPUP').slice(0, 5));
  };

  useEffect(() => {
    loadTransactions().catch(() => {});
    api.get('/settings/payment').then((res) => setPaySettings(res.data.data.settings || {})).catch(() => setPaySettings({}));
  }, []);

  const transfer = () => {
    if (!Number(amount) || Number(amount) <= 0) { toast.error('Enter an amount first'); return; }
    setShowDetails(true);
  };

  const copy = (text) => { navigator.clipboard?.writeText(text).then(() => toast.success('Copied')).catch(() => {}); };

  return (
    <DashboardLayout>
      <Head><title>Add Funds — Dashboard</title></Head>
      <section className="section">
        <h1 className="text-2xl font-bold">Add Funds</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Fund your wallet via bank transfer.</p>
        <div className="card p-5 mt-6 max-w-md">
          <p className="text-sm text-gray-500">Current Balance</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">₦{Number(user?.walletBalance || 0).toFixed(2)}</p>
          <div className="mt-4">
            <label className="block text-sm text-gray-600">Amount</label>
            <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field mt-1" placeholder="Enter amount" />
            <div className="mt-3 flex flex-wrap gap-2">
              {quickAmounts.map((quickAmount) => <button key={quickAmount} type="button" onClick={() => setAmount(String(quickAmount))} className="btn-secondary !px-3 !py-1.5 text-xs">₦{quickAmount.toLocaleString()}</button>)}
            </div>
          </div>
          <div className="mt-4">
            <button className="btn-primary" onClick={transfer} disabled={!amount}>Transfer</button>
          </div>
          {showDetails && (
            <div className="mt-5 rounded-lg border border-brand-200 bg-brand-50 dark:bg-brand-950/40 dark:border-brand-900 p-4">
              <p className="font-semibold text-gray-900 dark:text-white">Transfer ₦{Number(amount || 0).toLocaleString()} to:</p>
              {paySettings && paySettings.ACCOUNT_NUMBER ? (
                <div className="mt-3 space-y-2 text-sm">
                  <p><span className="text-gray-500 dark:text-gray-400">Bank:</span> <strong className="text-gray-900 dark:text-white">{paySettings.BANK_NAME || '—'}</strong></p>
                  <p className="flex items-center gap-2"><span className="text-gray-500 dark:text-gray-400">Account Number:</span> <strong className="text-gray-900 dark:text-white">{paySettings.ACCOUNT_NUMBER}</strong><button type="button" onClick={() => copy(paySettings.ACCOUNT_NUMBER)} className="btn-secondary !px-2 !py-0.5 text-xs">Copy</button></p>
                  <p><span className="text-gray-500 dark:text-gray-400">Account Name:</span> <strong className="text-gray-900 dark:text-white">{paySettings.ACCOUNT_NAME || '—'}</strong></p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">Transfer details haven't been set up yet. Please contact support.</p>
              )}
            
            </div>
          )}
        </div>
        <div className="mt-8 max-w-2xl">
          <div className="flex items-center justify-between mb-3"><h2 className="text-lg font-semibold">Recent Funding Transactions</h2><Link href="/dashboard/transactions" className="text-sm text-brand-600">View all</Link></div>
          <div className="card p-4">
            {transactions.length === 0 ? <p className="text-sm text-gray-500">No funding transactions yet.</p> : transactions.map((transaction) => { const paymentStatus = transaction.payment?.status || 'PENDING'; return <div key={transaction.id} className="flex flex-wrap justify-between gap-2 border-b py-3 last:border-0"><div><p className="font-medium">{transaction.reference || 'Funding'}</p><p className="text-xs text-gray-500">{new Date(transaction.createdAt).toLocaleString()}</p></div><div className="text-right"><p>₦{Number(transaction.amount).toFixed(2)}</p><p className={`text-xs ${paymentStatus === 'SUCCESS' ? 'text-emerald-600' : paymentStatus === 'FAILED' ? 'text-red-600' : 'text-amber-600'}`}>{paymentStatus}</p></div></div>; })}
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <Wallet />
    </ProtectedRoute>
  );
}
