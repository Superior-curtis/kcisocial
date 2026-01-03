/**
 * Simple WebRTC VoIP Service
 * Direct peer-to-peer calls without meeting rooms
 */

import { firestore } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';

interface CallOffer {
  from: string;
  to: string;
  offer: RTCSessionDescriptionInit;
  callType: 'video' | 'voice';
  timestamp: number;
}

interface CallAnswer {
  answer: RTCSessionDescriptionInit;
}

class SimpleVoIPService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callId: string | null = null;
  private configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  /**
   * Start a call (caller side)
   */
  async startCall(
    userId: string, 
    recipientId: string, 
    callType: 'video' | 'voice',
    onRemoteStream: (stream: MediaStream) => void
  ): Promise<string> {
    try {
      console.log('[VoIP Service] Starting call:', {userId, recipientId, callType});
      
      // Get local media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });
      console.log('[VoIP Service] Got local stream');

      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.configuration);
      console.log('[VoIP Service] Created peer connection');

      // Add local tracks
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          console.log('[VoIP Service] Adding local track:', track.kind);
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('[VoIP Service] Received remote track:', event.track.kind);
        console.log('[VoIP Service] Streams:', event.streams);
        
        if (event.streams && event.streams[0]) {
          console.log('[VoIP Service] Using stream from event');
          this.remoteStream = event.streams[0];
          onRemoteStream(this.remoteStream);
        } else {
          console.log('[VoIP Service] Creating new stream and adding track');
          if (!this.remoteStream) {
            this.remoteStream = new MediaStream();
          }
          this.remoteStream.addTrack(event.track);
          onRemoteStream(this.remoteStream);
        }
      };

      // Connection state monitoring
      this.peerConnection.onconnectionstatechange = () => {
        console.log('[VoIP Service] Connection state:', this.peerConnection?.connectionState);
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('[VoIP Service] ICE connection state:', this.peerConnection?.iceConnectionState);
      };

      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      console.log('[VoIP Service] Created and set offer');

      // Save offer to Firestore
      const callDoc = await addDoc(collection(firestore, 'voip_calls'), {
        from: userId,
        to: recipientId,
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        callType,
        status: 'pending',
        timestamp: Date.now()
      });

      this.callId = callDoc.id;
      console.log('[VoIP Service] Saved call document:', this.callId);

      // Listen for answer
      onSnapshot(doc(firestore, 'voip_calls', this.callId), async (snapshot) => {
        const data = snapshot.data();
        if (data?.answer && this.peerConnection) {
          console.log('[VoIP Service] Received answer from callee');
          const answer = new RTCSessionDescription(data.answer);
          await this.peerConnection.setRemoteDescription(answer);
        }
        
        // Check if call was ended by other party
        if (data?.status === 'ended' || data?.status === 'declined') {
          console.log('[VoIP Service] Call ended by other party');
          // Will trigger cleanup in component
          if (this.peerConnection) {
            this.peerConnection.close();
          }
        }
      });

      // Handle ICE candidates
      this.peerConnection.onicecandidate = async (event) => {
        if (event.candidate && this.callId) {
          await addDoc(collection(firestore, `voip_calls/${this.callId}/ice_candidates`), {
            candidate: event.candidate.toJSON(),
            from: userId
          });
        }
      };

      // Listen for remote ICE candidates
      onSnapshot(
        query(
          collection(firestore, `voip_calls/${this.callId}/ice_candidates`),
          where('from', '==', recipientId)
        ),
        (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added' && this.peerConnection) {
              const candidate = new RTCIceCandidate(change.doc.data().candidate);
              await this.peerConnection.addIceCandidate(candidate);
            }
          });
        }
      );

      return this.callId;
    } catch (error) {
      console.error('Failed to start call:', error);
      throw error;
    }
  }

  /**
   * Answer a call (recipient side)
   */
  async answerCall(
    callId: string,
    userId: string,
    onRemoteStream: (stream: MediaStream) => void
  ): Promise<void> {
    try {
      console.log('[VoIP Service] Answering call:', callId);
      this.callId = callId;

      // Get call offer
      const callDoc = await getDocs(query(collection(firestore, 'voip_calls'), where('__name__', '==', callId)));
      const callData = callDoc.docs[0]?.data();
      
      if (!callData) {
        console.error('[VoIP Service] Call not found!');
        throw new Error('Call not found');
      }
      
      console.log('[VoIP Service] Found call document:', callData);

      // Get local media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: callData.callType === 'video',
        audio: true
      });
      console.log('[VoIP Service] Got local stream for answer');

      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.configuration);
      console.log('[VoIP Service] Created peer connection for answer');

      // Add local tracks
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          console.log('[VoIP Service] Adding local track for answer:', track.kind);
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('[VoIP Service] Received remote track (answer):', event.track.kind);
        console.log('[VoIP Service] Streams (answer):', event.streams);
        
        if (event.streams && event.streams[0]) {
          console.log('[VoIP Service] Using stream from event (answer)');
          this.remoteStream = event.streams[0];
          onRemoteStream(this.remoteStream);
        } else {
          console.log('[VoIP Service] Creating new stream and adding track (answer)');
          if (!this.remoteStream) {
            this.remoteStream = new MediaStream();
          }
          this.remoteStream.addTrack(event.track);
          onRemoteStream(this.remoteStream);
        }
      };

      // Connection state monitoring
      this.peerConnection.onconnectionstatechange = () => {
        console.log('[VoIP Service] Connection state (answer):', this.peerConnection?.connectionState);
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('[VoIP Service] ICE connection state (answer):', this.peerConnection?.iceConnectionState);
      };

      // Set remote description (offer)
      const offer = new RTCSessionDescription(callData.offer);
      await this.peerConnection.setRemoteDescription(offer);
      console.log('[VoIP Service] Set remote description (offer)');

      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('[VoIP Service] Created and set answer');

      // Save answer
      await updateDoc(doc(firestore, 'voip_calls', callId), {
        answer: {
          type: answer.type,
          sdp: answer.sdp
        },
        status: 'answered'
      });
      console.log('[VoIP Service] Saved answer to Firestore');

      // Handle ICE candidates
      this.peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(collection(firestore, `voip_calls/${callId}/ice_candidates`), {
            candidate: event.candidate.toJSON(),
            from: userId
          });
        }
      };

      // Listen for remote ICE candidates
      onSnapshot(
        query(
          collection(firestore, `voip_calls/${callId}/ice_candidates`),
          where('from', '==', callData.from)
        ),
        (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added' && this.peerConnection) {
              const candidate = new RTCIceCandidate(change.doc.data().candidate);
              await this.peerConnection.addIceCandidate(candidate);
            }
          });
        }
      );
      
      // Listen for call status changes (e.g., ended by caller)
      onSnapshot(doc(firestore, 'voip_calls', callId), (snapshot) => {
        const data = snapshot.data();
        if (data?.status === 'ended' || data?.status === 'declined') {
          console.log('[VoIP Service] Call ended by other party (answer)');
          if (this.peerConnection) {
            this.peerConnection.close();
          }
        }
      });
    } catch (error) {
      console.error('Failed to answer call:', error);
      throw error;
    }
  }

  /**
   * End the call
   */
  async endCall(): Promise<void> {
    console.log('[VoIP Service] Ending call:', this.callId);
    
    // Update Firestore to mark call as ended
    if (this.callId) {
      try {
        await updateDoc(doc(firestore, 'voip_calls', this.callId), {
          status: 'ended',
          endedAt: Date.now()
        });
        console.log('[VoIP Service] Marked call as ended in Firestore');
      } catch (error) {
        console.error('Failed to update call status:', error);
      }
    }
    
    // Stop local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log('[VoIP Service] Stopping local track:', track.kind);
        track.stop();
      });
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Clean up Firestore
    if (this.callId) {
      try {
        await deleteDoc(doc(firestore, 'voip_calls', this.callId));
      } catch (error) {
        console.error('Failed to cleanup call:', error);
      }
      this.callId = null;
    }

    this.remoteStream = null;
  }

  /**
   * Toggle audio mute
   */
  setAudioMuted(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  /**
   * Toggle video
   */
  setVideoEnabled(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
}

export const simpleVoIPService = new SimpleVoIPService();
