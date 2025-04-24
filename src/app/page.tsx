import { Footer } from '@/components/common/Footer';
import { Header } from '@/components/common/Header';

export default function HomePage() {
  return (
    <div>
      <Header isAuthenticated={false} />
      <Footer />
    </div>
  );
}
