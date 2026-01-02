/**
 * Music Service
 * Search music from multiple sources (iTunes + Spotify via public endpoints)
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
  private itunesUrl = 'https://itunes.apple.com';
  private spotifySearchUrl = 'https://open.spotify.com/search';

  /**
   * Search tracks from iTunes and Spotify
   */
  async searchTracks(query: string, limit: number = 20): Promise<Track[]> {
    try {
      // Search iTunes first
      const itunesResults = await this.searchItunes(query, limit);
      
      // Also create Spotify search link for users
      const spotifyLink = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
      
      // Add Spotify search reference at the top
      const spotifySearchTrack: Track = {
        id: 'spotify-search',
        name: `🎵 Search "${query}" on Spotify for full song playback`,
        artist: 'Click to open in Spotify',
        source: 'spotify',
        spotifyUrl: spotifyLink,
        externalUrl: spotifyLink,
      };

      return [spotifySearchTrack, ...itunesResults];
    } catch (error) {
      console.error('Error searching tracks:', error);
      return [];
    }
  }

  /**
   * Search iTunes
   */
  private async searchItunes(query: string, limit: number = 20): Promise<Track[]> {
    try {
      const response = await fetch(
        `${this.itunesUrl}/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`
      );

      const data = await response.json();
      const results = data.results || [];

      return results.map((track: any) => ({
        id: track.trackId,
        name: track.trackName,
        artist: track.artistName,
        album: track.collectionName,
        image: track.artworkUrl100?.replace('100x100', '300x300'),
        duration: Math.floor((track.trackTimeMillis || 0) / 1000),
        previewUrl: track.previewUrl || undefined,
        externalUrl: track.trackViewUrl || '',
        source: 'itunes' as const,
      }));
    } catch (error) {
      console.error('Error searching iTunes:', error);
      return [];
    }
  }

  /**
   * Get Spotify link for a song - user can play full song there
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
