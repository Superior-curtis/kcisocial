/**
 * Music Service
 * Simplified music search using iTunesAPI (no auth required)
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
}

class MusicService {
  private baseUrl = 'https://itunes.apple.com';

  /**
   * Search tracks - no auth needed
   */
  async searchTracks(query: string, limit: number = 20): Promise<Track[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`
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
      }));
    } catch (error) {
      console.error('Error searching tracks:', error);
      return [];
    }
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
