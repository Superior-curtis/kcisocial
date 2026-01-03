/**
 * Synchronized Music Room Service
 * Discord-style music bot with synchronized playback
 */

import { firestore } from '@/lib/firebase';
import { doc, setDoc, onSnapshot, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export interface MusicTrack {
  id: string;
  name: string;
  artist?: string;
  album?: string;
  image?: string;
  duration?: number;
  previewUrl?: string;
  spotifyUrl?: string;
  kkboxUrl?: string;
  lyrics?: string[];
  addedBy: string;
  addedAt: number;
}

export interface MusicRoomState {
  clubId: string;
  currentTrack: MusicTrack | null;
  queue: MusicTrack[];
  isPlaying: boolean;
  currentTime: number;
  startedAt: number | null;
  listeners: string[];
}

class SyncMusicService {
  private roomId: string | null = null;
  private unsubscribe: (() => void) | null = null;

  /**
   * Join or create a music room
   */
  async joinRoom(clubId: string, userId: string, onStateChange: (state: MusicRoomState) => void): Promise<void> {
    this.roomId = `music_room_${clubId}`;

    // Listen to room state
    this.unsubscribe = onSnapshot(
      doc(firestore, 'music_rooms', this.roomId),
      (snapshot) => {
        if (snapshot.exists()) {
          const state = snapshot.data() as MusicRoomState;
          onStateChange(state);
        } else {
          // Initialize room
          const initialState: MusicRoomState = {
            clubId,
            currentTrack: null,
            queue: [],
            isPlaying: false,
            currentTime: 0,
            startedAt: null,
            listeners: []
          };
          setDoc(doc(firestore, 'music_rooms', this.roomId), initialState);
          onStateChange(initialState);
        }
      }
    );

    // Add user to listeners
    await this.addListener(userId);
  }

  /**
   * Add track to queue
   */
  async addToQueue(track: MusicTrack, userId: string): Promise<void> {
    if (!this.roomId) return;

    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await (await import('firebase/firestore')).getDoc(roomRef);
    const roomData = roomDoc.data() as MusicRoomState;

    const newTrack = { ...track, addedBy: userId, addedAt: Date.now() };

    if (!roomData.currentTrack) {
      // No track playing, start immediately
      await updateDoc(roomRef, {
        currentTrack: newTrack,
        isPlaying: true,
        currentTime: 0,
        startedAt: Date.now()
      });
    } else {
      // Add to queue
      await updateDoc(roomRef, {
        queue: [...roomData.queue, newTrack]
      });
    }
  }

  /**
   * Play/pause
   */
  async togglePlayPause(): Promise<void> {
    if (!this.roomId) return;

    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await (await import('firebase/firestore')).getDoc(roomRef);
    const roomData = roomDoc.data() as MusicRoomState;

    if (roomData.isPlaying) {
      // Pause - save current time
      const elapsed = Date.now() - (roomData.startedAt || 0);
      await updateDoc(roomRef, {
        isPlaying: false,
        currentTime: roomData.currentTime + elapsed,
        startedAt: null
      });
    } else {
      // Play - resume from current time
      await updateDoc(roomRef, {
        isPlaying: true,
        startedAt: Date.now()
      });
    }
  }

  /**
   * Skip to next track
   */
  async skipTrack(): Promise<void> {
    if (!this.roomId) return;

    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await (await import('firebase/firestore')).getDoc(roomRef);
    const roomData = roomDoc.data() as MusicRoomState;

    if (roomData.queue.length > 0) {
      const [nextTrack, ...remainingQueue] = roomData.queue;
      await updateDoc(roomRef, {
        currentTrack: nextTrack,
        queue: remainingQueue,
        currentTime: 0,
        startedAt: Date.now(),
        isPlaying: true
      });
    } else {
      await updateDoc(roomRef, {
        currentTrack: null,
        isPlaying: false,
        currentTime: 0,
        startedAt: null
      });
    }
  }

  /**
   * Remove track from queue
   */
  async removeFromQueue(trackId: string): Promise<void> {
    if (!this.roomId) return;

    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await (await import('firebase/firestore')).getDoc(roomRef);
    const roomData = roomDoc.data() as MusicRoomState;

    await updateDoc(roomRef, {
      queue: roomData.queue.filter(t => t.id !== trackId)
    });
  }

  /**
   * Clear queue
   */
  async clearQueue(): Promise<void> {
    if (!this.roomId) return;

    await updateDoc(doc(firestore, 'music_rooms', this.roomId), {
      queue: []
    });
  }

  /**
   * Add listener
   */
  private async addListener(userId: string): Promise<void> {
    if (!this.roomId) return;

    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await (await import('firebase/firestore')).getDoc(roomRef);
    const roomData = roomDoc.data() as MusicRoomState;

    if (!roomData.listeners.includes(userId)) {
      await updateDoc(roomRef, {
        listeners: [...roomData.listeners, userId]
      });
    }
  }

  /**
   * Remove listener
   */
  async removeListener(userId: string): Promise<void> {
    if (!this.roomId) return;

    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await (await import('firebase/firestore')).getDoc(roomRef);
    const roomData = roomDoc.data() as MusicRoomState;

    await updateDoc(roomRef, {
      listeners: roomData.listeners.filter(id => id !== userId)
    });
  }

  /**
   * Get lyrics for current track
   */
  async fetchLyrics(trackName: string, artist: string): Promise<string[]> {
    try {
      // Use lyrics API (e.g., lyrics.ovh or similar)
      const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(trackName)}`);
      if (!response.ok) return [];
      
      const data = await response.json();
      if (data.lyrics) {
        return data.lyrics.split('\n').filter((line: string) => line.trim());
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch lyrics:', error);
      return [];
    }
  }

  /**
   * Calculate synchronized playback position
   */
  getSyncedPosition(roomState: MusicRoomState): number {
    if (!roomState.isPlaying || !roomState.startedAt) {
      return roomState.currentTime;
    }
    const elapsed = Date.now() - roomState.startedAt;
    return roomState.currentTime + elapsed;
  }

  /**
   * Leave room
   */
  async leaveRoom(userId: string): Promise<void> {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.roomId) {
      await this.removeListener(userId);
      this.roomId = null;
    }
  }
}

export const syncMusicService = new SyncMusicService();
