/**
 * YouTube Music Service
 * Search and play full songs from YouTube (like Discord bots)
 */

export interface YouTubeVideo {
  id: string;
  title: string;
  artist?: string;
  thumbnail: string;
  duration: string;
  durationSeconds?: number;
  videoUrl: string;
  embedUrl: string;
}

class YouTubeService {
  // Use YouTube Data API v3 (需要在 Firebase Console 啟用並獲取 API Key)
  private readonly apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || '';

  /**
   * Search YouTube for music videos
   */
  async searchMusic(query: string, maxResults: number = 10): Promise<YouTubeVideo[]> {
    console.log('[YouTube] Search query:', query, 'API Key present:', !!this.apiKey);
    
    if (this.apiKey) {
      try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=${maxResults}&q=${encodeURIComponent(query + ' official audio')}&key=${this.apiKey}`;
        
        console.log('[YouTube] Using official API');
        const response = await fetch(searchUrl);
        if (!response.ok) {
          throw new Error(`YouTube API search failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log('[YouTube] API response:', { itemCount: data.items?.length });
        
        if (!data.items || data.items.length === 0) {
          throw new Error('No results from YouTube API');
        }
        
        // Get video details for duration
        const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${this.apiKey}`;
        
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        const results = detailsData.items.map((item: any) => {
          const durationSeconds = this.parseDuration(item.contentDetails.duration);
          const title = item.snippet.title;
          const artist = this.extractArtist(title);

          return {
            id: item.id,
            title: this.cleanTitle(title),
            artist,
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
            duration: this.formatDuration(durationSeconds),
            durationSeconds,
            videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
            embedUrl: this.getEmbedUrl(item.id, true)
          };
        });
        
        console.log('[YouTube] API search success, results:', results.length);
        return results;
      } catch (error) {
        console.error('[YouTube] API search error:', error);
      }
    }

    console.log('[YouTube] Fallback to Piped');
    const pipedResults = await this.searchWithPiped(query, maxResults);
    if (pipedResults.length > 0) {
      console.log('[YouTube] Piped results:', pipedResults.length);
      return pipedResults;
    }

    console.log('[YouTube] Using fallback mock results');
    return this.fallbackSearch(query, maxResults);
  }

  /**
   * Fallback search (creates YouTube search links without API)
   */
  private fallbackSearch(query: string, maxResults: number): YouTubeVideo[] {
    // Create multiple mock results to mimic real search
    const mockResults: YouTubeVideo[] = [];
    
    const variations = [
      `${query} - Official Audio`,
      `${query} - Official Video`,
      `${query} - Lyrics`,
      `${query} - Full Song`
    ];
    
    variations.slice(0, Math.min(maxResults, 4)).forEach((title, index) => {
      const searchQuery = query + ' ' + ['official audio', 'official video', 'lyrics', 'full song'][index];
      mockResults.push({
        id: `yt-fallback-${index}`,
        title: title,
        artist: '🔍 Click to search on YouTube',
        thumbnail: 'https://via.placeholder.com/320x180/FF0000/FFFFFF?text=YouTube+Search',
        duration: '--:--',
        videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
        embedUrl: ''
      });
    });
    
    return mockResults;
  }

  /**
   * Search YouTube without an API key using the Piped open API
   */
  private async searchWithPiped(query: string, maxResults: number): Promise<YouTubeVideo[]> {
    try {
      const url = `https://piped.video/api/v1/search?q=${encodeURIComponent(query)}&filter=music`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Piped search failed');
      }

      const data = await response.json();
      const results = Array.isArray(data) ? data.slice(0, maxResults) : [];

      return results
        .map((item: any) => {
          const normalizedUrl = (item.url || '').startsWith('/watch')
            ? `https://www.youtube.com${item.url}`
            : item.url || '';
          const videoId = item.id || this.extractVideoId(normalizedUrl) || '';
          const durationSeconds = typeof item.duration === 'number'
            ? item.duration
            : this.parseSimpleDuration(item.duration);
          const durationLabel = typeof item.duration === 'string'
            ? item.duration
            : this.formatDuration(durationSeconds || 0);

          const thumbnail = Array.isArray(item.thumbnail)
            ? (item.thumbnail[0]?.url || item.thumbnail[0])
            : item.thumbnail;

          if (!videoId) return null;

          return {
            id: videoId,
            title: this.cleanTitle(item.title || query),
            artist: item.uploaderName || this.extractArtist(item.title || ''),
            thumbnail: thumbnail || 'https://via.placeholder.com/320x180/FF0000/FFFFFF?text=YouTube',
            duration: durationLabel || '--:--',
            durationSeconds,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            embedUrl: this.getEmbedUrl(videoId, true)
          } as YouTubeVideo;
        })
        .filter(Boolean) as YouTubeVideo[];
    } catch (error) {
      console.error('YouTube fallback (piped) search error:', error);
      return [];
    }
  }

  /**
   * Parse ISO 8601 duration (PT4M13S -> 253 seconds)
   */
  private parseDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Parse simple time string (MM:SS or HH:MM:SS)
   */
  private parseSimpleDuration(label?: string): number {
    if (!label) return 0;
    const parts = label.split(':').map((p) => Number(p));
    if (parts.some((p) => Number.isNaN(p))) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }

  /**
   * Format duration to MM:SS or HH:MM:SS
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Extract artist from title (e.g., "Artist - Song Name" or "Song Name by Artist")
   */
  private extractArtist(title: string): string {
    // Try "Artist - Song" format
    if (title.includes(' - ')) {
      return title.split(' - ')[0].trim();
    }
    
    // Try "Song by Artist" format
    if (title.toLowerCase().includes(' by ')) {
      const parts = title.toLowerCase().split(' by ');
      if (parts.length > 1) {
        return parts[1].split('(')[0].trim();
      }
    }
    
    return 'YouTube';
  }

  /**
   * Clean title (remove [Official Video], (Official Audio), etc.)
   */
  private cleanTitle(title: string): string {
    return title
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?official.*?\)/gi, '')
      .replace(/\(.*?audio.*?\)/gi, '')
      .replace(/\(.*?video.*?\)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get direct YouTube embed URL for a video ID
   */
  getEmbedUrl(videoId: string, autoplay: boolean = false): string {
    return `https://www.youtube.com/embed/${videoId}${autoplay ? '?autoplay=1&enablejsapi=1' : '?enablejsapi=1'}`;
  }

  /**
   * Extract video ID from various YouTube URL formats
   */
  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }
}

export const youtubeService = new YouTubeService();
export default YouTubeService;
