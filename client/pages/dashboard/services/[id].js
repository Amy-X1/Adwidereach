import ProtectedRoute from '../../../components/ProtectedRoute';
import DashboardLayout from '../../../components/DashboardLayout';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';

function ServiceDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [service, setService] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [requirementsData, setRequirementsData] = useState({});
  const [placed, setPlaced] = useState(null);
  const [paySettings, setPaySettings] = useState(null);

  useEffect(() => {
    api.get('/settings/payment').then((res) => setPaySettings(res.data.data.settings || {})).catch(() => setPaySettings({}));
  }, []);

  const copyText = (text) => { navigator.clipboard?.writeText(text).then(() => toast.success('Copied')).catch(() => {}); };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/services/${id}`).then((res) => {
      setService(res.data.data.service);
      setSelectedPackage(res.data.data.service.packages?.[0] || null);
      // initialize requirements data
      const pkg = res.data.data.service.packages?.[0];
      if (pkg && pkg.requirements) {
        let reqs = [];
        try { reqs = Array.isArray(pkg.requirements) ? pkg.requirements : JSON.parse(pkg.requirements); } catch (e) { reqs = [pkg.requirements]; }
        const map = {};
        reqs.forEach((r) => { map[r] = ''; });
        setRequirementsData(map);
      }
    }).catch((err) => setError(err.response?.data?.message || 'Failed to load service')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <DashboardLayout>
      <Head><title>Service — Dashboard</title></Head>
      <section className="section">Loading…</section>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <Head><title>Service — Dashboard</title></Head>
      <section className="section"><p className="text-red-500">{error}</p></section>
    </DashboardLayout>
  );

  // Base checkout info required for every order, plus the package's own required fields
  const baseRequired = ['Email', 'Social Media Name', 'Social Media URL'];
  const packageRequired = (() => {
    let reqs = [];
    try {
      const r = selectedPackage?.requirements;
      if (r) reqs = Array.isArray(r) ? r : JSON.parse(r);
    } catch (e) { reqs = selectedPackage?.requirements ? [selectedPackage.requirements] : []; }
    if (!Array.isArray(reqs)) reqs = reqs ? [reqs] : [];
    return reqs.filter(Boolean);
  })();
  const requiredFields = [...baseRequired, ...packageRequired.filter((f) => !baseRequired.includes(f))];

  return (
    <DashboardLayout>
      <Head><title>{service.name} — Services</title></Head>
      <section className="section">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            {service.imageUrl && <img src={service.imageUrl} className="h-24 w-24 object-cover rounded" />}
            <h2 className="text-2xl font-bold">{service.platform} — {service.name}</h2>
          </div>
          <p className="mt-2 text-gray-500">{service.description}</p>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Packages</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {service.packages.map((p) => (
                <div key={p.id} className={`p-4 border rounded ${selectedPackage?.id === p.id ? 'border-brand-600 bg-brand-50 text-gray-900 dark:border-brand-400 dark:bg-brand-950/40 dark:text-gray-100' : 'border-gray-200 dark:border-gray-700'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      {p.imageUrl && <img src={p.imageUrl} className="h-12 w-12 object-cover rounded mt-2" />}
                      <div className="text-sm text-gray-500 dark:text-gray-400">{p.details}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">₦{p.price.toFixed(2)}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Est. {p.deliveryDays} days</div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button onClick={() => setSelectedPackage(p)} className="btn-secondary">Select</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <button className="btn-primary" onClick={() => { setShowCheckout(true); setCheckoutError(null); setPlaced(null); }}>Proceed to Checkout</button>
              <p className="text-sm text-gray-500">Price: ₦{selectedPackage ? selectedPackage.price.toFixed(2) : '0.00'}</p>
            </div>
            <div>

      {/* Checkout Modal */}
      {showCheckout && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => { setShowCheckout(false); setPlaced(null); }} />
          <div className="relative z-60 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded bg-white p-6 shadow-lg dark:bg-gray-900">
            {placed ? (
              <>
                <h3 className="text-xl font-semibold">Order placed!</h3>
                <p className="text-sm text-gray-500 mt-1">Reference: {placed.reference}</p>
                <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 dark:bg-brand-950/40 dark:border-brand-900 p-4">
                  <p className="font-semibold text-gray-900 dark:text-white">Transfer ₦{Number(placed.total).toLocaleString()} to:</p>
                  {paySettings && paySettings.ACCOUNT_NUMBER ? (
                    <div className="mt-3 space-y-2 text-sm">
                      <p><span className="text-gray-500 dark:text-gray-400">Bank:</span> <strong className="text-gray-900 dark:text-white">{paySettings.BANK_NAME || '—'}</strong></p>
                      <p className="flex items-center gap-2"><span className="text-gray-500 dark:text-gray-400">Account Number:</span> <strong className="text-gray-900 dark:text-white">{paySettings.ACCOUNT_NUMBER}</strong><button type="button" onClick={() => copyText(paySettings.ACCOUNT_NUMBER)} className="btn-secondary !px-2 !py-0.5 text-xs">Copy</button></p>
                      <p><span className="text-gray-500 dark:text-gray-400">Account Name:</span> <strong className="text-gray-900 dark:text-white">{paySettings.ACCOUNT_NAME || '—'}</strong></p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">Transfer details haven't been set up yet. Please contact support.</p>
                  )}
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Use your order reference ({placed.reference}) as the transfer narration. Your order will be confirmed once payment is verified.</p>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                  <button className="btn-secondary" onClick={() => { setShowCheckout(false); setPlaced(null); }}>Close</button>
                  <button className="btn-primary" onClick={() => router.push('/dashboard/orders')}>View my orders</button>
                </div>
              </>
            ) : (
              <>
            <h3 className="text-xl font-semibold">Checkout — {service.name}</h3>
            <p className="text-sm text-gray-500 mt-1">Package: {selectedPackage.name}</p>
            <div className="mt-4">
              <label className="text-sm text-gray-600">Quantity</label>
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))} className="mt-1 w-24 px-3 py-2 border rounded text-black" />
            </div>
            <div className="mt-4">
              <h4 className="font-semibold">Required info</h4>
              <div className="space-y-2 mt-2">
                {requiredFields.map((r) => (
                  <div key={r}><label className="text-sm text-gray-600">{r}</label><input className="mt-1 w-full px-3 py-2 border rounded text-black" value={requirementsData[r] || ''} onChange={(e) => setRequirementsData((s) => ({ ...s, [r]: e.target.value }))} /></div>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <p className="font-semibold">Total: ₦{ (selectedPackage.price * quantity).toFixed(2) }</p>
            </div>
            {checkoutError && <p className="text-red-500 mt-2">{checkoutError}</p>}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowCheckout(false)} disabled={processing}>Cancel</button>
              <button className="btn-primary" onClick={async () => {
                try {
                  setProcessing(true);
                  setCheckoutError(null);
                  // require all checkout info before placing the order
                  const missing = requiredFields.filter((f) => !String(requirementsData[f] || '').trim());
                  if (missing.length > 0) { setCheckoutError(`Please fill in: ${missing.join(', ')}`); setProcessing(false); return; }
                  // create the order (PENDING until confirmed)
                  const itemPayload = { servicePackageId: selectedPackage.id, quantity, requirements: Object.fromEntries(requiredFields.map((f) => [f, String(requirementsData[f] || '').trim()])) };
                  const res = await api.post('/orders', { items: [itemPayload] });
                  const order = res.data.data.order;
                  setPlaced({ reference: order.reference, total: (selectedPackage.price * quantity).toFixed(2) });
                } catch (err) {
                  setCheckoutError(err.response?.data?.message || err.message || 'Failed to place order');
                } finally {
                  setProcessing(false);
                }
              }} disabled={processing}>
                {processing ? 'Processing…' : 'Place Order'}
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <ServiceDetail />
    </ProtectedRoute>
  );
}
