import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { simpleVoIPService } from '@/services/simpleVoIPService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SimpleVoIPCallProps {
  userId: string;
  userName: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  callType: 'video' | 'voice';
  isIncoming?: boolean;
  callId?: string;
  onEndCall: () => void;
  onDecline?: () => void;
}

const SimpleVoIPCall: React.FC<SimpleVoIPCallProps> = ({
  userId,
  userName,
  recipientId,
  recipientName,
  recipientAvatar,
  callType,
  isIncoming = false,
  callId,
  onEndCall,
  onDecline
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [duration, setDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callStarted, setCallStarted] = useState(false);

  useEffect(() => {
    const initCall = async () => {
      try {
        console.log('[VoIP] Initializing call, isIncoming:', isIncoming, 'callId:', callId);
        
        if (isIncoming && callId) {
          // Answer incoming call
          console.log('[VoIP] Answering incoming call:', callId);
          await simpleVoIPService.answerCall(callId, userId, (remoteStream) => {
            console.log('[VoIP] Received remote stream, tracks:', remoteStream.getTracks().length);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              console.log('[VoIP] Set remote video srcObject');
              // Force play
              remoteVideoRef.current.play().catch(e => console.error('[VoIP] Remote play error:', e));
            }
            setIsConnected(true);
          });
        } else if (!isIncoming) {
          // Start outgoing call
          console.log('[VoIP] Starting outgoing call to:', recipientId);
          const newCallId = await simpleVoIPService.startCall(userId, recipientId, callType, (remoteStream) => {
            console.log('[VoIP] Received remote stream, tracks:', remoteStream.getTracks().length);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              console.log('[VoIP] Set remote video srcObject');
              // Force play
              remoteVideoRef.current.play().catch(e => console.error('[VoIP] Remote play error:', e));
            }
            setIsConnected(true);
          });
          console.log('[VoIP] Call started with ID:', newCallId);
        }

        // Set local stream
        const localStream = simpleVoIPService.getLocalStream();
        console.log('[VoIP] Local stream:', localStream, 'tracks:', localStream?.getTracks().length);
        if (localStream && localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.muted = true; // Prevent echo
          console.log('[VoIP] Set local video srcObject');
          // Force play
          localVideoRef.current.play().catch(e => console.error('[VoIP] Local play error:', e));
        }

        setCallStarted(true);
      } catch (error) {
        console.error('[VoIP] Call failed:', error);
        onEndCall();
      }
    };

    // Run initialization only once when component mounts
    initCall();

    // Timer - starts immediately after call is initiated
    const interval = setInterval(() => {
      if (callStarted) {
        setDuration(prev => prev + 1);
      }
    }, 1000);
    
    // Monitor for call termination from Firestore
    let unsubscribeCall: (() => void) | undefined;
    
    const setupCallMonitor = async () => {
      if (callId) {
        const { onSnapshot, doc } = await import('firebase/firestore');
        const { firestore } = await import('@/lib/firebase');
        
        unsubscribeCall = onSnapshot(doc(firestore, 'voip_calls', callId), (snapshot) => {
          const data = snapshot.data();
          if (data?.status === 'ended' || data?.status === 'declined') {
            console.log('[VoIP] Call ended by other party, closing...');
            onEndCall();
          }
        });
      }
    };
    
    setupCallMonitor();

    return () => {
      clearInterval(interval);
      if (unsubscribeCall) unsubscribeCall();
    };
  }, []); // Run only once on mount

  const handleEndCall = async () => {
    await simpleVoIPService.endCall();
    onEndCall();
  };

  const handleAnswer = () => {
    setIsAnswered(true);
  };

  const handleDecline = async () => {
    if (onDecline) {
      onDecline();
    }
    await simpleVoIPService.endCall();
    onEndCall();
  };

  const handleToggleMute = () => {
    simpleVoIPService.setAudioMuted(!isMuted);
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    simpleVoIPService.setVideoEnabled(isVideoOn);
    setIsVideoOn(!isVideoOn);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`fixed inset-0 z-50 bg-gradient-to-br from-slate-900 to-black flex items-center justify-center ${isFullscreen ? '' : 'p-4'}`}>
      <div className={`w-full ${isFullscreen ? 'h-full' : 'max-w-4xl h-[600px]'} relative rounded-2xl overflow-hidden shadow-2xl`}>
        {/* Remote Video */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
          {callType === 'video' && isConnected ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <Avatar className="w-32 h-32 mb-4">
                <AvatarImage src={recipientAvatar} />
                <AvatarFallback className="text-4xl bg-primary/20">
                  {recipientName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-white text-3xl font-bold mb-2">{recipientName}</h2>
              <p className="text-white/60 text-lg">
                {!callStarted ? (isIncoming ? 'Incoming call...' : 'Calling...') : 
                 !isConnected ? 'Connecting...' : 
                 callType === 'voice' ? '🎤 Voice Call' : '📹 Video Call'}
              </p>
              {callStarted && (
                <p className="text-white/80 text-2xl font-mono mt-4">{formatDuration(duration)}</p>
              )}
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        {callType === 'video' && isVideoOn && (
          <div className="absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white/30 shadow-xl bg-black">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
            <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
              You
            </div>
          </div>
        )}

        {/* Call Status Bar */}
        {callStarted && (
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
              <span className="text-sm font-medium">{formatDuration(duration)}</span>
              {!isConnected && <span className="text-xs text-white/60">Connecting...</span>}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6">
          {!isAnswered && isIncoming ? (
            // Incoming call buttons
            <div className="flex items-center justify-center gap-6">
              <Button
                size="lg"
                variant="destructive"
                className="rounded-full w-16 h-16"
                onClick={handleDecline}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
              <Button
                size="lg"
                className="rounded-full w-20 h-20 bg-green-600 hover:bg-green-700"
                onClick={handleAnswer}
              >
                <Phone className="w-8 h-8" />
              </Button>
            </div>
          ) : (
            // Active call controls
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                variant={isMuted ? 'destructive' : 'secondary'}
                className="rounded-full w-14 h-14"
                onClick={handleToggleMute}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              {callType === 'video' && (
                <Button
                  size="lg"
                  variant={isVideoOn ? 'secondary' : 'destructive'}
                  className="rounded-full w-14 h-14"
                  onClick={handleToggleVideo}
                >
                  {isVideoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </Button>
              )}

              <Button
                size="lg"
                variant="destructive"
                className="rounded-full w-16 h-16"
                onClick={handleEndCall}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>

              <Button
                size="lg"
                variant="ghost"
                className="rounded-full w-14 h-14 text-white"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize2 className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
};

export default SimpleVoIPCall;
