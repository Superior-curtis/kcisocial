/**
 * KKBOX Music Service
 * Provides music search, playback, and recommendations via KKBOX API
 */

interface KKBoxTrack {
  id: string;
  name: string;
  artist?: string;
  album?: string;
  image?: string;
  duration?: number;
  previewUrl?: string;
  externalUrl?: string;
}

class KKBoxMusicService {
  private accessToken: string = '';
  private baseUrl = 'https://api.kkbox.com/v1.1';
  private clientId = import.meta.env.VITE_KKBOX_ID;
  private clientSecret = import.meta.env.VITE_KKBOX_SECRET;

  /**
   * Get access token via OAuth
   */
  async getAccessToken(): Promise<string> {
    try {
      if (this.accessToken) return this.accessToken;

      // This requires backend support - frontend cannot directly use client secret
      // For now, we'll use a mock implementation
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      });

      const response = await fetch(`${this.baseUrl}/oauth/access_token`, {
        method: 'POST',
        body: params,
      });

      const data = await response.json();
      this.accessToken = data.access_token;
      return this.accessToken;
    } catch (error) {
      console.error('Error getting KKBOX access token:', error);
      throw error;
    }
  }

  /**
   * Search songs
   */
  async searchTracks(query: string, limit: number = 20): Promise<KKBoxTrack[]> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}&type=song&limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      const songs = data.songs?.data || [];

      return songs.map((song: any) => ({
        id: song.id,
        name: song.name,
        artist: song.artist?.name || 'Unknown',
        album: song.album?.name || 'Unknown',
        image: song.album?.images?.[0]?.url || '',
        duration: song.duration || 0,
        previewUrl: song.url || undefined,
        externalUrl: song.url || '',
      }));
    } catch (error) {
      console.error('Error searching KKBOX tracks:', error);
      return [];
    }
  }

  /**
   * Get featured playlists
   */
  async getFeaturedPlaylists(limit: number = 10) {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/playlists?limit=${limit}&territory=TW`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data.playlists?.data || [];
    } catch (error) {
      console.error('Error fetching KKBOX playlists:', error);
      return [];
    }
  }

  /**
   * Get new release songs
   */
  async getNewReleases(limit: number = 10) {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/new-hits-playlists?limit=${limit}&territory=TW`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data.playlists?.data || [];
    } catch (error) {
      console.error('Error fetching KKBOX new releases:', error);
      return [];
    }
  }

  /**
   * Get recommendations
   */
  async getRecommendations(seed: string, limit: number = 20): Promise<KKBoxTrack[]> {
    try {
      const token = await this.getAccessToken();

      // KKBOX uses search for recommendations
      return this.searchTracks(seed, limit);
    } catch (error) {
      console.error('Error getting KKBOX recommendations:', error);
      return [];
    }
  }

  /**
   * Get authorization URL
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: import.meta.env.VITE_KKBOX_REDIRECT_URI,
      response_type: 'code',
      scope: 'kkbox.music.read kkbox.user.read',
    });

    return `https://account.kkbox.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Play preview
   */
  async playPreview(previewUrl: string): Promise<HTMLAudioElement> {
    const audio = new Audio(previewUrl);
    audio.play();
    return audio;
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

export default new KKBoxMusicService();
