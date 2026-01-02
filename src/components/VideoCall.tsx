import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { jitsiService } from '@/services/jitsiService';

interface VideoCallProps {
  recipientId: string;
  recipientName: string;
  userId: string;
  userName: string;
  onEndCall: () => void;
  callType: 'video' | 'voice';
}

const VideoCall: React.FC<VideoCallProps> = ({
  recipientId,
  recipientName,
  userId,
  userName,
  onEndCall,
  callType,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const initCall = async () => {
      try {
        await jitsiService.initializeJitsi();

        // Generate unique room name
        const roomName = `kcis-${userId}-${recipientId}-${Date.now()}`;

        if (containerRef.current) {
          await jitsiService.startVideoCall(
            {
              roomName,
              displayName: userName,
            },
            containerRef.current.id
          );
        }
      } catch (error) {
        console.error('Error initializing call:', error);
      }
    };

    if (containerRef.current) {
      initCall();
    }

    // Timer
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [userId, recipientId, userName]);

  const handleEndCall = async () => {
    await jitsiService.endCall();
    onEndCall();
  };

  const handleToggleMute = async () => {
    await jitsiService.setAudioMuted(!isMuted);
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = async () => {
    await jitsiService.setVideoMuted(!isVideoOn);
    setIsVideoOn(!isVideoOn);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <div
          id="jitsi-container"
          ref={containerRef}
          className="bg-black rounded-lg overflow-hidden shadow-2xl"
          style={{ height: '600px' }}
        />

        {/* Controls */}
        <div className="bg-slate-900 p-4 flex items-center justify-center gap-4">
          <div className="text-white text-sm">
            {recipientName} • {formatDuration(duration)}
          </div>

          <Button
            size="lg"
            variant={isMuted ? 'destructive' : 'default'}
            className="rounded-full w-12 h-12 p-0"
            onClick={handleToggleMute}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </Button>

          {callType === 'video' && (
            <Button
              size="lg"
              variant={!isVideoOn ? 'destructive' : 'default'}
              className="rounded-full w-12 h-12 p-0"
              onClick={handleToggleVideo}
            >
              {isVideoOn ? (
                <Video className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
            </Button>
          )}

          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-12 h-12 p-0"
            onClick={handleEndCall}
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
