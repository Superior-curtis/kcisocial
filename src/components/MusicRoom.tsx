import React, { useEffect, useState, useRef } from 'react';
import { Music, Play, Pause, SkipForward, SkipBack, Plus, Trash2, Users, Search, Volume2, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { syncMusicService, MusicRoomState, MusicTrack, ListenerInfo } from '@/services/syncMusicService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { youtubeService, YouTubeVideo } from '@/services/youtubeService';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeIframeApiPromise: Promise<void> | null = null;
function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeIframeApiPromise) return youtubeIframeApiPromise;

  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => reject(new Error('Failed to load YouTube IFrame API'));
      document.body.appendChild(tag);
    }

    const prior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        prior?.();
      } finally {
        resolve();
      }
    };

    // Fallback in case API is already ready but callback didn't fire
    const timeout = window.setTimeout(() => {
      if (window.YT?.Player) resolve();
      else reject(new Error('Timed out loading YouTube IFrame API'));
    }, 15000);

    youtubeIframeApiPromise?.finally(() => window.clearTimeout(timeout));
  });

  return youtubeIframeApiPromise;
}

interface MusicRoomProps {
  clubId: string;
  clubName: string;
}

const MusicRoom: React.FC<MusicRoomProps> = ({ clubId, clubName }) => {
  const { user } = useAuth();
  const [roomState, setRoomState] = useState<MusicRoomState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [youtubeResults, setYoutubeResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [volume, setVolume] = useState<number>(0.5);
  const [currentPlayTime, setCurrentPlayTime] = useState<number>(0);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);

  const playerRef = useRef<any>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const playTimeIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const canControlMusicRef = useRef<boolean>(false);

  const isOwner = user && roomState && roomState.creatorId === user.id;
  const isAdmin = user?.role === 'admin';

  const controlMusic = roomState?.controlMusic ?? 'owner';
  const controlQueue = roomState?.controlQueue ?? 'owner';

  const canControlMusic = !!user && !!roomState && (isOwner || isAdmin || controlMusic === 'all');
  const canControlQueue = !!user && !!roomState && (isOwner || isAdmin || controlQueue === 'all');
  const canEditPermissions = !!user && !!roomState && (isOwner || isAdmin);

  const currentTrack = roomState?.currentTrack;
  const listeners = getListenersList();

  useEffect(() => {
    canControlMusicRef.current = canControlMusic;
  }, [canControlMusic]);

  // Many browsers block autoplay; enable audio on the first user gesture anywhere in the room.
  useEffect(() => {
    const onFirstGesture = () => {
      setAudioEnabled(true);
      try {
        if (roomState?.isPlaying && roomState?.currentTrack?.youtubeId) {
          playerRef.current?.playVideo?.();
        }
      } catch {
        // ignore
      }
    };

    document.addEventListener('pointerdown', onFirstGesture, { once: true });
    return () => document.removeEventListener('pointerdown', onFirstGesture);
  }, [roomState?.isPlaying]);

  // If the room has no current track, ensure the player is stopped.
  useEffect(() => {
    if (roomState?.currentTrack?.youtubeId) return;
    try {
      playerRef.current?.pauseVideo?.();
      playerRef.current?.stopVideo?.();
    } catch {
      // ignore
    }
  }, [roomState?.currentTrack?.youtubeId]);

  function getListenersList(): ListenerInfo[] {
    if (!roomState?.listeners) {
      console.log('[MusicRoom] No listeners in state');
      return [];
    }
    
    const result = Array.isArray(roomState.listeners)
      ? roomState.listeners.map(l => {
          if (typeof l === 'string') {
            console.log('[MusicRoom] WARNING: Old string format listener:', l);
            return { userId: l, userName: 'Anonymous', avatar: '', joinedAt: Date.now() };
          }
          return l;
        })
      : [];
    
    console.log('[MusicRoom] Listeners list:', result.map(l => l.userName));
    return result;
  }

  const parseDurationToSeconds = (value: string | number | undefined): number | undefined => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return undefined;
    const parts = value.split(':').map((p) => Number(p));
    if (parts.some((p) => Number.isNaN(p))) return undefined;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return undefined;
  };

  const formatPlayTime = (seconds: number): string => {
    const totalSeconds = Math.max(0, Math.floor(seconds / 1000)); // Convert ms to seconds
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    if (!user) return;
    const safeClubId = (clubId || '').trim();
    if (!safeClubId) return;

    // Reset state when joining new room
    setRoomState(null);

    let disposed = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        unsubscribe = await syncMusicService.joinRoom(
          safeClubId,
          user.id,
          user.displayName || user.username || 'Anonymous',
          user.profileImageUrl || '',
          (state) => {
            if (disposed) return;
            console.log('[MusicRoom] State update received:', {
              track: state.currentTrack?.name,
              listeners: Array.isArray(state.listeners) ? state.listeners.length : 0,
              queue: state.queue?.length
            });
            setRoomState(state);
          }
        );
      } catch (e) {
        console.error('[MusicRoom] Failed to join room:', e);
      }
    })();

    return () => {
      disposed = true;
      try {
        unsubscribe?.();
      } catch {
        // ignore
      }
      syncMusicService.leaveRoom(user.id);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (playTimeIntervalRef.current) {
        clearInterval(playTimeIntervalRef.current);
      }
    };
  }, [clubId, user]);

  // Update play time display every 100ms for smooth updates
  useEffect(() => {
    playTimeIntervalRef.current = setInterval(() => {
      if (roomState) {
        const syncedPos = syncMusicService.getSyncedPosition(roomState);
        setCurrentPlayTime(syncedPos);
      }
    }, 100);

    return () => {
      if (playTimeIntervalRef.current) {
        clearInterval(playTimeIntervalRef.current);
      }
    };
  }, [roomState]);

  // Initialize YouTube IFrame Player and keep it synced to Firestore clock
  useEffect(() => {
    if (!roomState?.currentTrack?.youtubeId) return;

    let cancelled = false;
    const youtubeId = roomState.currentTrack.youtubeId;

    const ensurePlayer = async () => {
      await loadYouTubeIframeApi();
      if (cancelled) return;

      const mountElId = `yt-player-${clubId}`;
      const expectedSeconds = Math.max(0, Math.floor(syncMusicService.getSyncedPosition(roomState) / 1000));
      if (!playerRef.current) {
        playerRef.current = new window.YT.Player(mountElId, {
          height: '1',
          width: '1',
          videoId: youtubeId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            enablejsapi: 1,
            origin: window.location.origin,
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            start: expectedSeconds
          },
          events: {
            onReady: () => {
              try {
                playerRef.current?.setVolume(Math.round(volume * 100));
              } catch {
                // ignore
              }
            },
            onStateChange: (evt: any) => {
              // 0 = ended
              if (evt?.data === 0 && canControlMusicRef.current) {
                syncMusicService.skipTrack();
              }
            }
          }
        });
      } else {
        try {
          if (roomState.isPlaying && audioEnabled) {
            playerRef.current.loadVideoById(youtubeId, expectedSeconds);
          } else {
            playerRef.current.cueVideoById(youtubeId, expectedSeconds);
          }
        } catch (e) {
          console.warn('[MusicRoom] Failed to load/cue video', e);
        }
      }
    };

    ensurePlayer();

    return () => {
      cancelled = true;
    };
  }, [clubId, roomState?.currentTrack?.youtubeId]);

  // Keep volume in sync with slider (also counts as a user gesture if changed)
  useEffect(() => {
    try {
      playerRef.current?.setVolume(Math.round(volume * 100));
    } catch {
      // ignore
    }
  }, [volume]);

  // Drift correction + play/pause enforcement
  useEffect(() => {
    if (!roomState?.currentTrack?.youtubeId) return;

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = undefined;
    }

    syncIntervalRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player || !roomState) return;

      const expectedSeconds = Math.max(0, syncMusicService.getSyncedPosition(roomState) / 1000);
      try {
        const actualSeconds = Number(player.getCurrentTime?.() ?? 0);
        const drift = Math.abs(actualSeconds - expectedSeconds);
        if (drift > 2) {
          player.seekTo(expectedSeconds, true);
        }

        const state = player.getPlayerState?.();
        if (roomState.isPlaying) {
          if (audioEnabled && state !== 1 && state !== 3) {
            player.playVideo?.();
          }
        } else {
          if (state === 1 || state === 3) {
            player.pauseVideo?.();
          }
        }
      } catch {
        // ignore
      }
    }, 1000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = undefined;
      }
    };
  }, [roomState, audioEnabled]);

  useEffect(() => {
    if (!user) return;
    const handleBeforeUnload = () => {
      syncMusicService.leaveRoom(user.id);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !canControlQueue) return;

    setIsSearching(true);
    try {
      const results = await youtubeService.searchMusic(searchQuery);
      const realResults = results.filter((r: any) => !r.id.startsWith('yt-fallback'));
      setYoutubeResults(realResults.length > 0 ? realResults : results);
    } catch (error) {
      console.error('Search error:', error);
      toast({ title: 'Search failed', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToQueue = async (video: YouTubeVideo) => {
    if (!user || !canControlQueue) {
      toast({ title: 'You cannot control the queue', variant: 'destructive' });
      return;
    }

    setAudioEnabled(true);

    try {
      const durationSeconds = parseDurationToSeconds(video.durationSeconds ?? video.duration);
      const musicTrack: MusicTrack = {
        id: video.id,
        name: video.title,
        artist: video.artist,
        image: video.thumbnail,
        duration: durationSeconds,
        youtubeUrl: video.videoUrl,
        youtubeId: video.id,
        youtubeEmbed: video.embedUrl,
        addedBy: user.id,
        addedAt: Date.now()
      };

      console.log('[MusicRoom] Adding track:', musicTrack.name);
      await syncMusicService.addToQueue(musicTrack, user.id);
      toast({ title: `✅ Added "${video.title}"` });
      setShowSearch(false);
    } catch (error) {
      console.error('[MusicRoom] Error:', error);
      toast({ title: '❌ Failed to add track', variant: 'destructive' });
    }
  };

  const handlePlayPause = async () => {
    if (!canControlMusic) {
      console.log('[MusicRoom] User cannot control music: play/pause');
      return;
    }
    setAudioEnabled(true);
    console.log('[MusicRoom] Toggling play/pause');
    await syncMusicService.togglePlayPause();
  };

  const handleSkip = async () => {
    if (!canControlMusic) {
      console.log('[MusicRoom] User cannot control music: skip');
      return;
    }
    setAudioEnabled(true);
    console.log('[MusicRoom] Skipping track');
    await syncMusicService.skipTrack();
  };

  const handlePrevious = async () => {
    if (!canControlMusic) {
      console.log('[MusicRoom] User cannot control music: previous');
      return;
    }
    setAudioEnabled(true);
    console.log('[MusicRoom] Playing previous');
    await syncMusicService.playPrevious();
  };

  const handleToggleShuffle = async () => {
    if (!canControlMusic) return;
    console.log('[MusicRoom] Toggling shuffle');
    await syncMusicService.toggleShuffle();
  };

  const handleToggleRepeat = async () => {
    if (!canControlMusic) return;
    console.log('[MusicRoom] Toggling repeat');
    await syncMusicService.toggleRepeatMode();
  };

  const handleRemoveFromQueue = async (trackId: string) => {
    if (!canControlQueue) return;
    console.log('[MusicRoom] Removing from queue:', trackId);
    await syncMusicService.removeFromQueue(trackId);
  };

  const handleToggleControlMusic = async (checked: boolean) => {
    if (!canEditPermissions) return;
    await syncMusicService.updateRoomControls({ controlMusic: checked ? 'all' : 'owner' });
  };

  const handleToggleControlQueue = async (checked: boolean) => {
    if (!canEditPermissions) return;
    await syncMusicService.updateRoomControls({ controlQueue: checked ? 'all' : 'owner' });
  };

  const repeatIcon = roomState?.repeatMode === 'one' ? <Repeat1 /> : roomState?.repeatMode === 'all' ? <Repeat /> : null;

  return (
    <div className="w-full h-screen flex flex-col bg-gradient-to-br from-slate-900 to-black text-white p-4 gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold">{clubName}</h1>
          <p className="text-gray-400 mt-1 text-sm">{listeners.length} listening • {roomState?.queue?.length || 0} in queue</p>
        </div>
        <div className="flex items-center gap-4">
          {canEditPermissions && (
            <div className="flex items-center gap-4 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap">Everyone can control music</span>
                <Switch
                  checked={(roomState?.controlMusic ?? 'owner') === 'all'}
                  onCheckedChange={handleToggleControlMusic}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap">Everyone can control queue</span>
                <Switch
                  checked={(roomState?.controlQueue ?? 'owner') === 'all'}
                  onCheckedChange={handleToggleControlQueue}
                />
              </div>
            </div>
          )}
          {canControlQueue && (
            <Button
              onClick={() => setShowSearch(!showSearch)}
              className="bg-red-600 hover:bg-red-700 h-10 px-6 text-sm"
            >
              <Search className="w-4 h-4 mr-2" />
              Add Music
            </Button>
          )}
        </div>
      </div>

      {/* Search Panel */}
      {showSearch && canControlQueue && (
        <Card className="bg-slate-800/80 backdrop-blur border-slate-700 flex-shrink-0">
          <CardContent className="pt-4 space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Search YouTube songs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white h-10 text-sm"
              />
              <Button type="submit" disabled={isSearching} className="bg-red-600 hover:bg-red-700 h-10 px-4 text-sm">
                {isSearching ? 'Searching...' : <Search className="w-4 h-4" />}
              </Button>
            </form>

            {youtubeResults.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {youtubeResults.map((video) => (
                  <div key={video.id} className="flex items-center gap-3 p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition cursor-pointer">
                    <img src={video.thumbnail} alt={video.title} className="w-16 h-12 rounded object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{video.title}</p>
                      <p className="text-xs text-gray-400 truncate">{video.artist} • {video.duration}</p>
                    </div>
                    <Button size="sm" onClick={() => handleAddToQueue(video)} className="bg-green-600 hover:bg-green-700 flex-shrink-0 h-8 w-8 p-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content: 2 columns */}
      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden min-h-0">
        
        {/* Left (2/3): Player + Control */}
        <div className="col-span-2 flex flex-col gap-4 overflow-hidden">
          {/* Current Track - Large */}
          <Card className="bg-slate-800/50 backdrop-blur border-slate-700 flex-1 flex flex-col overflow-hidden">
            <CardContent className="flex-1 flex flex-col items-center justify-center p-4">
              {currentTrack ? (
                <div className="w-full flex flex-col items-center gap-4">
                  {/* Album Art */}
                  <div className="w-64 h-64 rounded-xl overflow-hidden shadow-2xl flex-shrink-0">
                    <img 
                      src={currentTrack.image || 'https://via.placeholder.com/300'} 
                      alt={currentTrack.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Track Info */}
                  <div className="text-center w-full">
                    <h2 className="text-2xl font-bold mb-1 line-clamp-2">{currentTrack.name}</h2>
                    <p className="text-lg text-gray-400 line-clamp-1">{currentTrack.artist || 'Unknown'}</p>
                  </div>

                  {/* Controls */}
                  {canControlMusic && (
                    <div className="w-full space-y-3">
                      {/* Play/Pause + Skip */}
                      <div className="flex gap-3 justify-center">
                        <Button 
                          onClick={handlePrevious}
                          className="bg-slate-700 hover:bg-slate-600 h-12 w-12 p-0"
                          title="Previous"
                        >
                          <SkipBack className="w-5 h-5" />
                        </Button>
                        <Button 
                          onClick={handlePlayPause}
                          className="bg-green-600 hover:bg-green-700 h-14 w-28 text-lg"
                          title={roomState?.isPlaying ? 'Pause' : 'Play'}
                        >
                          {roomState?.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                        </Button>
                        <Button 
                          onClick={handleSkip}
                          className="bg-slate-700 hover:bg-slate-600 h-12 w-12 p-0"
                          title="Next"
                        >
                          <SkipForward className="w-5 h-5" />
                        </Button>
                      </div>

                      {/* Shuffle + Repeat */}
                      <div className="flex gap-3 justify-center">
                        <Button 
                          onClick={handleToggleShuffle}
                          className={roomState?.shuffleEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-600'}
                          variant="outline"
                          title="Shuffle"
                          size="sm"
                        >
                          <Shuffle className="w-4 h-4" />
                        </Button>
                        <Button 
                          onClick={handleToggleRepeat}
                          className={roomState?.repeatMode ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-600'}
                          variant="outline"
                          title="Repeat"
                          size="sm"
                        >
                          {repeatIcon || <Repeat className="w-4 h-4" />}
                        </Button>
                      </div>

                      {/* Volume */}
                      <div className="max-w-xs mx-auto space-y-1">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <Slider
                            value={[volume]}
                            onValueChange={(v) => setVolume(v[0])}
                            min={0}
                            max={1}
                            step={0.01}
                            className="flex-1"
                          />
                          <span className="text-xs text-gray-400 w-8 text-right">{Math.round(volume * 100)}%</span>
                        </div>
                      </div>

                      {/* Playback Time */}
                      <div className="w-full text-center text-xs text-gray-400">
                        <p>{formatPlayTime(currentPlayTime)} / {formatPlayTime((currentTrack?.duration || 0) * 1000)}</p>
                      </div>
                    </div>
                  )}
                  {!audioEnabled && (
                    <div className="text-center text-sm text-gray-300 space-y-2">
                      <p className="text-xs text-gray-400">Audio may be blocked until you click once.</p>
                      <Button
                        onClick={() => {
                          setAudioEnabled(true);
                          try {
                            const expectedSeconds = Math.max(0, syncMusicService.getSyncedPosition(roomState!) / 1000);
                            playerRef.current?.seekTo?.(expectedSeconds, true);
                            if (roomState?.isPlaying) {
                              playerRef.current?.playVideo?.();
                            }
                          } catch {
                            // ignore
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 h-9 px-4 text-sm"
                      >
                        Enable Audio
                      </Button>
                    </div>
                  )}
                  {!canControlMusic && (
                    <div className="text-center text-sm text-gray-400">
                      <p className="text-xs">Only permitted users can control playback</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <Music className="w-20 h-20 mx-auto text-gray-600 mb-3" />
                  <p className="text-xl text-gray-400">No music playing</p>
                  {canControlQueue && <p className="text-gray-500 mt-2 text-sm">Click "Add Music" above to start</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right (1/3): Listeners + Queue */}
        <div className="col-span-1 flex flex-col gap-4 overflow-hidden min-h-0">
          
          {/* Listeners */}
          <Card className="bg-slate-800/50 backdrop-blur border-slate-700 flex-1 flex flex-col overflow-hidden min-h-0">
            <CardHeader className="flex-shrink-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4" />
                Listening
                <span className="text-xs bg-red-600 px-2 py-0.5 rounded-full ml-auto">{listeners.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-1 overflow-y-auto min-h-0">
              {listeners.length > 0 ? (
                listeners.map((listener) => (
                  <div key={listener.userId} className="flex items-center gap-2 p-1.5 bg-slate-700/50 rounded text-sm hover:bg-slate-700 transition">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={listener.avatar} />
                      <AvatarFallback className="bg-blue-600 text-xs">{listener.userName?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{listener.userName}</p>
                      {listener.userId === roomState?.creatorId && <p className="text-xs text-yellow-400">👑 Owner</p>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4 text-xs">Waiting...</p>
              )}
            </CardContent>
          </Card>

          {/* Queue */}
          <Card className="bg-slate-800/50 backdrop-blur border-slate-700 flex-1 flex flex-col overflow-hidden min-h-0">
            <CardHeader className="flex-shrink-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                Queue
                <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full ml-auto">{roomState?.queue?.length || 0}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-0.5 overflow-y-auto min-h-0">
              {roomState?.queue && roomState.queue.length > 0 ? (
                roomState.queue.map((track, idx) => (
                  <div key={track.id} className="flex items-start gap-1.5 p-1.5 bg-slate-700/50 rounded group hover:bg-slate-700 transition text-sm">
                    <span className="text-xs font-bold text-gray-400 flex-shrink-0 w-5 mt-0.5">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{track.name}</p>
                      <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                    </div>
                    {canControlQueue && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleRemoveFromQueue(track.id)}
                        className="opacity-0 group-hover:opacity-100 transition flex-shrink-0 h-5 w-5 p-0"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4 text-xs">Queue empty</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden YouTube IFrame API mount */}
      <div className="fixed bottom-0 left-0 z-0 opacity-0 pointer-events-none" style={{ width: '1px', height: '1px' }}>
        <div id={`yt-player-${clubId}`} />
      </div>
    </div>
  );
};

export default MusicRoom;
