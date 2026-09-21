import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiGift, FiList, FiCreditCard, FiPlusCircle, FiLifeBuoy, FiUsers, FiSettings, FiLogOut, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const items = [
  { href: '/dashboard/orders', label: 'Orders', icon: FiList, adminHref: '/admin/orders' },
  { href: '/dashboard/services', label: 'Services / Plans', icon: FiGift, adminHref: '/admin/services' },
  { href: '/dashboard/transactions', label: 'Transactions', icon: FiCreditCard, adminHref: '/admin/transactions' },
  { href: '/dashboard/wallet', label: 'Payment', icon: FiPlusCircle },
  { href: '/dashboard/support', label: 'Support', icon: FiLifeBuoy },
  { href: '/dashboard/affiliates', label: 'Affiliates', icon: FiUsers, adminHref: '/admin/affiliates' },
];

export default function Sidebar({ open = false, onClose = () => {} }) {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Route-aware Services item: admins get the admin services page,
  // regular users keep the dashboard services page.
  // Admins don't see the shared user Support item; they use Support Center (/admin/support) instead.
  const navItems = items
    .filter((it) => !(user?.role === 'ADMIN' && it.href === '/dashboard/support'))
    .map((it) => (user?.role === 'ADMIN' && it.adminHref ? { ...it, href: it.adminHref } : it));

  const isActive = (href) => router.pathname === href || router.pathname.startsWith(href + '/');
  const linkClass = (active) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap ${active ? 'bg-brand-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`;

  return (
    <>
      {/* Backdrop shown only when the drawer is open on small/medium screens */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 max-w-[85vw] overflow-y-auto border-r border-gray-200 bg-white shadow-xl shadow-black/10 transition-transform duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-950 dark:shadow-black/40 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:max-w-none lg:translate-x-0 lg:shadow-none`}
      >
        <div className="flex items-center justify-between px-4 pt-4 lg:hidden">
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Menu</span>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close menu"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-4">
          <nav className="space-y-1.5">
            {navItems.map((it) => {
              const Icon = it.icon;
              return (
                <Link href={it.href} key={it.href} className={linkClass(isActive(it.href))} onClick={onClose}>
                  <Icon /> {it.label}
                </Link>
              );
            })}

            {user?.role === 'ADMIN' && (
              <Link href="/admin/support" className={linkClass(router.pathname.startsWith('/admin/support'))} onClick={onClose}>
                <FiLifeBuoy /> Support Center
              </Link>
            )}

            {user?.role === 'ADMIN' && (
              <Link href="/admin/settings" className={linkClass(router.pathname.startsWith('/admin/settings'))} onClick={onClose}>
                <FiSettings /> Settings
              </Link>
            )}

            <button
              onClick={() => { onClose(); logout(); }}
              className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <FiLogOut /> Logout
            </button>
          </nav>
        </div>
      </aside>
    </>
  );
}
