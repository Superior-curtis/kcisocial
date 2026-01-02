import React, { useState } from 'react';
import { Radio, Play, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LiveStream } from '@/types';

const LiveStreamHub: React.FC = () => {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');

  const handleStartStream = async () => {
    if (!streamTitle.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsStreaming(true);
    // TODO: Initialize Agora live streaming
    console.log('Starting live stream:', streamTitle);
  };

  const handleEndStream = () => {
    setIsStreaming(false);
    // TODO: End Agora live streaming
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-red-600 to-red-700 border-0">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Radio className="w-6 h-6" />
            Go Live
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isStreaming ? (
            <div className="space-y-4">
              <Input
                placeholder="Stream title"
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                className="bg-white/20 border-white/30 text-white placeholder-white/50"
              />
              <textarea
                placeholder="Description (optional)"
                value={streamDescription}
                onChange={(e) => setStreamDescription(e.target.value)}
                className="w-full bg-white/20 border border-white/30 text-white placeholder-white/50 rounded px-3 py-2"
                rows={3}
              />
              <Button
                className="w-full bg-white text-red-600 hover:bg-slate-100 text-lg py-6"
                onClick={handleStartStream}
              >
                <Radio className="w-5 h-5 mr-2" />
                Start Live Stream
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                <p className="text-white font-bold">Streaming: {streamTitle}</p>
              </div>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleEndStream}
              >
                End Stream
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {liveStreams.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Active Streams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveStreams.map((stream) => (
              <div
                key={stream.id}
                className="flex items-center gap-3 p-3 bg-slate-700 rounded hover:bg-slate-600 transition"
              >
                <div className="flex-1">
                  <p className="text-white font-medium">{stream.title}</p>
                  <p className="text-slate-400 text-sm">
                    {stream.broadcasterId}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Users className="w-4 h-4" />
                  <span>{stream.viewerCount}</span>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiveStreamHub;
