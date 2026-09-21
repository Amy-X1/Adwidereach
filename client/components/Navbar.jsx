import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiMenu, FiX, FiSun, FiMoon, FiUser, FiGrid, FiBell } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/services', label: 'Services' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme() || {};
  const router = useRouter();

  useEffect(() => { setOpen(false); }, [router.pathname]);

  useEffect(() => {
    const closeOnDesktop = () => { if (window.innerWidth >= 840) { setOpen(false); setNotificationsOpen(false); } };
    window.addEventListener('resize', closeOnDesktop);
    return () => window.removeEventListener('resize', closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get('/notifications').then(({ data }) => setNotifications(data.data.notifications || [])).catch(() => {});
  }, [user]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const markNotificationRead = async (notification) => {
    if (!notification.isRead) {
      await api.patch(`/notifications/${notification.id}/read`).catch(() => {});
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
    }
    if (notification.ticketId) router.push('/dashboard/support');
    else if (notification.orderId) router.push(`/dashboard/orders/${notification.orderId}`);
    setNotificationsOpen(false);
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setNotifications((items) => items.map((notification) => ({ ...notification, isRead: true })));
  };

  return (
    <header className="sticky top-0 z-50 w-full max-w-full overflow-x-clip border-b border-gray-200/70 dark:border-gray-800/70 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-14 w-full max-w-screen-2xl items-center justify-between gap-2 px-3 min-[400px]:h-16 min-[400px]:gap-3 min-[400px]:px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-1.5 font-extrabold tracking-tight text-gray-900 dark:text-white text-base min-[400px]:gap-2 min-[400px]:text-lg sm:text-xl">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm text-white shadow-lg shadow-brand-600/30 min-[400px]:h-9 min-[400px]:w-9 min-[400px]:text-base">A</span>
          <span className="truncate whitespace-nowrap">AdWide<span className="text-brand-600">Reach</span></span>
        </Link>

        <div className="hidden nav:flex min-w-0 items-center gap-4 lg:gap-6 xl:gap-10">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap text-sm font-medium transition-colors hover:text-brand-600 ${
                router.pathname === l.href ? 'text-brand-600' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden nav:flex shrink-0 items-center gap-2 lg:gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {mounted && (theme === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />)}
          </button>

          {!loading && (user ? (
            <div className="flex items-center gap-1.5 lg:gap-3"> 
              <div className="relative">
                <button onClick={() => setNotificationsOpen((isOpen) => !isOpen)} aria-label="Open notifications" className="relative grid h-9 w-9 place-items-center rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <FiBell size={16} />
                  {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-[1rem] rounded-full bg-red-500 px-1 text-center text-[10px] leading-4 text-white">{unreadCount}</span>}
                </button>
                {notificationsOpen && <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[20rem] rounded-lg border border-gray-100 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-gray-950 z-50">
                  <div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>{unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-brand-600">Mark all as read</button>}</div>
                  <div className="mt-2 max-h-72 overflow-y-auto">{notifications.length === 0 ? <p className="py-5 text-sm text-gray-500">No notifications yet.</p> : notifications.slice(0, 8).map((notification) => <button key={notification.id} onClick={() => markNotificationRead(notification)} className={`block w-full border-b px-2 py-3 text-left text-sm last:border-0 ${notification.isRead ? 'text-gray-500' : 'bg-brand-50 text-gray-900 dark:bg-gray-900 dark:text-white'}`}><span className="font-medium">{notification.title}</span><span className="mt-1 block">{notification.message}</span></button>)}</div>
                  <Link href="/notifications" onClick={() => setNotificationsOpen(false)} className="mt-2 block text-center text-xs font-medium text-brand-600">View all notifications</Link>
                </div>}
              </div>
              <Link href={user.role === 'ADMIN' ? '/admin' : '/dashboard'} className="btn-secondary !px-3 !py-2 text-sm lg:!px-4 whitespace-nowrap">
                <FiGrid size={15} /> Dashboard
              </Link>

              <Link href="/profile" aria-label="Open profile" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gray-200 dark:border-gray-800 overflow-hidden">
                {user?.avatarUrl ? <img src={user.avatarUrl} alt="avatar" className="h-9 w-9 object-cover" /> : <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{getInitials(user)}</span>}
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="btn-secondary !px-3 !py-2 text-sm lg:!px-4 whitespace-nowrap">Login</Link>
              <Link href="/register" className="btn-primary !px-3 !py-2 text-sm lg:!px-4 whitespace-nowrap">
                <FiUser size={15} /> Register
              </Link>
            </div>
          ))}
        </div>

        <button className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 nav:hidden dark:text-gray-200 dark:hover:bg-gray-800" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-gray-200 bg-white px-4 pb-4 pt-2 animate-fade-in nav:hidden dark:border-gray-800 dark:bg-gray-950">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                {l.label}
              </Link>
            ))}
            <button onClick={toggleTheme} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
              {mounted && (theme === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />)} Toggle theme
            </button>
            {!loading && user && (
              <Link href="/notifications" onClick={() => setOpen(false)} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                <span>Notifications</span>
                {unreadCount > 0 && <span className="min-w-[1.25rem] rounded-full bg-red-500 px-1.5 text-center text-[11px] font-semibold leading-5 text-white">{unreadCount}</span>}
              </Link>
            )}
            <div className="mt-2 flex flex-col gap-2 border-t min-[420px]:flex-row  border-gray-200 dark:border-gray-800 pt-3">
              {user ? (
                <>
                  <Link href={user.role === 'ADMIN' ? '/admin' : '/dashboard'} className="btn-secondary flex-1 text-sm">Dashboard</Link>
                  <Link href="/profile" className="btn-secondary flex-1 text-sm">Profile</Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-secondary flex-1 text-sm">Login</Link>
                  <Link href="/register" className="btn-primary flex-1 text-sm">Register</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function getInitials(user) {
  return user?.fullName
    ? user.fullName.split(' ').map((name) => name[0]).slice(0, 2).join('')
    : user?.username?.slice(0, 2).toUpperCase();
}
