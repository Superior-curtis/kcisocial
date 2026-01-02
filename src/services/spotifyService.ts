/**
 * Spotify Music Service
 * Provides music search, playback, and recommendations
 */

import SpotifyWebApi from 'spotify-web-api-js';
import { SpotifyTrack } from '../types';

class SpotifyMusicService {
  private api: SpotifyWebApi.SpotifyWebApiJs = new SpotifyWebApi();

  /**
   * Set access token
   */
  setAccessToken(token: string) {
    this.api.setAccessToken(token);
  }

  /**
   * Search tracks
   */
  async searchTracks(query: string, limit: number = 20): Promise<SpotifyTrack[]> {
    try {
      const results = await this.api.searchTracks(query, { limit });
      return (
        results.tracks?.items?.map((track) => ({
          id: track.id,
          name: track.name,
          artist: track.artists?.[0]?.name || 'Unknown',
          album: track.album?.name || 'Unknown',
          image: track.album?.images?.[0]?.url || '',
          duration: Math.floor((track.duration_ms || 0) / 1000),
          previewUrl: track.preview_url || undefined,
          externalUrl: track.external_urls?.spotify || '',
        })) || []
      );
    } catch (error) {
      console.error('Error searching Spotify tracks:', error);
      return [];
    }
  }

  /**
   * Get new releases
   */
  async getNewReleases(limit: number = 10) {
    try {
      const results = await this.api.getNewReleases({ limit });
      return results.albums?.items || [];
    } catch (error) {
      console.error('Error fetching new releases:', error);
      return [];
    }
  }

  /**
   * Get recommendations
   */
  async getRecommendations(
    seedTrackIds: string[],
    limit: number = 20
  ): Promise<SpotifyTrack[]> {
    try {
      const recommendations = await this.api.getRecommendations({
        seed_tracks: seedTrackIds.slice(0, 5),
        limit,
      });

      return (
        recommendations.tracks?.map((track) => ({
          id: track.id,
          name: track.name,
          artist: track.artists?.[0]?.name || 'Unknown',
          album: track.album?.name || 'Unknown',
          image: track.album?.images?.[0]?.url || '',
          duration: Math.floor((track.duration_ms || 0) / 1000),
          previewUrl: track.preview_url || undefined,
          externalUrl: track.external_urls?.spotify || '',
        })) || []
      );
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  /**
   * Get Spotify authorization URL
   */
  getAuthorizationUrl(
    clientId: string,
    redirectUri: string,
    scopes: string[] = [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-read-playback-state',
    ]
  ): string {
    const scope = scopes.join('%20');
    return `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${scope}`;
  }

  /**
   * Play preview
   */
  playPreview(previewUrl: string): HTMLAudioElement | null {
    if (!previewUrl) return null;
    const audio = new Audio(previewUrl);
    audio.play();
    return audio;
  }
}

export const spotifyService = new SpotifyMusicService();
export default SpotifyMusicService;
