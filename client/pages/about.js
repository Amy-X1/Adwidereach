import Head from 'next/head';
import { FiTarget, FiHeart, FiAward } from 'react-icons/fi';
import Layout from '../components/Layout';

const values = [
  { icon: FiTarget, title: 'Our Mission', desc: 'To give growing businesses simple, secure tools that used to be reserved for big enterprises.' },
  { icon: FiHeart, title: 'Our Values', desc: 'Transparency, reliability, and genuine care for every customer who trusts us with their data.' },
  { icon: FiAward, title: 'Our Promise', desc: 'Your information is encrypted, backed up, and never sold. Security is a feature, not an afterthought.' },
];

export default function About() {
  return (
    <Layout>
      <Head><title>About Us — AdWideReach</title></Head>
      <section className="section">
        <div className="max-w-3xl">
          <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">About Us</span>
          <h1 className="mt-4 text-4xl font-extrabold text-gray-900 dark:text-white">Building the backbone for modern businesses</h1>
          <p className="mt-5 text-gray-600 dark:text-gray-300 leading-relaxed">
            AdWideReach started with a simple idea: business owners shouldn't need a team of engineers to get a secure,
            professional online presence with real account management. Today we help businesses of every size register,
            manage their customers, and grow — all from one dependable platform.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="card p-7">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600/10 text-brand-600">
                <v.icon size={20} />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">{v.title}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4 text-center">
          {[['5,000+', 'Businesses served'], ['99.9%', 'Uptime'], ['24/7', 'Support'], ['40+', 'Countries']].map(([n, l]) => (
            <div key={l} className="card p-6">
              <p className="text-3xl font-extrabold text-brand-600">{n}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{l}</p>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
