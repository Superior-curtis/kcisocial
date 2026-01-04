import React, { useEffect, useState, useRef } from 'react';
import { Music, Play, Pause, SkipForward, SkipBack, Plus, Trash2, Users, Search, ExternalLink, Shuffle, Repeat, Repeat1, Volume2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { syncMusicService, MusicRoomState, MusicTrack } from '@/services/syncMusicService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { youtubeService, YouTubeVideo } from '@/services/youtubeService';

interface MusicRoomProps {
  clubId: string;
  clubName: string;
}

const MusicRoom: React.FC<MusicRoomProps> = ({ clubId, clubName }) => {
  const { user } = useAuth();
  const [roomState, setRoomState] = useState<MusicRoomState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [youtubeResults, setYoutubeResults] = useState<YouTubeVideo[]>([]);
  const [searchTab, setSearchTab] = useState<'kkbox' | 'youtube'>('youtube');
  const [isSearching, setIsSearching] = useState(false);
  const [lyrics, setLyrics] = useState<string[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [volume, setVolume] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const youtubePlayerRef = useRef<HTMLIFrameElement>(null);

  const parseDurationToSeconds = (value: string | number | undefined): number | undefined => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return undefined;
    const parts = value.split(':').map((p) => Number(p));
    if (parts.some((p) => Number.isNaN(p))) return undefined;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return undefined;
  };

  useEffect(() => {
    if (!user) return;

    // Load volume from localStorage
    const savedVolume = localStorage.getItem(`music_volume_${clubId}_${user.id}`);
    if (savedVolume) {
      const vol = parseFloat(savedVolume);
      setVolume(vol);
      if (audioRef.current) {
        audioRef.current.volume = vol;
      }
    }

    // Join room with user info
    syncMusicService.joinRoom(
      clubId, 
      user.id, 
      user.displayName || user.username || 'Anonymous',
      user.profileImageUrl || '',
      (state) => {
        console.log('[MusicRoom] Received state update:', { 
          currentTrack: state.currentTrack?.name, 
          listeners: Array.isArray(state.listeners) ? state.listeners.length : 0,
          queue: state.queue?.length || 0
        });
        setRoomState(state);
        
        // Fetch lyrics for current track
        if (state.currentTrack && state.currentTrack.name && state.currentTrack.artist) {
          syncMusicService.fetchLyrics(state.currentTrack.name, state.currentTrack.artist)
            .then(setLyrics)
            .catch(() => setLyrics([]));
        }
      }
    );

    return () => {
      if (user) {
        syncMusicService.leaveRoom(user.id);
      }
    };
  }, [clubId, user]);

  useEffect(() => {
    if (!user) return;
    const handleBeforeUnload = () => {
      syncMusicService.leaveRoom(user.id);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  // Sync audio playback and volume
  useEffect(() => {
    if (!roomState || !roomState.currentTrack || !audioRef.current) return;

    const audio = audioRef.current;
    audio.volume = volume;
    
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
  }, [roomState, volume]);

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
    if (!searchQuery.trim()) {
      console.log('[MusicRoom] Search query is empty');
      return;
    }

    console.log('[MusicRoom] Starting search:', { query: searchQuery, tab: searchTab });
    setIsSearching(true);
    try {
      if (searchTab === 'youtube') {
        console.log('[MusicRoom] Calling youtubeService.searchMusic...');
        const results = await youtubeService.searchMusic(searchQuery);
        console.log('[MusicRoom] YouTube search results received:', results.length, results);
        // Filter out invalid/fallback results when we have real results
        const realResults = results.filter((r: any) => !r.id.startsWith('yt-fallback') || results.length <= 1);
        console.log('[MusicRoom] After filter:', realResults.length);
        setYoutubeResults(realResults.length > 0 ? realResults : results);
        console.log('[MusicRoom] State updated with YouTube results');
      } else {
        console.log('[MusicRoom] Calling musicService.searchTracks...');
        const results = await musicService.searchTracks(searchQuery);
        console.log('[MusicRoom] KKBOX search results received:', results.length, results);
        setSearchResults(results);
        console.log('[MusicRoom] State updated with KKBOX results');
      }
    } catch (error) {
      console.error('[MusicRoom] Search error:', error);
      toast({ title: 'Search failed', variant: 'destructive' });
    } finally {
      setIsSearching(false);
      console.log('[MusicRoom] Search complete');
    }
  };

  const handleAddToQueue = async (track: any) => {
    try {
      console.log('[MusicRoom] Button clicked for track:', { id: track.id, title: track.name || track.title });

      // If this is a fallback YouTube search result (no embedUrl), open YouTube in new tab
      if (track.id && track.id.startsWith('yt-fallback') && track.videoUrl && !track.embedUrl) {
        console.log('[MusicRoom] Fallback result, opening YouTube');
        window.open(track.videoUrl, '_blank');
        toast({ title: '🔍 Opening YouTube search in new tab' });
        return;
      }

      if (!user) {
        console.warn('[MusicRoom] No user logged in');
        toast({ title: 'Please log in first', variant: 'destructive' });
        return;
      }

      console.log('[MusicRoom] Creating music track object...');

      const durationSeconds = parseDurationToSeconds(track.durationSeconds ?? track.duration);
      console.log('[MusicRoom] Parsed duration:', durationSeconds);

      const musicTrack: MusicTrack = {
        id: track.id,
        name: track.name || track.title,
        artist: track.artist,
        album: track.album,
        image: track.image || track.thumbnail,
        duration: durationSeconds,
        previewUrl: track.previewUrl,
        kkboxUrl: track.kkboxUrl || `https://www.kkbox.com/tw/tc/search/${encodeURIComponent(track.name + ' ' + (track.artist || ''))}`,
        youtubeUrl: track.videoUrl,
        youtubeId: track.id,
        youtubeEmbed: track.embedUrl,
        addedBy: user.id,
        addedAt: Date.now()
      };

      console.log('[MusicRoom] Calling syncMusicService.addToQueue...');
      await syncMusicService.addToQueue(musicTrack, user.id);
      console.log('[MusicRoom] Track added successfully');
      toast({ title: `✅ Added "${track.name || track.title}" to queue` });
    } catch (error) {
      console.error('[MusicRoom] Error adding to queue:', error);
      toast({ title: '❌ Failed to add track to queue', variant: 'destructive' });
    }
  };

  const handlePlayPause = async () => {
    if (!user) return;
    // Only creator can play/pause
    if (roomState && !syncMusicService.isCreator(roomState, user.id)) {
      toast({ title: 'Only creator can control playback', variant: 'destructive' });
      return;
    }
    await syncMusicService.togglePlayPause();
  };

  const handleSkip = async () => {
    if (!user) return;
    // Only creator can skip
    if (roomState && !syncMusicService.isCreator(roomState, user.id)) {
      toast({ title: 'Only creator can skip tracks', variant: 'destructive' });
      return;
    }
    await syncMusicService.skipTrack();
  };

  const handlePrevious = async () => {
    if (!user) return;
    // Only creator can go previous
    if (roomState && !syncMusicService.isCreator(roomState, user.id)) {
      toast({ title: 'Only creator can control playback', variant: 'destructive' });
      return;
    }
    await syncMusicService.playPrevious();
  };

  const handleToggleShuffle = async () => {
    if (!user) return;
    // Only creator can toggle shuffle
    if (roomState && !syncMusicService.isCreator(roomState, user.id)) {
      toast({ title: 'Only creator can toggle shuffle', variant: 'destructive' });
      return;
    }
    await syncMusicService.toggleShuffle();
  };

  const handleToggleRepeat = async () => {
    if (!user) return;
    // Only creator can toggle repeat
    if (roomState && !syncMusicService.isCreator(roomState, user.id)) {
      toast({ title: 'Only creator can toggle repeat', variant: 'destructive' });
      return;
    }
    await syncMusicService.toggleRepeatMode();
  };

  const handleStop = async () => {
    if (!user) return;
    // Only creator can stop
    if (roomState && !syncMusicService.isCreator(roomState, user.id)) {
      toast({ title: 'Only creator can stop playback', variant: 'destructive' });
      return;
    }
    await syncMusicService.stopPlayback();
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    // Save to localStorage
    if (user) {
      localStorage.setItem(`music_volume_${clubId}_${user.id}`, vol.toString());
    }
  };

  const handleRemoveFromQueue = async (trackId: string) => {
    await syncMusicService.removeFromQueue(trackId);
  };

  if (!roomState) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-2">🎵 Loading music room...</p>
        <p className="text-xs text-muted-foreground">If this takes too long, try refreshing or disabling browser extensions</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-6 p-8">
      {/* Room Info */}
      <Card className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-500/30">
        <CardContent className="pt-6 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
            <div>
              <span className="text-muted-foreground block text-xs mb-2 font-semibold uppercase tracking-wide">Creator</span>
              <span className="font-medium text-lg">
                {user?.id === roomState?.creatorId ? 'You' : 'Someone else'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs mb-2 font-semibold uppercase tracking-wide">Join Mode</span>
              <span className="font-medium text-lg capitalize">{roomState?.joinMode || 'free'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs mb-2 font-semibold uppercase tracking-wide">Listeners</span>
              <span className="font-medium text-lg">{Array.isArray(roomState?.listeners) ? roomState.listeners.length : 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs mb-2 font-semibold uppercase tracking-wide">Queue</span>
              <span className="font-medium text-lg">{roomState?.queue.length || 0} songs</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Now Playing + Search/Queue side by side */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
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
                {/* YouTube Embedded Player */}
                {roomState.currentTrack.youtubeEmbed ? (
                  <div className="w-full aspect-video rounded-lg overflow-hidden shadow-2xl">
                    <iframe
                      ref={youtubePlayerRef}
                      width="100%"
                      height="100%"
                      src={roomState.currentTrack.youtubeEmbed}
                      title={roomState.currentTrack.name}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                ) : (
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
                        {roomState.currentTrack.youtubeUrl && (
                          <a
                            href={roomState.currentTrack.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-full text-xs font-medium hover:shadow-lg transition"
                          >
                            YouTube <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {roomState.currentTrack.kkboxUrl && (
                          <a
                            href={roomState.currentTrack.kkboxUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-xs font-medium hover:shadow-lg transition"
                          >
                            KKBOX <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Track info for YouTube (shown below player) */}
                {roomState.currentTrack.youtubeEmbed && (
                  <div className="flex gap-4 items-start">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2">{roomState.currentTrack.name}</h3>
                      <p className="text-lg text-muted-foreground mb-2">{roomState.currentTrack.artist}</p>
                      <div className="flex gap-2 flex-wrap">
                        <a
                          href={roomState.currentTrack.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-full text-xs font-medium hover:shadow-lg transition"
                        >
                          🎬 Open in YouTube <ExternalLink className="w-3 h-3" />
                        </a>
                        {roomState.currentTrack.kkboxUrl && (
                          <a
                            href={roomState.currentTrack.kkboxUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-xs font-medium hover:shadow-lg transition"
                          >
                            KKBOX <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Audio Element (hidden, for preview playback) */}
                {roomState.currentTrack.previewUrl && !roomState.currentTrack.youtubeEmbed && (
                  <audio
                    ref={audioRef}
                    src={roomState.currentTrack.previewUrl}
                    onEnded={handleSkip}
                  />
                )}

                {/* Controls */}
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={roomState.shuffleEnabled ? 'default' : 'outline'}
                      className="rounded-full"
                      onClick={handleToggleShuffle}
                      disabled={!user || (roomState && !syncMusicService.isCreator(roomState, user.id))}
                      title="Shuffle"
                    >
                      <Shuffle className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={handlePrevious}
                      disabled={!user || (roomState && !syncMusicService.isCreator(roomState, user.id)) || !roomState.playHistory?.length}
                      title="Previous"
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>

                    <Button
                      size="lg"
                      variant="secondary"
                      className="rounded-full w-16 h-16"
                      onClick={handlePlayPause}
                      disabled={!user || (roomState && !syncMusicService.isCreator(roomState, user.id))}
                    >
                      {roomState.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={handleSkip}
                      disabled={!user || (roomState && !syncMusicService.isCreator(roomState, user.id)) || !roomState.queue.length}
                      title="Skip"
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant={
                        roomState.repeatMode === 'one' ? 'default' : 
                        roomState.repeatMode === 'all' ? 'secondary' : 
                        'outline'
                      }
                      className="rounded-full"
                      onClick={handleToggleRepeat}
                      disabled={!user || (roomState && !syncMusicService.isCreator(roomState, user.id))}
                      title="Repeat"
                    >
                      {roomState.repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-full"
                      onClick={handleStop}
                      disabled={!user || (roomState && !syncMusicService.isCreator(roomState, user.id)) || !roomState.currentTrack}
                      title="Stop"
                    >
                      <Square className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center gap-3 px-2">
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                    <Slider
                      value={[volume]}
                      onValueChange={handleVolumeChange}
                      min={0}
                      max={1}
                      step={0.01}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(volume * 100)}%</span>
                  </div>
                </div>

                {/* Listeners */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="w-4 h-4" />
                    <span>{Array.isArray(roomState.listeners) ? roomState.listeners.length : 0} people listening</span>
                  </div>
                  {Array.isArray(roomState.listeners) && roomState.listeners.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {roomState.listeners.map((listener) => {
                        const listenerInfo = typeof listener === 'string' 
                          ? { userId: listener, userName: 'Anonymous', avatar: '' }
                          : listener;
                        return (
                          <div key={listenerInfo.userId} className="flex items-center gap-2 px-3 py-2 rounded-full bg-accent/70 text-xs hover:bg-accent transition">
                            {listenerInfo.avatar ? (
                              <img 
                                src={listenerInfo.avatar} 
                                alt={listenerInfo.userName}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary/40 flex items-center justify-center text-xs font-bold text-white">
                                {listenerInfo.userName?.[0] || '?'}
                              </div>
                            )}
                            <span className="truncate font-medium">{listenerInfo.userName}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
      <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-hidden">
        {/* Search */}
        <Card className="flex flex-col overflow-hidden" style={{ maxHeight: (searchResults.length > 0 || youtubeResults.length > 0) ? 'calc(100vh - 600px)' : '320px' }}>
          <CardHeader className="flex-shrink-0 pb-4">
            <CardTitle className="text-xl flex items-center gap-3">
              <Search className="w-6 h-6" />
              🎵 Search Music
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Source Tabs */}
            <Tabs value={searchTab} onValueChange={(v) => setSearchTab(v as 'kkbox' | 'youtube')} className="flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="youtube">🎬 YouTube (Full Songs)</TabsTrigger>
                <TabsTrigger value="kkbox">🎵 KKBOX</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSearch} className="flex gap-3 flex-shrink-0">
              <Input
                placeholder={searchTab === 'youtube' ? "Search full songs on YouTube..." : "Search songs on KKBOX..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-base h-12"
              />
              <Button type="submit" disabled={isSearching} size="lg" className="h-12 px-6">
                {isSearching ? 'Searching...' : <Search className="w-5 h-5" />}
              </Button>
            </form>

            {/* YouTube Results */}
            {searchTab === 'youtube' && youtubeResults.length > 0 ? (
              <div className="flex-1 space-y-3 overflow-y-auto border-t pt-4">
                {youtubeResults.map((video) => (
                  <div key={video.id} className="flex items-center gap-4 p-4 rounded-lg bg-red-900/10 border border-red-500/30 hover:bg-red-900/20 transition flex-shrink-0">
                    <img src={video.thumbnail} alt={video.title} className="w-24 h-16 rounded object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold truncate mb-1">🎬 {video.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{video.artist}</p>
                      <p className="text-xs text-green-500 mt-1">✓ Full song • {video.duration}</p>
                    </div>
                    <Button size="lg" onClick={() => handleAddToQueue(video)} className="flex-shrink-0 h-12 px-6 bg-red-600 hover:bg-red-700">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : searchTab === 'youtube' && youtubeResults.length === 0 && searchQuery ? (
              <p className="text-sm text-muted-foreground text-center py-8">🔍 No YouTube results found</p>
            ) : searchTab === 'kkbox' && searchResults.length > 0 ? (
              <div className="flex-1 space-y-3 overflow-y-auto border-t pt-4">
                {searchResults.map((track) => (
                  <div key={track.id} className="flex items-center gap-4 p-4 rounded-lg bg-accent/60 hover:bg-accent transition flex-shrink-0">
                    {track.image && (
                      <img src={track.image} alt={track.name} className="w-20 h-20 rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold truncate mb-1">{track.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                      {track.previewUrl && (
                        <p className="text-xs text-orange-500 mt-1">⚠️ 30-second preview only</p>
                      )}
                    </div>
                    <Button size="lg" onClick={() => handleAddToQueue(track)} className="flex-shrink-0 h-12 px-6">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : searchTab === 'kkbox' && searchResults.length === 0 && searchQuery ? (
              <p className="text-sm text-muted-foreground text-center py-8">🔍 No KKBOX results found</p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {searchTab === 'youtube' 
                  ? '🎬 Search YouTube for full songs (like Discord bots!)' 
                  : '🎵 Search KKBOX for 30-second previews'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Queue */}
        <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
          <CardHeader className="flex-shrink-0 pb-4">
            <CardTitle className="text-xl">📋 Queue ({roomState.queue.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {roomState.queue.length > 0 ? (
              <div className="space-y-3">
                {roomState.queue.map((track, index) => (
                  <div key={track.id} className="flex items-center gap-4 p-4 rounded-lg bg-accent/60 hover:bg-accent transition">
                    <span className="text-sm font-bold w-8 text-center flex-shrink-0">{index + 1}</span>
                    {track.image && (
                      <img src={track.image} alt={track.name} className="w-14 h-14 rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold truncate">{track.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFromQueue(track.id)}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Queue is empty. Add some songs! 🎵</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MusicRoom;
