/**
 * Voice Message Recording Service
 * Handles audio recording and playback for voice messages
 */

export interface VoiceMessageData {
  blob: Blob;
  duration: number;
  timestamp: Date;
}

class VoiceMessageService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingStartTime: number = 0;
  private recordingDuration: number = 0;

  /**
   * Request microphone permission and start recording
   */
  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.recordingStartTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording and return the audio blob
   */
  async stopRecording(): Promise<VoiceMessageData> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recording not started'));
        return;
      }

      this.recordingDuration =
        (Date.now() - this.recordingStartTime) / 1000;

      this.mediaRecorder.onstop = () => {
        // Stop all tracks
        this.mediaRecorder?.stream
          .getTracks()
          .forEach((track) => track.stop());

        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        resolve({
          blob,
          duration: this.recordingDuration,
          timestamp: new Date(),
        });
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Cancel recording
   */
  cancelRecording(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream
        .getTracks()
        .forEach((track) => track.stop());
      this.mediaRecorder = null;
      this.audioChunks = [];
    }
  }

  /**
   * Get current recording duration
   */
  getRecordingDuration(): number {
    if (!this.mediaRecorder) return 0;
    return (Date.now() - this.recordingStartTime) / 1000;
  }

  /**
   * Play audio from blob or URL
   */
  playAudio(
    source: Blob | string,
    onEnded?: () => void
  ): HTMLAudioElement {
    const audio = new Audio();

    if (source instanceof Blob) {
      audio.src = URL.createObjectURL(source);
    } else {
      audio.src = source;
    }

    if (onEnded) {
      audio.addEventListener('ended', onEnded);
    }

    audio.play();
    return audio;
  }

  /**
   * Pause audio
   */
  pauseAudio(audio: HTMLAudioElement): void {
    audio.pause();
  }

  /**
   * Resume audio
   */
  resumeAudio(audio: HTMLAudioElement): void {
    audio.play();
  }

  /**
   * Convert blob to base64 for Firebase upload
   */
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Format duration to MM:SS
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export const voiceMessageService = new VoiceMessageService();
export default VoiceMessageService;
