/**
 * Synchronized Music Room Service
 * Discord-style music bot with synchronized playback
 */

import { firestore } from '@/lib/firebase';
import {
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

// Reduce Firestore read/write pressure (helps avoid resource-exhausted backoff)
const HEARTBEAT_INTERVAL_MS = 30000;
const LISTENER_STALE_MS = 90000;

export interface MusicTrack {
  id: string;
  name: string;
  artist?: string;
  album?: string;
  image?: string;
  duration?: number; // seconds
  previewUrl?: string;
  spotifyUrl?: string;
  kkboxUrl?: string;
  youtubeUrl?: string;
  youtubeId?: string;
  youtubeEmbed?: string;
  lyrics?: string[];
  addedBy: string;
  addedAt: number;
}

export interface ListenerInfo {
  userId: string;
  userName?: string;
  avatar?: string;
  joinedAt: number;
  lastActiveAt?: number;
}

export interface MusicRoomState {
  clubId: string;
  currentTrack: MusicTrack | null;
  queue: MusicTrack[];
  isPlaying: boolean;
  currentTime: number; // ms
  startedAt: number | null; // server ms when play started
  listeners: string[] | ListenerInfo[];
  shuffleEnabled: boolean;
  repeatMode: 'off' | 'one' | 'all';
  creatorId?: string;
  joinMode?: 'free' | 'invite';
  playHistory?: MusicTrack[];

  // Permissions
  controlMusic?: 'owner' | 'all';
  controlQueue?: 'owner' | 'all';
}

class SyncMusicService {
  private roomId: string | null = null;
  private unsubscribe: (() => void) | null = null;
  private currentUserId: string | null = null;
  private hasAddedListener = false;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private serverTimeOffsetMs = 0;

  private async resolveRoomDocId(roomKey: string): Promise<string> {
    const rawKey = (roomKey || '').trim();
    if (!rawKey) return '';

    const candidateIds = new Set<string>();
    if (rawKey.startsWith('music_room_')) {
      candidateIds.add(rawKey);
      candidateIds.add(rawKey.slice('music_room_'.length));
    } else {
      candidateIds.add(rawKey);
      candidateIds.add(`music_room_${rawKey}`);
    }

    for (const id of candidateIds) {
      if (!id) continue;
      try {
        const snap = await getDoc(doc(firestore, 'music_rooms', id));
        if (snap.exists()) return id;
      } catch {
        // ignore lookup errors, fall back to default
      }
    }

    // Default: use the raw key (matches rooms created by addDoc in MusicHallList)
    return rawKey;
  }

  private getServerNowMs(): number {
    return Date.now() + this.serverTimeOffsetMs;
  }

  private normalizeMillis(value: unknown): number | null {
    if (!value) return null;
    if (typeof value === 'number') return value;
    if (value instanceof Timestamp) return value.toMillis();
    const anyVal: any = value;
    if (typeof anyVal?.toMillis === 'function') return anyVal.toMillis();
    return null;
  }

  private sanitizeTrack(track: MusicTrack): Partial<MusicTrack> {
    const sanitized: any = {};
    Object.entries(track).forEach(([key, value]) => {
      if (value !== undefined) sanitized[key] = value;
    });
    return sanitized;
  }

  private async syncServerTimeOnce(): Promise<void> {
    if (!this.currentUserId) return;
    try {
      const ref = doc(firestore, 'time_sync', `${this.currentUserId}_${Date.now()}`);
      await setDoc(ref, { t: serverTimestamp() });
      const snap = await getDoc(ref);
      const serverMillis = this.normalizeMillis(snap.data()?.t);
      if (serverMillis) this.serverTimeOffsetMs = serverMillis - Date.now();
      await deleteDoc(ref);
    } catch {
      this.serverTimeOffsetMs = 0;
    }
  }

  async joinRoom(
    clubId: string,
    userId: string,
    userName?: string,
    userAvatar?: string,
    onStateChange?: (state: MusicRoomState) => void,
  ): Promise<() => void> {
    this.roomId = await this.resolveRoomDocId(clubId);
    this.currentUserId = userId;
    this.hasAddedListener = false;

    if (!this.roomId) {
      console.warn('[SyncMusicService] joinRoom called with empty room id', { clubId });
      return () => {};
    }

    await this.syncServerTimeOnce();

    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    this.unsubscribe = onSnapshot(
      roomRef,
      async (snapshot) => {
      if (snapshot.exists()) {
        const raw = snapshot.data() as any;
        const creatorId = raw.creatorId || raw.creator || raw.ownerId || raw.hostId;
        const state: MusicRoomState = {
          clubId: raw.clubId,
          currentTrack: raw.currentTrack || null,
          queue: Array.isArray(raw.queue) ? raw.queue : [],
          isPlaying: !!raw.isPlaying,
          currentTime: typeof raw.currentTime === 'number' ? raw.currentTime : 0,
          startedAt: this.normalizeMillis(raw.startedAt),
          listeners: Array.isArray(raw.listeners) ? raw.listeners : [],
          shuffleEnabled: !!raw.shuffleEnabled,
          repeatMode: raw.repeatMode || 'off',
          creatorId,
          joinMode: raw.joinMode,
          playHistory: Array.isArray(raw.playHistory) ? raw.playHistory : [],
          controlMusic: raw.controlMusic || 'owner',
          controlQueue: raw.controlQueue || 'owner',
        };

        if (!this.hasAddedListener) {
          await this.addListener(userId, userName, userAvatar);
          this.hasAddedListener = true;
          this.startHeartbeat();
        }

        onStateChange?.(state);
      } else {
        const now = Date.now();
        const initialState: MusicRoomState = {
          clubId,
          currentTrack: null,
          queue: [],
          isPlaying: false,
          currentTime: 0,
          startedAt: null,
          listeners: [
            {
              userId,
              userName: userName || 'Anonymous',
              avatar: userAvatar || '',
              joinedAt: now,
              lastActiveAt: now,
            },
          ],
          shuffleEnabled: false,
          repeatMode: 'off',
          creatorId: userId,
          joinMode: 'free',
          playHistory: [],
          controlMusic: 'owner',
          controlQueue: 'owner',
        };
        await setDoc(roomRef, initialState);
        this.hasAddedListener = true;
        this.startHeartbeat();
        onStateChange?.(initialState);
      }
      },
      (error) => {
        console.error('[SyncMusicService] onSnapshot error:', error);
      },
    );

    return () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    };
  }

  private async addListener(userId: string, userName?: string, userAvatar?: string): Promise<void> {
    if (!this.roomId) return;
    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists()) return;

    const roomData: any = roomDoc.data();
    const now = Date.now();
    const existingListeners = Array.isArray(roomData.listeners) ? roomData.listeners : [];
    const normalized: ListenerInfo[] = existingListeners.map((l: any) => {
      if (typeof l === 'string') {
        return { userId: l, userName: 'Anonymous', avatar: '', joinedAt: now, lastActiveAt: now };
      }
      return {
        userId: l.userId,
        userName: l.userName || 'Anonymous',
        avatar: l.avatar || '',
        joinedAt: l.joinedAt || now,
        lastActiveAt: l.lastActiveAt || now,
      };
    });

    if (normalized.some((l) => l.userId === userId)) return;

    const newListener: ListenerInfo = {
      userId,
      userName: userName || 'Anonymous',
      avatar: userAvatar || '',
      joinedAt: now,
      lastActiveAt: now,
    };

    await updateDoc(roomRef, {
      listeners: [...normalized, newListener],
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (!this.heartbeatInterval) return;
    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.roomId || !this.currentUserId) return;
    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists()) return;

    const data: any = roomDoc.data();
    const now = Date.now();
    const cutoff = now - LISTENER_STALE_MS;
    const listeners = Array.isArray(data.listeners) ? data.listeners : [];

    const normalized: ListenerInfo[] = listeners
      .map((l: any) => {
        if (typeof l === 'string') {
          return { userId: l, userName: 'Anonymous', avatar: '', joinedAt: now, lastActiveAt: now };
        }
        return {
          userId: l.userId,
          userName: l.userName || 'Anonymous',
          avatar: l.avatar || '',
          joinedAt: l.joinedAt || now,
          lastActiveAt: l.lastActiveAt || now,
        };
      })
      .filter((l) => (l.lastActiveAt || 0) >= cutoff);

    const updated = normalized.map((l) =>
      l.userId === this.currentUserId ? { ...l, lastActiveAt: now } : l,
    );

    if (updated.length === 0 && !data?.isBackgroundMusic && data?.creatorId !== 'system') {
      await deleteDoc(roomRef);
      return;
    }

    await updateDoc(roomRef, { listeners: updated });
  }

  async addToQueue(track: MusicTrack, userId: string): Promise<void> {
    if (!this.roomId) return;
    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists()) return;
    const roomData = roomDoc.data() as any;

    const newTrack: MusicTrack = {
      ...track,
      addedBy: userId,
      addedAt: Date.now(),
    };
    const sanitizedTrack = this.sanitizeTrack(newTrack);

    if (!roomData.currentTrack) {
      await updateDoc(roomRef, {
        currentTrack: sanitizedTrack,
        isPlaying: true,
        currentTime: 0,
        startedAt: serverTimestamp(),
      });
    } else {
      const queue: MusicTrack[] = Array.isArray(roomData.queue) ? roomData.queue : [];
      await updateDoc(roomRef, {
        queue: [...queue, sanitizedTrack],
      });
    }
  }

  async removeFromQueue(trackId: string): Promise<void> {
    if (!this.roomId) return;
    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists()) return;
    const roomData = roomDoc.data() as any;
    const queue: MusicTrack[] = Array.isArray(roomData.queue) ? roomData.queue : [];
    await updateDoc(roomRef, {
      queue: queue.filter((t) => t.id !== trackId),
    });
  }

  async togglePlayPause(): Promise<void> {
    if (!this.roomId) return;
    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists()) return;
    const roomData = roomDoc.data() as any;

    if (roomData.isPlaying) {
      const startedAtMs = this.normalizeMillis(roomData.startedAt) || 0;
      const elapsed = this.getServerNowMs() - startedAtMs;
      await updateDoc(roomRef, {
        isPlaying: false,
        currentTime: (roomData.currentTime || 0) + Math.max(0, elapsed),
        startedAt: null,
      });
    } else {
      await updateDoc(roomRef, {
        isPlaying: true,
        startedAt: serverTimestamp(),
      });
    }
  }

  async skipTrack(): Promise<void> {
    if (!this.roomId) return;
    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists()) return;
    const roomData = roomDoc.data() as any;

    const currentTrack: MusicTrack | null = roomData.currentTrack || null;
    const queue: MusicTrack[] = Array.isArray(roomData.queue) ? roomData.queue : [];
    const playHistory: MusicTrack[] = Array.isArray(roomData.playHistory) ? roomData.playHistory : [];
    const repeatMode: 'off' | 'one' | 'all' = roomData.repeatMode || 'off';
    const shuffleEnabled = !!roomData.shuffleEnabled;

    if (repeatMode === 'one' && currentTrack) {
      await updateDoc(roomRef, {
        currentTime: 0,
        startedAt: serverTimestamp(),
        isPlaying: true,
      });
      return;
    }

    const updatedHistory = currentTrack ? [...playHistory, currentTrack] : playHistory;

    if (queue.length > 0) {
      let nextTrack: MusicTrack;
      let newQueue: MusicTrack[];
      if (shuffleEnabled) {
        const idx = Math.floor(Math.random() * queue.length);
        nextTrack = queue[idx];
        newQueue = queue.filter((_, i) => i !== idx);
      } else {
        [nextTrack, ...newQueue] = queue;
      }
      await updateDoc(roomRef, {
        currentTrack: nextTrack,
        queue: newQueue,
        playHistory: updatedHistory,
        currentTime: 0,
        startedAt: serverTimestamp(),
        isPlaying: true,
      });
      return;
    }

    if (repeatMode === 'all' && updatedHistory.length > 0) {
      const [loopTrack, ...loopQueue] = updatedHistory;
      await updateDoc(roomRef, {
        currentTrack: loopTrack,
        queue: loopQueue,
        playHistory: [],
        currentTime: 0,
        startedAt: serverTimestamp(),
        isPlaying: true,
      });
      return;
    }

    await updateDoc(roomRef, {
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      startedAt: null,
      playHistory: updatedHistory,
    });
  }

  async playPrevious(): Promise<void> {
    if (!this.roomId) return;
    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists()) return;
    const roomData = roomDoc.data() as any;

    const history: MusicTrack[] = Array.isArray(roomData.playHistory) ? roomData.playHistory : [];
    if (history.length === 0) return;
    const previousTrack = history[history.length - 1];
    const updatedHistory = history.slice(0, -1);

    const queue: MusicTrack[] = Array.isArray(roomData.queue) ? roomData.queue : [];
    const currentTrack: MusicTrack | null = roomData.currentTrack || null;
    const updatedQueue = currentTrack ? [currentTrack, ...queue] : queue;

    await updateDoc(roomRef, {
      currentTrack: previousTrack,
      queue: updatedQueue,
      playHistory: updatedHistory,
      currentTime: 0,
      startedAt: serverTimestamp(),
      isPlaying: true,
    });
  }

  async toggleShuffle(): Promise<void> {
    if (!this.roomId) return;
    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists()) return;
    const roomData = roomDoc.data() as any;
    const newState = !roomData.shuffleEnabled;
    let queue: MusicTrack[] = Array.isArray(roomData.queue) ? [...roomData.queue] : [];
    if (newState && queue.length > 1) {
      queue = queue.sort(() => Math.random() - 0.5);
    }
    await updateDoc(roomRef, { shuffleEnabled: newState, queue });
  }

  async toggleRepeatMode(): Promise<void> {
    if (!this.roomId) return;
    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists()) return;
    const roomData = roomDoc.data() as any;
    const modes: Array<'off' | 'one' | 'all'> = ['off', 'one', 'all'];
    const current = roomData.repeatMode || 'off';
    const idx = modes.indexOf(current);
    const next = modes[(idx + 1) % modes.length];
    await updateDoc(roomRef, { repeatMode: next });
  }

  getSyncedPosition(roomState: MusicRoomState): number {
    if (!roomState.isPlaying || !roomState.startedAt) return roomState.currentTime;
    const elapsed = this.getServerNowMs() - roomState.startedAt;
    return roomState.currentTime + Math.max(0, elapsed);
  }

  async updateRoomControls(controls: { controlMusic?: 'owner' | 'all'; controlQueue?: 'owner' | 'all' }): Promise<void> {
    if (!this.roomId) return;
    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    await updateDoc(roomRef, {
      ...(controls.controlMusic ? { controlMusic: controls.controlMusic } : {}),
      ...(controls.controlQueue ? { controlQueue: controls.controlQueue } : {}),
    });
  }

  async leaveRoom(userId: string): Promise<void> {
    this.stopHeartbeat();
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (!this.roomId) return;
    const roomRef = doc(firestore, 'music_rooms', this.roomId);
    const roomDoc = await getDoc(roomRef);
    if (roomDoc.exists()) {
      const data: any = roomDoc.data();
      const listeners = Array.isArray(data.listeners) ? data.listeners : [];
      const normalized: ListenerInfo[] = listeners.map((l: any) =>
        typeof l === 'string'
          ? { userId: l, userName: 'Anonymous', avatar: '', joinedAt: Date.now(), lastActiveAt: Date.now() }
          : l,
      );
      const updated = normalized.filter((l) => l.userId !== userId);
      if (updated.length === 0) await deleteDoc(roomRef);
      else await updateDoc(roomRef, { listeners: updated });
    }

    this.roomId = null;
    this.currentUserId = null;
    this.hasAddedListener = false;
  }
}

export const syncMusicService = new SyncMusicService();
