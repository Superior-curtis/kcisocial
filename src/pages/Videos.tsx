import VideoHub from '@/components/VideoHub';
import { AppLayout } from '@/components/layout/AppLayout';

export default function Videos() {
  return (
    <AppLayout>
      <div className="pb-20">
        <VideoHub />
      </div>
    </AppLayout>
  );
}
