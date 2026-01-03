/**
 * Music Service
 * KKBOX API with OAuth 2.0 authentication + Spotify fallback
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
  source?: 'kkbox' | 'spotify';
  spotifyUrl?: string;
  isrcCode?: string;
}

class MusicService {
  private kkboxClientId = '58dff52bea1298c549b6a9a44fd91610';
  private kkboxClientSecret = 'ac1271e37d61676b67722d29e671039a';
  private kkboxAccessToken: string | null = null;
  private kkboxTokenExpiry: number = 0;
  private kkboxAuthUrl = 'https://account.kkbox.com/oauth2/token';
  private kkboxApiUrl = 'https://api.kkbox.com/v1.1';

  /**
   * Get KKBOX access token using client credentials flow
   */
  private async getKKBOXAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.kkboxAccessToken && Date.now() < this.kkboxTokenExpiry) {
      return this.kkboxAccessToken;
    }

    try {
      const response = await fetch(this.kkboxAuthUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${this.kkboxClientId}:${this.kkboxClientSecret}`)
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error(`KKBOX auth failed: ${response.status}`);
      }

      const data = await response.json();
      this.kkboxAccessToken = data.access_token;
      // Token expires in 1 hour, cache for 55 minutes to be safe
      this.kkboxTokenExpiry = Date.now() + (55 * 60 * 1000);
      
      return data.access_token;
    } catch (error) {
      console.error('KKBOX authentication failed:', error);
      throw error;
    }
  }

  /**
   * Search tracks from KKBOX with full song playback support
   */
  async searchTracks(query: string, limit: number = 20): Promise<Track[]> {
    try {
      const accessToken = await this.getKKBOXAccessToken();
      
      const response = await fetch(
        `${this.kkboxApiUrl}/search?q=${encodeURIComponent(query)}&type=track&territory=TW&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`KKBOX API error: ${response.status}`);
      }

      const data = await response.json();
      const tracks = data.tracks?.data || [];

      const kkboxTracks = tracks.map((track: any) => ({
        id: track.id,
        name: track.name,
        artist: track.album?.artist?.name || 'Unknown Artist',
        album: track.album?.name,
        image: track.album?.images?.[0]?.url,
        duration: track.duration,
        previewUrl: track.url, // KKBOX provides full song URLs!
        externalUrl: track.url,
        source: 'kkbox' as const,
      }));

      // Also add Spotify search link as fallback
      const spotifyLink = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
      const spotifySearchTrack: Track = {
        id: 'spotify-search',
        name: `🎵 Search "${query}" on Spotify (alternative)`,
        artist: 'Click to open in Spotify',
        source: 'spotify',
        spotifyUrl: spotifyLink,
        externalUrl: spotifyLink,
      };

      return [spotifySearchTrack, ...kkboxTracks];
    } catch (error) {
      console.error('Error searching KKBOX:', error);
      // Fallback to Spotify search only if KKBOX fails
      const spotifyLink = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
      return [{
        id: 'spotify-search',
        name: `🎵 Search "${query}" on Spotify`,
        artist: 'KKBOX unavailable, click to search Spotify',
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
