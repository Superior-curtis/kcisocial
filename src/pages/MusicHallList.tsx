import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Music, Users, Lock, Globe, Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

interface MusicRoom {
  id: string;
  name: string;
  type: 'public' | 'private';
  creator: string;
  creatorName: string;
  members: string[];
  currentTrack?: {
    name: string;
    artist: string;
  };
  listeners: number;
  createdAt: number;
}

export default function MusicHallList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState<'public' | 'private'>('public');
  const [creating, setCreating] = useState(false);
  const [rooms, setRooms] = useState<MusicRoom[]>([
    {
      id: 'global-public',
      name: 'Global Music Hall',
      type: 'public',
      creator: 'system',
      creatorName: 'System',
      members: [],
      listeners: 42,
      createdAt: Date.now()
    }
  ]);

  const handleCreateRoom = async () => {
    if (!user) {
      toast({ title: 'Please sign in', variant: 'destructive' });
      return;
    }
    if (!roomName.trim()) {
      toast({ title: 'Please enter a room name', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const roomDoc = await addDoc(collection(firestore, 'music_rooms'), {
        name: roomName.trim(),
        type: roomType,
        creator: user.id,
        creatorName: user.displayName || user.username || 'User',
        members: [user.id],
        controllers: [user.id], // Users who can control playback
        queue: [],
        currentTrack: null,
        isPlaying: false,
        createdAt: Date.now()
      });

      toast({ title: 'Room created successfully!' });
      navigate(`/music-hall/${roomDoc.id}`);
    } catch (error) {
      console.error('Failed to create room:', error);
      toast({ title: 'Failed to create room', variant: 'destructive' });
    } finally {
      setCreating(false);
      setShowCreateDialog(false);
      setRoomName('');
    }
  };

  return (
    <AppLayout title="Music Hall" showCreate={false}>
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/club')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                🎵 Music Hall
              </h1>
              <p className="text-sm text-muted-foreground">Listen together, share your vibe</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Private Room
          </Button>
        </div>

        {/* Public Rooms */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Public Rooms</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms
              .filter((room) => room.type === 'public')
              .map((room) => (
                <Card
                  key={room.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/music-hall/${room.id}`)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Music className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1">{room.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{room.listeners} listening</span>
                        </div>
                      </div>
                      {room.currentTrack && (
                        <div className="text-xs text-muted-foreground truncate">
                          🎵 {room.currentTrack.name} - {room.currentTrack.artist}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </div>

        {/* Private Rooms */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Your Private Rooms</h2>
          </div>
          {rooms.filter((room) => room.type === 'private' && room.members.includes(user?.id || '')).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms
                .filter((room) => room.type === 'private' && room.members.includes(user?.id || ''))
                .map((room) => (
                  <Card
                    key={room.id}
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/music-hall/${room.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                        <Lock className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1">{room.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{room.members.length} members</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created by {room.creatorName}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="mb-4">You don't have any private rooms yet</p>
              <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                Create Your First Room
              </Button>
            </Card>
          )}
        </div>

        {/* Create Room Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Private Music Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  placeholder="My Chill Room"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Room Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Card
                    className={`p-4 cursor-pointer transition-colors ${
                      roomType === 'public' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                    }`}
                    onClick={() => setRoomType('public')}
                  >
                    <Globe className="w-5 h-5 mb-2" />
                    <div className="font-semibold">Public</div>
                    <div className="text-xs text-muted-foreground">Anyone can join</div>
                  </Card>
                  <Card
                    className={`p-4 cursor-pointer transition-colors ${
                      roomType === 'private' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                    }`}
                    onClick={() => setRoomType('private')}
                  >
                    <Lock className="w-5 h-5 mb-2" />
                    <div className="font-semibold">Private</div>
                    <div className="text-xs text-muted-foreground">Invite only</div>
                  </Card>
                </div>
              </div>
              <div className="pt-2">
                <Button
                  onClick={handleCreateRoom}
                  disabled={creating || !roomName.trim()}
                  className="w-full"
                >
                  {creating ? 'Creating...' : 'Create Room'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
