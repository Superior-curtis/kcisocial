import React, { useState } from 'react';
import { Upload, Play, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { VideoContent } from '@/types';

const VideoHub: React.FC = () => {
  const [videos, setVideos] = useState<VideoContent[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoContent | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && uploadTitle.trim()) {
      // TODO: Upload to Firebase Storage
      console.log('Uploading:', uploadTitle);
    }
  };

  return (
    <div className="space-y-4">
      {selectedVideo && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <video
              src={selectedVideo.source}
              controls
              className="w-full rounded-lg bg-black"
            />
            <div className="mt-4">
              <h2 className="text-xl font-bold text-white">
                {selectedVideo.title}
              </h2>
              <p className="text-slate-400 text-sm mt-2">
                {selectedVideo.description}
              </p>
              <div className="flex gap-4 mt-4 text-slate-400">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{selectedVideo.views} views</span>
                </div>
                <div>by {selectedVideo.uploadedBy}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Video
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Video title"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            className="bg-slate-700 border-slate-600 text-white"
          />
          <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 transition">
            <input
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
              id="video-upload"
            />
            <label htmlFor="video-upload" className="cursor-pointer block">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-white">Click or drag video here</p>
              <p className="text-slate-400 text-sm">Max 500MB</p>
            </label>
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700">
            Upload Video
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoHub;
