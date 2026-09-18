import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiMenu } from 'react-icons/fi';
import Layout from './Layout';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setSidebarOpen(false); }, [router.pathname]);

  return (
    <Layout>
      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="min-w-0 flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen lg:ml-64">
          {/* Mobile / tablet top bar with the sidebar toggle */}
          <div className="sticky top-16 z-20 flex items-center gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Open menu"
            >
              <FiMenu size={20} />
            </button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Menu</span>
          </div>
          <div className="p-4 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </Layout>
  );
}
