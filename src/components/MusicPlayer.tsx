import React, { useState } from 'react';
import { Search, Play, Music, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SpotifyTrack } from '@/types';
import musicService from '@/services/kkboxService';

const MusicPlayer: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<HTMLAudioElement | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const results = await musicService.searchTracks(searchQuery);
      setTracks(results as SpotifyTrack[]);
      if (results.length === 0) {
        setError('No tracks found. Try a different search.');
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError('Failed to search tracks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPreview = (track: SpotifyTrack) => {
    if (!track.previewUrl) {
      setError('No playback available for this track');
      return;
    }

    // Stop previous audio
    if (playingAudio) {
      playingAudio.pause();
    }

    setCurrentTrack(track);
    setError(null);
    const audio = new Audio(track.previewUrl);
    
    audio.addEventListener('error', () => {
      setError('Failed to play this track. KKBOX authentication may be required.');
    });
    
    audio.play().catch(() => {
      setError('Failed to play this track. Try opening in external player.');
    });
    setPlayingAudio(audio);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="pb-20 px-4 max-w-2xl mx-auto">
      {/* Search Card */}
      <Card className="mb-6 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-2xl">
            <Music className="w-7 h-7" />
            Music Player
          </CardTitle>
          <p className="text-white/80 text-sm mt-1">
            🎵 Search songs - Preview here, play full songs on Spotify!
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search songs, artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/20 border-white/30 text-white placeholder-white/60 backdrop-blur-sm"
            />
            <Button
              type="submit"
              className="bg-white text-purple-600 hover:bg-slate-100 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? 'Searching...' : <Search className="w-4 h-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Now Playing */}
      {currentTrack && (
        <Card className="mb-6 bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Now Playing</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex gap-4">
              {currentTrack.image && (
                <div className="relative">
                  <img
                    src={currentTrack.image}
                    alt={currentTrack.name}
                    className="w-24 h-24 rounded-lg shadow-lg"
                  />
                  <div className="absolute inset-0 rounded-lg bg-black/20"></div>
                </div>
              )}
              <div className="flex-1">
                <p className="text-white font-bold text-lg line-clamp-2">
                  {currentTrack.name}
                </p>
                <p className="text-purple-400 font-medium mb-3">
                  {currentTrack.artist}
                </p>
                {currentTrack.album && (
                  <p className="text-slate-400 text-sm">{currentTrack.album}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {tracks.length > 0 && (
        <Card className="bg-slate-900 border-slate-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Results ({tracks.length})</span>
              <span className="text-sm font-normal text-slate-400">
                {tracks.filter((t) => t.previewUrl).length} with preview
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {tracks.map((track, idx) => (
                <div
                  key={`${track.id}-${idx}`}
                  className={`flex items-center gap-3 p-3 hover:bg-slate-800 transition border-b border-slate-800 last:border-0 ${
                    track.source === 'spotify' ? 'bg-green-900/20' : ''
                  }`}
                >
                  {track.id === 'spotify-search' ? (
                    <div className="w-14 h-14 rounded bg-green-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">🎵</span>
                    </div>
                  ) : track.image ? (
                    <img
                      src={track.image}
                      alt={track.name}
                      className="w-14 h-14 rounded shadow flex-shrink-0"
                    />
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {track.name}
                    </p>
                    {track.artist && (
                      <p className="text-slate-400 text-xs truncate">
                        {track.artist}
                      </p>
                    )}
                    {track.album && (
                      <p className="text-slate-500 text-xs truncate">
                        {track.album}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {track.source === 'spotify' ? (
                      <a
                        href={track.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-full text-xs font-medium transition"
                      >
                        <span>Listen</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <>
                        <span className="text-slate-400 text-xs whitespace-nowrap">
                          {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : ''}
                        </span>
                        <Button
                          size="sm"
                          variant={currentTrack?.id === track.id ? 'default' : 'outline'}
                          onClick={() => handlePlayPreview(track)}
                          disabled={!track.previewUrl}
                          className="rounded-full w-9 h-9 p-0"
                          title={!track.previewUrl ? 'No preview available' : 'Play 30s preview'}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && tracks.length === 0 && searchQuery && !error && (
        <Card className="bg-slate-800 border-slate-700 text-center py-8">
          <Music className="w-12 h-12 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400">No tracks found. Try another search!</p>
        </Card>
      )}

      {!isLoading && tracks.length === 0 && !searchQuery && (
        <Card className="bg-slate-800 border-slate-700 text-center py-12">
          <Music className="w-16 h-16 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">Search for music</p>
          <p className="text-slate-400 text-sm">
            Find and preview your favorite songs
          </p>
        </Card>
      )}
    </div>
  );
};

export default MusicPlayer;
