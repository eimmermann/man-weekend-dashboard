import HomeTabs from '@/components/HomeTabs';
import { Suspense } from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        {/* Countdown moved into Overview tab */}
        <Suspense>
          <HomeTabs />
        </Suspense>
      </div>
    </div>
  );
}
