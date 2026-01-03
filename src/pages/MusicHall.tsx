import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import MusicRoom from '@/components/MusicRoom';

export default function MusicHall() {
  const { clubId, roomId } = useParams<{ clubId?: string; roomId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [roomType, setRoomType] = useState<'public' | 'private'>('public');

  // Determine if this is a club music room or a standalone music hall room
  const isClubRoom = !!clubId;
  const effectiveRoomId = roomId || clubId || '';

  useEffect(() => {
    if (!effectiveRoomId) return;

    const fetchRoomInfo = async () => {
      try {
        if (isClubRoom) {
          // Fetch club information
          const clubDoc = await getDoc(doc(firestore, 'clubs', clubId!));
          if (clubDoc.exists()) {
            setDisplayName(clubDoc.data().name || 'Club');
          }
        } else {
          // Fetch music room information
          const roomDoc = await getDoc(doc(firestore, 'music_rooms', roomId!));
          if (roomDoc.exists()) {
            const roomData = roomDoc.data();
            setDisplayName(roomData.name || 'Music Room');
            setRoomType(roomData.type || 'public');
          }
        }
      } catch (error) {
        console.error('Error fetching room info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomInfo();
  }, [effectiveRoomId, isClubRoom, clubId, roomId]);

  if (loading) {
    return (
      <AppLayout title="Music Hall" showCreate={false}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  const handleBack = () => {
    if (isClubRoom) {
      navigate(`/clubs/${clubId}`);
    } else {
      navigate('/music-hall');
    }
  };

  return (
    <AppLayout title={`${displayName} - Music Hall`} showCreate={false}>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="border-b p-4 flex items-center gap-3 bg-background sticky top-0 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="hover:opacity-70"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">🎵 Music Hall</h1>
            <p className="text-sm text-muted-foreground">{displayName}</p>
            {roomType === 'private' && (
              <span className="text-xs text-purple-500">🔒 Private</span>
            )}
          </div>
        </div>

        {/* Music Room Component */}
        <div className="flex-1 overflow-auto">
          <MusicRoom 
            clubId={effectiveRoomId} 
            clubName={displayName}
            isPrivate={roomType === 'private'}
          />
        </div>
      </div>
    </AppLayout>
  );
}
