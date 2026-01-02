import AnonymousWall from '@/components/AnonymousWall';
import { AppLayout } from '@/components/layout/AppLayout';

export default function Anonymous() {
  return (
    <AppLayout>
      <div className="pb-20">
        <AnonymousWall />
      </div>
    </AppLayout>
  );
}
