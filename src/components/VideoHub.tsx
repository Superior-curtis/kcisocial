import React, { useState } from 'react';
import { Upload, Play, Eye, AlertCircle, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VideoContent } from '@/types';

interface VideoSource {
  type: 'youtube' | 'instagram' | 'local';
  url: string;
}

const VideoHub: React.FC = () => {
  const [videos, setVideos] = useState<VideoContent[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoContent | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoSource, setVideoSource] = useState<VideoSource['type']>('youtube');
  const [error, setError] = useState<string | null>(null);

  const extractYouTubeEmbedUrl = (url: string): string | null => {
    try {
      // Handle various YouTube URL formats
      let videoId = '';
      
      if (url.includes('youtube.com/watch')) {
        const match = url.match(/v=([a-zA-Z0-9_-]{11})/);
        videoId = match?.[1] || '';
      } else if (url.includes('youtu.be/')) {
        const match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        videoId = match?.[1] || '';
      } else if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
        videoId = url; // Just the ID
      }

      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch {
      return null;
    }
  };

  const extractInstagramEmbedUrl = (url: string): string | null => {
    try {
      // Instagram embed requires special handling - we'll use the oembed approach
      // For now, we'll use a player that supports Instagram
      if (url.includes('instagram.com/p/') || url.includes('instagram.com/reel/')) {
        return url;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleAddVideo = () => {
    if (!uploadTitle.trim() || !videoUrl.trim()) {
      setError('Please fill in title and video URL');
      return;
    }

    let embedUrl = '';
    let type = videoSource;

    if (videoSource === 'youtube') {
      const extractedUrl = extractYouTubeEmbedUrl(videoUrl);
      if (!extractedUrl) {
        setError('Invalid YouTube URL. Use youtube.com/watch?v=... or youtu.be/...');
        return;
      }
      embedUrl = extractedUrl;
    } else if (videoSource === 'instagram') {
      if (!videoUrl.includes('instagram.com')) {
        setError('Invalid Instagram URL');
        return;
      }
      embedUrl = videoUrl;
    }

    const newVideo: VideoContent = {
      id: `${Date.now()}`,
      title: uploadTitle,
      description: uploadDescription,
      source: embedUrl,
      uploadedBy: 'Anonymous', // Should use actual user
      views: 0,
      platform: videoSource,
    };

    setVideos([newVideo, ...videos]);
    setUploadTitle('');
    setUploadDescription('');
    setVideoUrl('');
    setError(null);
  };

  const renderVideoPlayer = (video: VideoContent) => {
    if (video.platform === 'youtube') {
      return (
        <iframe
          width="100%"
          height="400"
          src={video.source}
          title={video.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="rounded-lg"
        ></iframe>
      );
    } else if (video.platform === 'instagram') {
      return (
        <div className="bg-black rounded-lg p-4 text-center">
          <p className="text-white mb-3">Instagram Reel/Post</p>
          <a
            href={video.source}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Play className="w-4 h-4" />
            Watch on Instagram
          </a>
        </div>
      );
    } else {
      return (
        <video
          src={video.source}
          controls
          className="w-full rounded-lg bg-black"
        />
      );
    }
  };

  return (
    <div className="space-y-4">
      {selectedVideo && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            {renderVideoPlayer(selectedVideo)}
            <div className="mt-4">
              <h2 className="text-xl font-bold text-white">
                {selectedVideo.title}
              </h2>
              {selectedVideo.description && (
                <p className="text-slate-400 text-sm mt-2">
                  {selectedVideo.description}
                </p>
              )}
              <div className="flex gap-4 mt-4 text-slate-400">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{selectedVideo.views} views</span>
                </div>
                <div>by {selectedVideo.uploadedBy}</div>
                <div className="text-xs uppercase px-2 py-1 bg-slate-700 rounded">
                  {selectedVideo.platform || 'local'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Add Video
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Input
            placeholder="Video title"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            className="bg-slate-700 border-slate-600 text-white"
          />

          <Textarea
            placeholder="Video description (optional)"
            value={uploadDescription}
            onChange={(e) => setUploadDescription(e.target.value)}
            className="bg-slate-700 border-slate-600 text-white resize-none min-h-20"
          />

          <div className="space-y-2">
            <label className="text-sm text-slate-300 font-medium">Video Source</label>
            <div className="flex gap-2">
              {(['youtube', 'instagram', 'local'] as const).map((source) => (
                <Button
                  key={source}
                  variant={videoSource === source ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVideoSource(source)}
                  className="flex-1"
                >
                  {source === 'youtube' && '🎬 YouTube'}
                  {source === 'instagram' && '📷 Instagram'}
                  {source === 'local' && '📁 Upload'}
                </Button>
              ))}
            </div>
          </div>

          {videoSource === 'youtube' && (
            <>
              <Input
                placeholder="YouTube URL (youtube.com/watch?v=... or youtu.be/...)"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <p className="text-xs text-slate-400">
                Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ
              </p>
            </>
          )}

          {videoSource === 'instagram' && (
            <>
              <Input
                placeholder="Instagram Reel/Post URL"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
              <p className="text-xs text-slate-400">
                Example: https://www.instagram.com/p/ABC123XYZ/
              </p>
            </>
          )}

          {videoSource === 'local' && (
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 transition">
              <input
                type="file"
                accept="video/*"
                className="hidden"
                id="video-upload"
              />
              <label htmlFor="video-upload" className="cursor-pointer block">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-white">Click or drag video here</p>
                <p className="text-slate-400 text-sm">Max 500MB</p>
              </label>
            </div>
          )}

          <Button
            onClick={handleAddVideo}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {videoSource === 'youtube' ? '🎬 Add YouTube Video' : videoSource === 'instagram' ? '📷 Add Instagram Video' : '📁 Upload Video'}
          </Button>
        </CardContent>
      </Card>

      {videos.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Videos ({videos.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {videos.map((video) => (
              <button
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                  selectedVideo?.id === video.id
                    ? 'bg-blue-600'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                <div className="text-2xl">{video.platform === 'youtube' ? '🎬' : video.platform === 'instagram' ? '📷' : '🎥'}</div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-white font-medium truncate">{video.title}</p>
                  <p className="text-slate-400 text-xs">by {video.uploadedBy}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {videos.length === 0 && !selectedVideo && (
        <Card className="bg-slate-800 border-slate-700 text-center py-12">
          <Play className="w-16 h-16 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">No videos yet</p>
          <p className="text-slate-400 text-sm">
            Add a YouTube, Instagram, or upload a video
          </p>
        </Card>
      )}
    </div>
  );
};

export default VideoHub;
