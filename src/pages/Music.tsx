import MusicPlayer from '@/components/MusicPlayer';
import { AppLayout } from '@/components/layout/AppLayout';

export default function Music() {
  return (
    <AppLayout>
      <div className="pb-20">
        <MusicPlayer />
      </div>
    </AppLayout>
  );
}
