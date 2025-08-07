import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 opacity-70">Sorry, we couldn’t find the page you’re looking for.</p>
        <Link href="/" className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500">Go home</Link>
      </div>
    </div>
  );
}


