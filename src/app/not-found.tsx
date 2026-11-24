import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
      <h1 className="text-4xl font-extrabold text-slate-900 mb-2">404</h1>
      <p className="text-sm text-slate-600 mb-6">पेज नहीं मिला (Page Not Found)</p>
      <Link
        href="/"
        className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs shadow hover:bg-indigo-500 transition"
      >
        मुख्य डैशबोर्ड पर जाएं (Go to Dashboard)
      </Link>
    </div>
  );
}
