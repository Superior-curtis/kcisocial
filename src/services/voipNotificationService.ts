/**
 * VoIP Call Notification Service
 * Monitors incoming calls and notifies users
 */

import { firestore } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

export interface IncomingCall {
  callId: string;
  from: string;
  fromName: string;
  fromAvatar: string;
  callType: 'video' | 'voice';
  timestamp: number;
}

class VoIPNotificationService {
  private unsubscribe: (() => void) | null = null;
  private onIncomingCall: ((call: IncomingCall) => void) | null = null;

  /**
   * Start listening for incoming calls
   */
  startListening(userId: string, onCall: (call: IncomingCall) => void) {
    this.onIncomingCall = onCall;

    // Listen for calls where user is the recipient
    const q = query(
      collection(firestore, 'voip_calls'),
      where('to', '==', userId),
      where('status', '==', 'pending')
    );

    this.unsubscribe = onSnapshot(q, async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const callId = change.doc.id;

          // Get caller info
          const callerDoc = await import('@/lib/firestore').then(m => 
            m.getUserProfile(data.from)
          );

          const incomingCall: IncomingCall = {
            callId,
            from: data.from,
            fromName: callerDoc?.displayName || callerDoc?.username || 'Unknown',
            fromAvatar: callerDoc?.photoURL || '',
            callType: data.callType,
            timestamp: data.timestamp
          };

          // Show notification
          this.showCallNotification(incomingCall);

          // Trigger callback
          if (this.onIncomingCall) {
            this.onIncomingCall(incomingCall);
          }
        }
      });
    });
  }

  /**
   * Show incoming call notification
   */
  private showCallNotification(call: IncomingCall) {
    const icon = call.callType === 'video' ? '📹' : '📞';
    const type = call.callType === 'video' ? 'Video' : 'Voice';

    toast({
      title: `${icon} Incoming ${type} Call`,
      description: `${call.fromName} is calling you...`,
      duration: 30000, // 30 seconds
    });

    // Play notification sound
    this.playNotificationSound();

    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Incoming ${type} Call`, {
        body: `${call.fromName} is calling you`,
        icon: call.fromAvatar || '/logo.png',
        tag: call.callId,
        requireInteraction: true
      });
    }
  }

  /**
   * Play notification sound
   */
  private playNotificationSound() {
    try {
      const audio = new Audio('/notification.mp3');
      audio.loop = true;
      audio.play().catch(() => {
        // Fallback to system sound
        console.log('Could not play notification sound');
      });

      // Stop after 30 seconds
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 30000);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  /**
   * Stop listening for calls
   */
  stopListening() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.onIncomingCall = null;
  }

  /**
   * Decline a call
   */
  async declineCall(callId: string) {
    try {
      const callRef = doc(firestore, 'voip_calls', callId);
      await updateDoc(callRef, {
        status: 'declined'
      });
    } catch (error) {
      console.error('Error declining call:', error);
    }
  }
}

export const voipNotificationService = new VoIPNotificationService();
