/**
 * Jitsi Meet Service
 * Provides video/voice calling functionality using Jitsi (free, unlimited)
 */

export interface JitsiConfig {
  roomName: string;
  displayName: string;
  userEmail?: string;
  avatarUrl?: string;
}

class JitsiService {
  private jitsiApi: any = null;
  private isInitialized = false;

  /**
   * Initialize Jitsi Meet
   */
  async initializeJitsi() {
    return new Promise((resolve, reject) => {
      if (!window.JitsiMeetExternalAPI) {
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => {
          this.isInitialized = true;
          resolve(true);
        };
        script.onerror = () => {
          reject(new Error('Failed to load Jitsi API'));
        };
        document.head.appendChild(script);
      } else {
        this.isInitialized = true;
        resolve(true);
      }
    });
  }

  /**
   * Start a video call
   */
  async startVideoCall(
    config: JitsiConfig,
    containerId: string
  ): Promise<any> {
    if (!this.isInitialized) {
      await this.initializeJitsi();
    }

    const options = {
      roomName: config.roomName,
      width: '100%',
      height: '100%',
      parentNode: document.getElementById(containerId),
      userInfo: {
        displayName: config.displayName,
        email: config.userEmail,
        avatarUrl: config.avatarUrl,
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableH264: false,
        enableNoAudioDetection: true,
        enableNoisyMicDetection: true,
        p2p: {
          enabled: true,
          stunServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ]
        },
        prejoinPageEnabled: false,
        requireDisplayName: false,
      },
      interfaceConfigOverwrite: {
        DISABLE_AUDIO_LEVELS: false,
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
          'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
          'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
          'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
        ],
      },
    };

    try {
      this.jitsiApi = new (window as any).JitsiMeetExternalAPI(
        'meet.jit.si',
        options
      );

      return this.jitsiApi;
    } catch (error) {
      console.error('Error starting Jitsi call:', error);
      throw error;
    }
  }

  /**
   * End the current call
   */
  async endCall() {
    if (this.jitsiApi) {
      this.jitsiApi.dispose();
      this.jitsiApi = null;
    }
  }

  /**
   * Mute/unmute audio
   */
  async setAudioMuted(muted: boolean) {
    if (this.jitsiApi) {
      this.jitsiApi.executeCommand('toggleAudio', !muted);
    }
  }

  /**
   * Enable/disable video
   */
  async setVideoMuted(muted: boolean) {
    if (this.jitsiApi) {
      this.jitsiApi.executeCommand('toggleVideo', !muted);
    }
  }

  /**
   * Get current API instance
   */
  getApi() {
    return this.jitsiApi;
  }
}

export const jitsiService = new JitsiService();
export default JitsiService;
