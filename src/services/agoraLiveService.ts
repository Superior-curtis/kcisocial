/**
 * Agora Live Streaming Service
 * Handles live streaming functionality
 */

import AgoraRTC from 'agora-rtc-sdk-ng';

AgoraRTC.onAutoplayFailed = () => {
  console.warn('Agora autoplay failed');
};

export interface AgoraLiveConfig {
  appId: string;
  token: string;
  channel: string;
  uid: number;
}

class AgoraLiveService {
  private client: AgoraRTC.IAgoraRTCClient | null = null;
  private localAudioTrack: AgoraRTC.IMicrophoneAudioTrack | null = null;
  private localVideoTrack: AgoraRTC.ICameraVideoTrack | null = null;
  private isJoined = false;

  /**
   * Initialize for broadcasting (host)
   */
  async initializeAsBroadcaster(config: AgoraLiveConfig): Promise<void> {
    try {
      this.client = AgoraRTC.createClient({
        mode: 'live',
        codec: 'vp8',
      });

      await this.client.setClientRole('host');

      [this.localAudioTrack, this.localVideoTrack] =
        await AgoraRTC.createMicrophoneAndCameraTracks();

      await this.client.join(config.appId, config.channel, config.token, config.uid);
      this.isJoined = true;

      await this.client.publish([this.localAudioTrack, this.localVideoTrack]);

      this.setupClientListeners();
    } catch (error) {
      console.error('Error initializing as broadcaster:', error);
      throw error;
    }
  }

  /**
   * Initialize for viewing (audience)
   */
  async initializeAsAudience(config: AgoraLiveConfig): Promise<void> {
    try {
      this.client = AgoraRTC.createClient({
        mode: 'live',
        codec: 'vp8',
      });

      await this.client.setClientRole('audience');

      await this.client.join(config.appId, config.channel, config.token, config.uid);
      this.isJoined = true;

      this.setupClientListeners();
    } catch (error) {
      console.error('Error initializing as audience:', error);
      throw error;
    }
  }

  /**
   * Stop broadcasting
   */
  async stopBroadcast(): Promise<void> {
    try {
      if (this.localAudioTrack) {
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }
      if (this.localVideoTrack) {
        this.localVideoTrack.close();
        this.localVideoTrack = null;
      }
      if (this.client && this.isJoined) {
        await this.client.leave();
        this.isJoined = false;
      }
    } catch (error) {
      console.error('Error stopping broadcast:', error);
      throw error;
    }
  }

  /**
   * Enable/disable microphone
   */
  async setAudioEnabled(enabled: boolean): Promise<void> {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(enabled);
    }
  }

  /**
   * Enable/disable video
   */
  async setVideoEnabled(enabled: boolean): Promise<void> {
    if (this.localVideoTrack) {
      await this.localVideoTrack.setEnabled(enabled);
    }
  }

  /**
   * Get local video track
   */
  getLocalVideoTrack() {
    return this.localVideoTrack;
  }

  /**
   * Get Agora client
   */
  getClient() {
    return this.client;
  }

  /**
   * Check if in live stream
   */
  isInLiveStream(): boolean {
    return this.isJoined;
  }

  private setupClientListeners(): void {
    if (!this.client) return;

    this.client.on('user-published', async (user, mediaType) => {
      await this.client?.subscribe(user, mediaType);
      console.log('User published:', user.uid);
    });

    this.client.on('user-unpublished', (user) => {
      console.log('User unpublished:', user.uid);
    });

    this.client.on('user-left', (user) => {
      console.log('User left:', user.uid);
    });

    this.client.on('connection-state-change', (curState, prevState) => {
      console.log('Connection state:', prevState, '->', curState);
    });
  }
}

export const agoraLiveService = new AgoraLiveService();
export default AgoraLiveService;
