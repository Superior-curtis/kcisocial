/**
 * VoIP Call Notification Service
 * Monitors incoming calls and notifies users
 */

import { firestore } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, limit } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { getGroupInfo } from '@/lib/firestore';

export interface IncomingCall {
  callId: string;
  from: string;
  fromName: string;
  fromAvatar: string;
  callType: 'video' | 'voice';
  timestamp: number;
  groupId?: string;
}

class VoIPNotificationService {
  private unsubscribe: (() => void) | null = null;
  private onIncomingCall: ((call: IncomingCall) => void) | null = null;

  /**
   * Start listening for incoming calls
   */
  startListening(userId: string, onCall: (call: IncomingCall) => void) {
    this.onIncomingCall = onCall;

    // Listen for all pending calls (both 1-on-1 and group)
    const q = query(
      collection(firestore, 'voip_calls'),
      where('status', '==', 'pending'),
      limit(100)
    );

    this.unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const callId = change.doc.id;

          console.log('[VoIPNotificationService] Incoming call detected:', callId);

          // Check if this is a 1-on-1 call or group call
          const isForThisUser = data.to === userId || (data.type === 'group' && data.groupId);
          
          if (!isForThisUser) {
            return; // Not for this user
          }

          // For group calls, check if user is a member
          if (data.type === 'group' && data.groupId) {
            try {
              const groupInfo = await getGroupInfo(data.groupId);
              if (!groupInfo || !groupInfo.members.includes(userId)) {
                return; // User is not a member of this group
              }
            } catch (error) {
              console.error('[VoIPNotificationService] Error checking group membership:', error);
              return;
            }
          }

          // Get caller info
          try {
            const callerDoc = await import('@/lib/firestore').then(m => 
              m.getUserProfile(data.from)
            );

            const incomingCall: IncomingCall = {
              callId,
              from: data.from,
              fromName: callerDoc?.displayName || callerDoc?.username || 'Unknown',
              fromAvatar: (callerDoc as any)?.avatar || (callerDoc as any)?.['photoURL'] || (callerDoc as any)?.profileImageUrl || '',
              callType: data.callType,
              timestamp: data.timestamp,
              groupId: data.groupId
            };

            console.log('[VoIPNotificationService] Triggering callback with:', incomingCall);

            // Show notification
            this.showCallNotification(incomingCall);

            // Trigger callback
            if (this.onIncomingCall) {
              this.onIncomingCall(incomingCall);
            }
          } catch (error) {
            console.error('[VoIPNotificationService] Error processing incoming call:', error);
          }
        }
      });
      },
      (error) => {
        console.error('[VoIPNotificationService] Listener error:', error);
        // Stop to avoid thrashing when backend is in backoff/quota exceeded
        this.stopListening();
      },
    );
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
