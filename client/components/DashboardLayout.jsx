import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiMenu, FiBell } from 'react-icons/fi';
import Layout from './Layout';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth() || {};
  const router = useRouter();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setSidebarOpen(false); }, [router.pathname]);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    api.get('/notifications').then(({ data }) => {
      const list = data.data.notifications || [];
      setUnreadCount(list.filter((n) => !n.isRead).length);
    }).catch(() => {});
  }, [user, router.pathname]);

  return (
    <Layout>
      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="min-w-0 flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen lg:ml-64">
          {/* Mobile / tablet top bar with the sidebar toggle */}
          <div className="sticky top-14 z-20 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90 min-[400px]:top-16 lg:hidden">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSidebarOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label="Open menu"
              >
                <FiMenu size={20} />
              </button>
              <Link href="/notifications" aria-label="Open notifications" className="relative grid h-9 w-9 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                <FiBell size={18} />
                {unreadCount > 0 && <span className="absolute right-0.5 top-0.5 min-w-[1.1rem] rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold leading-4 text-white">{unreadCount}</span>}
              </Link>
              <span className="ml-1 text-sm font-semibold text-gray-700 dark:text-gray-200">Menu</span>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </Layout>
  );
}
