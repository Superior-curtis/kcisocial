import LiveStreamHub from '@/components/LiveStreamHub';
import { AppLayout } from '@/components/layout/AppLayout';

export default function Live() {
  return (
    <AppLayout>
      <div className="pb-20">
        <LiveStreamHub />
      </div>
    </AppLayout>
  );
}
