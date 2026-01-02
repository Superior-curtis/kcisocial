import React, { useState } from 'react';
import { Search, Play, Heart, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SpotifyTrack } from '@/types';
import { spotifyService } from '@/services/spotifyService';

const MusicPlayer: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const results = await spotifyService.searchTracks(searchQuery);
      setTracks(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPreview = (track: SpotifyTrack) => {
    if (track.previewUrl) {
      spotifyService.playPreview(track.previewUrl);
      setCurrentTrack(track);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-green-600 to-green-700 border-0">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Music className="w-6 h-6" />
            Music Player
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search Spotify tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/20 border-white/30 text-white placeholder-white/50"
            />
            <Button
              type="submit"
              className="bg-white text-green-600 hover:bg-slate-100"
              disabled={isLoading}
            >
              <Search className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {currentTrack && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {currentTrack.image && (
                <img
                  src={currentTrack.image}
                  alt={currentTrack.name}
                  className="w-16 h-16 rounded"
                />
              )}
              <div className="flex-1">
                <p className="text-white font-bold">{currentTrack.name}</p>
                <p className="text-slate-400">{currentTrack.artist}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tracks.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Results ({tracks.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-3 p-2 bg-slate-700 rounded hover:bg-slate-600 transition"
              >
                {track.image && (
                  <img
                    src={track.image}
                    alt={track.name}
                    className="w-12 h-12 rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {track.name}
                  </p>
                  <p className="text-slate-400 text-xs truncate">
                    {track.artist}
                  </p>
                </div>
                <span className="text-slate-400 text-xs">
                  {formatDuration(track.duration)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handlePlayPreview(track)}
                  disabled={!track.previewUrl}
                >
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MusicPlayer;
