import React, { useEffect, useState, useRef } from 'react';
import { Music, Play, Pause, SkipForward, Plus, Trash2, Users, Search, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { syncMusicService, MusicRoomState, MusicTrack } from '@/services/syncMusicService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import musicService from '@/services/kkboxService';

interface MusicRoomProps {
  clubId: string;
  clubName: string;
}

const MusicRoom: React.FC<MusicRoomProps> = ({ clubId, clubName }) => {
  const { user } = useAuth();
  const [roomState, setRoomState] = useState<MusicRoomState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lyrics, setLyrics] = useState<string[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!user) return;

    // Join room
    syncMusicService.joinRoom(clubId, user.id, (state) => {
      setRoomState(state);
      
      // Fetch lyrics for current track
      if (state.currentTrack && state.currentTrack.name && state.currentTrack.artist) {
        syncMusicService.fetchLyrics(state.currentTrack.name, state.currentTrack.artist)
          .then(setLyrics)
          .catch(() => setLyrics([]));
      }
    });

    return () => {
      if (user) {
        syncMusicService.leaveRoom(user.id);
      }
    };
  }, [clubId, user]);

  // Sync audio playback
  useEffect(() => {
    if (!roomState || !roomState.currentTrack || !audioRef.current) return;

    const audio = audioRef.current;
    const syncedPosition = syncMusicService.getSyncedPosition(roomState);
    
    // Set playback position
    if (Math.abs(audio.currentTime * 1000 - syncedPosition) > 1000) {
      audio.currentTime = syncedPosition / 1000;
    }

    // Play/pause
    if (roomState.isPlaying && audio.paused) {
      audio.play().catch(err => console.error('Play failed:', err));
    } else if (!roomState.isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [roomState]);

  // Update lyrics highlight based on time
  useEffect(() => {
    if (!roomState || !roomState.currentTrack || lyrics.length === 0) return;

    const interval = setInterval(() => {
      if (audioRef.current && roomState.isPlaying) {
        const currentTime = audioRef.current.currentTime;
        // Simple time-based lyric scrolling (could be improved with synced timestamps)
        const index = Math.floor((currentTime / (roomState.currentTrack?.duration || 30)) * lyrics.length);
        setCurrentLyricIndex(Math.min(index, lyrics.length - 1));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [roomState, lyrics]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await musicService.searchTracks(searchQuery);
      setSearchResults(results);
    } catch (error) {
      toast({ title: 'Search failed', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToQueue = async (track: any) => {
    if (!user) return;

    const musicTrack: MusicTrack = {
      id: track.id,
      name: track.name,
      artist: track.artist,
      album: track.album,
      image: track.image,
      duration: track.duration,
      previewUrl: track.previewUrl,
      spotifyUrl: track.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(track.name + ' ' + (track.artist || ''))}`,
      kkboxUrl: `https://www.kkbox.com/search?q=${encodeURIComponent(track.name + ' ' + (track.artist || ''))}`,
      addedBy: user.id,
      addedAt: Date.now()
    };

    await syncMusicService.addToQueue(musicTrack, user.id);
    toast({ title: `Added "${track.name}" to queue` });
  };

  const handlePlayPause = async () => {
    await syncMusicService.togglePlayPause();
  };

  const handleSkip = async () => {
    await syncMusicService.skipTrack();
  };

  const handleRemoveFromQueue = async (trackId: string) => {
    await syncMusicService.removeFromQueue(trackId);
  };

  if (!roomState) {
    return <div className="text-center py-12">Loading music room...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      {/* Left: Now Playing + Lyrics */}
      <div className="lg:col-span-2 space-y-4">
        {/* Now Playing */}
        <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              Now Playing
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roomState.currentTrack ? (
              <div className="space-y-4">
                <div className="flex gap-4">
                  {roomState.currentTrack.image && (
                    <img
                      src={roomState.currentTrack.image}
                      alt={roomState.currentTrack.name}
                      className="w-32 h-32 rounded-lg shadow-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">{roomState.currentTrack.name}</h3>
                    <p className="text-lg text-muted-foreground mb-2">{roomState.currentTrack.artist}</p>
                    {roomState.currentTrack.album && (
                      <p className="text-sm text-muted-foreground mb-3">{roomState.currentTrack.album}</p>
                    )}
                    <div className="flex gap-2">
                      <a
                        href={roomState.currentTrack.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-full text-xs font-medium"
                      >
                        Spotify <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={roomState.currentTrack.kkboxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-xs font-medium"
                      >
                        KKBOX <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Audio Element (hidden, for preview playback) */}
                {roomState.currentTrack.previewUrl && (
                  <audio
                    ref={audioRef}
                    src={roomState.currentTrack.previewUrl}
                    onEnded={handleSkip}
                  />
                )}

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="rounded-full w-16 h-16"
                    onClick={handlePlayPause}
                  >
                    {roomState.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full"
                    onClick={handleSkip}
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                </div>

                {/* Listeners */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{roomState.listeners.length} listening</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Music className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>No track playing</p>
                <p className="text-sm mt-2">Add songs from the search panel →</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lyrics */}
        {lyrics.length > 0 && (
          <Card className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-indigo-500/30">
            <CardHeader>
              <CardTitle>🎤 Lyrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {lyrics.map((line, index) => (
                  <p
                    key={index}
                    className={`text-center transition-all duration-300 ${
                      index === currentLyricIndex
                        ? 'text-2xl font-bold text-primary scale-110'
                        : index === currentLyricIndex - 1 || index === currentLyricIndex + 1
                        ? 'text-lg text-foreground'
                        : 'text-sm text-muted-foreground'
                    }`}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right: Search + Queue */}
      <div className="space-y-4">
        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Add Songs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Search songs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" disabled={isSearching}>
                {isSearching ? 'Searching...' : <Search className="w-4 h-4" />}
              </Button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((track) => (
                  <div key={track.id} className="flex items-center gap-2 p-2 rounded bg-accent">
                    {track.image && (
                      <img src={track.image} alt={track.name} className="w-10 h-10 rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{track.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    <Button size="sm" onClick={() => handleAddToQueue(track)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Queue */}
        <Card>
          <CardHeader>
            <CardTitle>Queue ({roomState.queue.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {roomState.queue.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {roomState.queue.map((track, index) => (
                  <div key={track.id} className="flex items-center gap-2 p-2 rounded bg-accent">
                    <span className="text-xs font-bold w-6">{index + 1}</span>
                    {track.image && (
                      <img src={track.image} alt={track.name} className="w-10 h-10 rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{track.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFromQueue(track.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Queue is empty</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MusicRoom;
