/**
 * Music Service
 * iTunes API for previews + Spotify links for full songs
 * Note: KKBOX requires backend proxy due to CORS
 */

interface Track {
  id: string;
  name: string;
  artist?: string;
  album?: string;
  image?: string;
  duration?: number;
  previewUrl?: string;
  externalUrl?: string;
  source?: 'itunes' | 'spotify';
  spotifyUrl?: string;
  isrcCode?: string;
}

class MusicService {
  private iTunesApiUrl = 'https://itunes.apple.com/search';

  /**
   * Search tracks from iTunes + provide Spotify links
   */
  async searchTracks(query: string, limit: number = 20): Promise<Track[]> {
    try {
      const response = await fetch(
        `${this.iTunesApiUrl}?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`iTunes API error: ${response.status}`);
      }

      const data = await response.json();
      
      const tracks = data.results.map((item: any) => ({
        id: item.trackId.toString(),
        name: item.trackName,
        artist: item.artistName,
        album: item.collectionName,
        image: item.artworkUrl100?.replace('100x100', '300x300'),
        duration: Math.floor(item.trackTimeMillis / 1000),
        previewUrl: item.previewUrl,
        externalUrl: item.trackViewUrl,
        source: 'itunes' as const,
        spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(item.trackName + ' ' + item.artistName)}`,
        isrcCode: item.isrcCode
      }));

      // Add Spotify search option at the top
      const spotifyLink = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
      const spotifySearchTrack: Track = {
        id: 'spotify-search',
        name: `🎵 Search "${query}" on Spotify for full songs`,
        artist: 'Click to open in Spotify',
        source: 'spotify',
        spotifyUrl: spotifyLink,
        externalUrl: spotifyLink,
      };

      return [spotifySearchTrack, ...tracks];
    } catch (error) {
      console.error('Error searching iTunes:', error);
      // Fallback to Spotify search only
      const spotifyLink = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
      return [{
        id: 'spotify-search',
        name: `🎵 Search "${query}" on Spotify`,
        artist: 'Click to open in Spotify',
        source: 'spotify',
        spotifyUrl: spotifyLink,
        externalUrl: spotifyLink,
      }];
    }
  }

  /**
   * Get Spotify link for a song
   */
  getSpotifySearchLink(songName: string, artist?: string): string {
    const query = artist ? `${songName} ${artist}` : songName;
    return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
  }

  /**
   * Get featured playlists - mock data
   */
  async getFeaturedPlaylists(limit: number = 10) {
    return [];
  }

  /**
   * Get new releases
   */
  async getNewReleases(limit: number = 10) {
    return [];
  }

  /**
   * Get recommendations
   */
  async getRecommendations(seed: string, limit: number = 20): Promise<Track[]> {
    return this.searchTracks(seed, limit);
  }

  /**
   * Format duration
   */
  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export default new MusicService();
