import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC, { IAgoraRTCClient, ILocalAudioTrack, ILocalVideoTrack, IRemoteAudioTrack, IRemoteVideoTrack, UID } from 'agora-rtc-sdk-ng';
import { PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { firestore } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface SimpleVoIPCallProps {
  userId: string;
  userName: string;
  recipientId?: string;
  recipientName?: string;
  recipientAvatar?: string;
  callType: 'video' | 'voice';
  isIncoming?: boolean;
  callId?: string;
  agoraToken?: string;
  onEndCall: () => void;
  onDecline?: () => void;
  roomUrl?: string; // unused for Agora, kept for signature compatibility
  isGroupCall?: boolean;
  groupId?: string;
}

const SimpleVoIPCall: React.FC<SimpleVoIPCallProps> = ({
  userId,
  userName,
  recipientId = '',
  recipientName = '',
  recipientAvatar,
  callType,
  isIncoming = false,
  callId,
  agoraToken,
  onEndCall,
  onDecline,
  roomUrl,
  isGroupCall = false,
  groupId = ''
}) => {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioRef = useRef<ILocalAudioTrack | null>(null);
  const localVideoRef = useRef<ILocalVideoTrack | null>(null);
  const remoteAudioRef = useRef<IRemoteAudioTrack | null>(null);
  const remoteVideoTrackRef = useRef<IRemoteVideoTrack | null>(null);
  const remoteVideoEl = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(callType === 'video');
  const [joinedChannel, setJoinedChannel] = useState<string>('');

  const appId = import.meta.env.VITE_AGORA_APP_ID || '654ea99178ee4300aa202c44f0f554ba';
  // Use no-token mode (null) - requires App Certificate disabled in Agora console
  // Only use agoraToken if explicitly passed in props (for per-call tokens from backend)
  const token = agoraToken || null;
  const callIdRef = useRef<string>(callId || '');

  // Create a short, deterministic channel name from callId (max 64 bytes, alphanumeric + -_)
  const createChannelName = (baseId: string): string => {
    if (!baseId) return 'media';
    // Hash the callId to create a short, unique name
    let hash = 0;
    for (let i = 0; i < baseId.length; i++) {
      const char = baseId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
    }
    const channelName = `call_${Math.abs(hash % 1000000000)}`;
    return channelName.substring(0, 64);
  };

  const channel = createChannelName(callId || import.meta.env.VITE_AGORA_CHANNEL || '');

  useEffect(() => {
    const initCall = async () => {
      try {
        setInitError(null);
        // Debug: log channel info
        console.log('[VoIP] Call Info:', {
          userId,
          recipientId,
          callId,
          isIncoming,
          isGroupCall,
          groupId,
          channel,
          appId
        });

        // Create or update the Firestore voip_calls document (only if not incoming)
        if (!isIncoming) {
          try {
            const callDocId = callId || `${userId}_${recipientId}_${Date.now()}`;
            callIdRef.current = callDocId;

            const callDocRef = doc(firestore, 'voip_calls', callDocId);
            
            let callData: any = {
              callType: callType,
              status: 'pending',
              timestamp: serverTimestamp(),
              channel: channel,
              initiatedBy: userId,
            };

            if (isGroupCall && groupId) {
              // Group call
              callData.groupId = groupId;
              callData.type = 'group';
            } else if (recipientId) {
              // 1-on-1 call
              callData.from = userId;
              callData.to = recipientId;
              callData.type = '1-on-1';
            }

            // Use setDoc with merge to create with specific document ID
            await setDoc(callDocRef, callData, { merge: true });

            console.log('[VoIP] Call document created:', callDocId);
          } catch (error) {
            console.error('[VoIP] Failed to create call document:', error);
          }
        }

        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        client.on('user-published', async (user, mediaType) => {
          console.log('[VoIP] Remote user published:', { userId: user.uid, mediaType });
          await client.subscribe(user, mediaType);
          if (mediaType === 'audio') {
            const audioTrack = user.audioTrack as IRemoteAudioTrack;
            console.log('[VoIP] Playing remote audio:', user.uid);
            remoteAudioRef.current = audioTrack;
            audioTrack.play().catch(e => console.error('[VoIP] Audio play failed:', e));
          }
          if (mediaType === 'video') {
            const videoTrack = user.videoTrack as IRemoteVideoTrack;
            remoteVideoTrackRef.current = videoTrack;
            if (remoteVideoEl.current) {
              videoTrack.play(remoteVideoEl.current);
            }
          }
        });

        client.on('user-unpublished', (user, mediaType) => {
          console.log('[VoIP] Remote user unpublished:', { userId: user.uid, mediaType });
          if (mediaType === 'video' && remoteVideoTrackRef.current) {
            remoteVideoTrackRef.current.stop();
            remoteVideoTrackRef.current = null;
          }
          if (mediaType === 'audio' && remoteAudioRef.current) {
            remoteAudioRef.current.stop();
            remoteAudioRef.current = null;
          }
        });
        console.log('[Agora] Joining channel:', channel, 'appId:', appId, 'token:', token ? 'yes' : 'no');
        const uid = await client.join(appId, channel, token, null as unknown as UID);
        console.log('[Agora] Successfully joined channel:', channel, 'with uid:', uid);

        const tracks: (ILocalAudioTrack | ILocalVideoTrack)[] = [];
        const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
          { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          videoOn ? { encoderConfig: '720p' } : undefined
        );

        localAudioRef.current = micTrack;
        tracks.push(micTrack);

        if (videoOn && camTrack) {
          localVideoRef.current = camTrack;
          tracks.push(camTrack);
          if (remoteVideoEl.current) {
            camTrack.play(remoteVideoEl.current);
          }
        }

        await client.publish(tracks);
        setJoinedChannel(String(channel));
        setIsConnected(true);
        setCallStarted(true);

        console.log('[Agora] Joined with uid', uid);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Agora] Call failed:', errorMsg, error);
        setInitError(errorMsg);
      }
    };

    initCall();
    return () => {
      const client = clientRef.current;
      if (client) {
        client.leave().catch(() => undefined);
      }
      if (localAudioRef.current) {
        localAudioRef.current.stop();
        localAudioRef.current.close();
      }
      if (localVideoRef.current) {
        localVideoRef.current.stop();
        localVideoRef.current.close();
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.stop();
      }
      if (remoteVideoTrackRef.current) {
        remoteVideoTrackRef.current.stop();
      }
    };
  }, [appId, channel, token]);

  // Timer - starts when connection is established
  useEffect(() => {
    if (!isConnected) return;

    console.log('[VoIP] Starting timer, isConnected:', isConnected);
    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => {
      console.log('[VoIP] Clearing timer');
      clearInterval(interval);
    };
  }, [isConnected]);

  const handleEndCall = async () => {
    const client = clientRef.current;
    if (client) {
      await client.leave().catch(() => undefined);
    }
    if (localAudioRef.current) {
      localAudioRef.current.stop();
      localAudioRef.current.close();
    }
    if (localVideoRef.current) {
      localVideoRef.current.stop();
      localVideoRef.current.close();
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.stop();
    }
    if (remoteVideoTrackRef.current) {
      remoteVideoTrackRef.current.stop();
    }

    // Update call status to 'completed' in Firestore
    if (callIdRef.current) {
      try {
        const callDocRef = doc(firestore, 'voip_calls', callIdRef.current);
        await updateDoc(callDocRef, {
          status: 'completed',
          endTime: serverTimestamp(),
          duration: duration,
        }).catch(() => {
          // Document might not exist, ignore error
        });
      } catch (error) {
        console.error('[VoIP] Failed to update call status:', error);
      }
    }

    onEndCall();
  };

  const toggleMute = async () => {
    const audio = localAudioRef.current;
    if (!audio) return;
    const next = !muted;
    await audio.setEnabled(!next);
    setMuted(next);
  };

  const toggleVideo = async () => {
    const video = localVideoRef.current;
    if (!video) return;
    const next = !videoOn;
    await video.setEnabled(!next);
    setVideoOn(!next);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 to-black flex items-center justify-center p-4">
      {initError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md text-center">
            <h3 className="text-white text-lg font-semibold mb-2">Call Failed</h3>
            <p className="text-white/70 mb-4">{initError}</p>
            <Button onClick={handleEndCall} variant="destructive" className="w-full">
              Close
            </Button>
          </div>
        </div>
      )}

      <div className="w-full max-w-5xl h-[720px] relative rounded-2xl overflow-hidden shadow-2xl bg-black">
        <div ref={remoteVideoEl} className="absolute inset-0" />

        {callStarted && (
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-4 py-2 rounded-full text-white flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-sm font-medium">{formatDuration(duration)}</span>
            {!isConnected && <span className="text-xs text-white/60">Connecting...</span>}
            {joinedChannel && <span className="text-xs text-white/60">{joinedChannel}</span>}
          </div>
        )}

        <div className="absolute bottom-4 right-4 flex gap-3">
          <Button size="lg" variant={muted ? 'destructive' : 'secondary'} className="rounded-full px-4" onClick={toggleMute}>
            {muted ? 'Unmute' : 'Mute'}
          </Button>
          {localVideoRef.current && (
            <Button size="lg" variant={videoOn ? 'secondary' : 'destructive'} className="rounded-full px-4" onClick={toggleVideo}>
              {videoOn ? 'Video Off' : 'Video On'}
            </Button>
          )}
          <Button size="lg" variant="destructive" className="rounded-full w-14 h-14" onClick={handleEndCall}>
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SimpleVoIPCall;
