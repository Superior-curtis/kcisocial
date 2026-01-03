/**
 * Music Service
 * Uses Firebase Cloud Functions proxy for KKBOX API (bypasses CORS)
 * Falls back to iTunes API for previews + Spotify links
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
  source?: 'itunes' | 'spotify' | 'kkbox';
  spotifyUrl?: string;
  kkboxUrl?: string;
  isrcCode?: string;
}

class MusicService {
  private iTunesApiUrl = 'https://itunes.apple.com/search';
  // Update this after deploying Cloud Functions
  private kkboxProxyUrl = import.meta.env.VITE_KKBOX_PROXY_URL || '';

  /**
   * Search tracks - tries KKBOX first, falls back to iTunes
   */
  async searchTracks(query: string, limit: number = 20): Promise<Track[]> {
    // Try KKBOX first if proxy is configured
    if (this.kkboxProxyUrl) {
      try {
        const kkboxTracks = await this.searchKKBOX(query, limit);
        if (kkboxTracks.length > 0) {
          return kkboxTracks;
        }
      } catch (error) {
        console.warn('KKBOX search failed, falling back to iTunes:', error);
      }
    }

    // Fallback to iTunes
    return this.searchITunes(query, limit);
  }

  /**
   * Search KKBOX via Cloud Functions proxy
   */
  private async searchKKBOX(query: string, limit: number = 20): Promise<Track[]> {
    try {
      const url = new URL(`${this.kkboxProxyUrl}/kkboxSearch`);
      url.searchParams.set('q', query);
      url.searchParams.set('territory', 'TW');
      url.searchParams.set('limit', limit.toString());

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`KKBOX proxy error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.tracks.map((track: any) => ({
        id: track.id,
        name: track.name,
        artist: track.artist,
        album: track.album,
        image: track.image,
        duration: track.duration,
        previewUrl: track.previewUrl,
        kkboxUrl: track.kkboxUrl,
        spotifyUrl: this.getSpotifySearchLink(track.name, track.artist),
        source: 'kkbox' as const,
        isrcCode: track.isrcCode,
      }));
    } catch (error) {
      console.error('Error searching KKBOX:', error);
      throw error;
    }
  }

  /**
   * Search tracks from iTunes + provide Spotify links
   */
  private async searchITunes(query: string, limit: number = 20): Promise<Track[]> {
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
        spotifyUrl: this.getSpotifySearchLink(item.trackName, item.artistName),
        kkboxUrl: `https://www.kkbox.com/search?q=${encodeURIComponent(item.trackName + ' ' + item.artistName)}`,
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
        kkboxUrl: `https://www.kkbox.com/search?q=${encodeURIComponent(query)}`,
      };

      return [spotifySearchTrack, ...tracks];
    } catch (error) {
      console.error('Error searching iTunes:', error);
      // Fallback to Spotify search only
      const spotifyLink = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
      const kkboxLink = `https://www.kkbox.com/search?q=${encodeURIComponent(query)}`;
      return [{
        id: 'spotify-search',
        name: `🎵 Search "${query}" on Spotify`,
        artist: 'Click to open in Spotify',
        source: 'spotify',
        spotifyUrl: spotifyLink,
        kkboxUrl: kkboxLink,
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
