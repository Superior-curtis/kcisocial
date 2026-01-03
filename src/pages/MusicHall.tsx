import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import MusicRoom from '@/components/MusicRoom';

export default function MusicHall() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const [clubName, setClubName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;

    const fetchClub = async () => {
      try {
        const clubDoc = await getDoc(doc(firestore, 'clubs', clubId));
        if (clubDoc.exists()) {
          setClubName(clubDoc.data().name || 'Club');
        }
      } catch (error) {
        console.error('Error fetching club:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClub();
  }, [clubId]);

  if (loading) {
    return (
      <AppLayout title="Music Hall" showCreate={false}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`${clubName} - Music Hall`} showCreate={false}>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="border-b p-4 flex items-center gap-3 bg-background sticky top-0 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/clubs/${clubId}`)}
            className="hover:opacity-70"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">🎵 Music Hall</h1>
            <p className="text-sm text-muted-foreground">{clubName}</p>
          </div>
        </div>

        {/* Music Room Component */}
        <div className="flex-1 overflow-auto">
          <MusicRoom clubId={clubId || ''} clubName={clubName} />
        </div>
      </div>
    </AppLayout>
  );
}
