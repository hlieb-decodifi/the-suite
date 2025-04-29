import { HomeTemplate } from '@/components/templates/HomeTemplate';

export default function HomePage() {
  return (
    <>
      <HomeTemplate />
      <div className="hidden">
        {`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback`}
      </div>
    </>
  );
}
