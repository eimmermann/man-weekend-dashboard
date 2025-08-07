import Countdown from '@/components/Countdown';
import HomeTabs from '@/components/HomeTabs';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div className="flex flex-col md:flex-row gap-6 items-stretch">
          <div className="flex-1"><Countdown /></div>
        </div>
        <HomeTabs />
      </div>
    </div>
  );
}
