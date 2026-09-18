import Link from 'next/link';
import Layout from '../components/Layout';

export default function NotFound() {
  return (
    <Layout>
      <section className="section text-center">
        <p className="text-7xl font-extrabold text-brand-600">404</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Page not found</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">The page you're looking for doesn't exist.</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">Back to Home</Link>
      </section>
    </Layout>
  );
}
