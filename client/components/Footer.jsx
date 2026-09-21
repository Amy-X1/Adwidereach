import Link from 'next/link';
import { FiFacebook, FiTwitter, FiLinkedin, FiInstagram, FiGithub } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-x-6 gap-y-8 px-4 py-8 min-[420px]:grid-cols-2 min-[420px]:gap-y-10 sm:px-6 sm:py-12 nav:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] lg:px-8 lg:py-14">
        <div className="min-w-0 min-[420px]:col-span-2 nav:col-span-1">
          <div className="flex min-w-0 items-center gap-2 font-extrabold text-gray-900 dark:text-white text-lg sm:text-xl">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">N</span>
            <span className="truncate whitespace-nowrap">Nimbus<span className="text-brand-600">Works</span></span>
          </div>
          <p className="mt-3 max-w-full text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:mt-4 sm:max-w-xs">
            Helping businesses launch, grow, and scale with modern digital tools and dependable support.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 sm:mt-5 sm:gap-3">
            {[FiFacebook, FiTwitter, FiLinkedin, FiInstagram, FiGithub].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="social link"
                className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-brand-600 hover:border-brand-300 transition-colors"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <h4 className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-white sm:mb-4 sm:text-base sm:normal-case sm:tracking-normal">Company</h4>
          <ul className="space-y-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:space-y-2.5">
            <li><Link href="/about" className="inline-block py-0.5 hover:text-brand-600">About Us</Link></li>
            <li><Link href="/services" className="inline-block py-0.5 hover:text-brand-600">Services</Link></li>
            <li><Link href="/contact" className="inline-block py-0.5 hover:text-brand-600">Contact</Link></li>
          </ul>
        </div>

        <div className="min-w-0">
          <h4 className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-white sm:mb-4 sm:text-base sm:normal-case sm:tracking-normal">Account</h4>
          <ul className="space-y-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:space-y-2.5">
            <li><Link href="/register" className="inline-block py-0.5 hover:text-brand-600">Register</Link></li>
            <li><Link href="/login" className="inline-block py-0.5 hover:text-brand-600">Login</Link></li>
            <li><Link href="/dashboard" className="inline-block py-0.5 hover:text-brand-600">Dashboard</Link></li>
          </ul>
        </div>

        <div className="min-w-0 min-[420px]:col-span-2 nav:col-span-1">
          <h4 className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-white sm:mb-4 sm:text-base sm:normal-case sm:tracking-normal">Contact</h4>
          <ul className="space-y-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:space-y-2.5">
            <li className="break-words">123 Market Street, Port Harcourt, NG</li>
            <li className="whitespace-nowrap">+234 800 000 0000</li>
            <li className="break-all">hello@nimbusworks.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-200 px-4 py-4 text-center text-xs leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:py-6">
        © {new Date().getFullYear()} NimbusWorks. All rights reserved.
      </div>
    </footer>
  );
}
