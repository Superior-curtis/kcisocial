/**
 * Music Hall Service
 * Handles Music Hall specific features like default background music
 */

import { firestore } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { MusicTrack } from './syncMusicService';

class MusicHallService {
  private defaultTracks: MusicTrack[] = [
    {
      id: 'default-pop-1',
      name: 'Pop Sensation',
      artist: 'Various Artists',
      album: 'English Pop Hits',
      image: 'https://via.placeholder.com/200?text=Pop+Music',
      duration: 180,
      previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      kkboxUrl: 'https://www.kkbox.com/search?q=english+pop',
      addedBy: 'system',
      addedAt: Date.now()
    },
    {
      id: 'default-pop-2',
      name: 'Summer Vibes',
      artist: 'Various Artists',
      album: 'English Pop Hits',
      image: 'https://via.placeholder.com/200?text=Summer',
      duration: 200,
      previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      kkboxUrl: 'https://www.kkbox.com/search?q=summer+hits',
      addedBy: 'system',
      addedAt: Date.now()
    },
    {
      id: 'default-pop-3',
      name: 'Chill Beats',
      artist: 'Various Artists',
      album: 'English Pop Hits',
      image: 'https://via.placeholder.com/200?text=Chill',
      duration: 190,
      previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      kkboxUrl: 'https://www.kkbox.com/search?q=chill+english+pop',
      addedBy: 'system',
      addedAt: Date.now()
    }
  ];

  /**
   * Initialize Global Music Hall with default background music if empty
   * Only applies to the global-public room, not to club-specific rooms
   */
  async initializeGlobalMusicHall(): Promise<void> {
    const hallRef = doc(firestore, 'music_rooms', 'music_room_global-public');
    const hallDoc = await getDoc(hallRef);

    // Always initialize if doesn't exist OR if it's empty
    if (!hallDoc.exists() || (!hallDoc.data()?.currentTrack && (!hallDoc.data()?.queue || hallDoc.data().queue.length === 0))) {
      // Create music hall with default track
      const initialState = {
        clubId: 'global-public',
        currentTrack: this.defaultTracks[0],
        queue: this.defaultTracks.slice(1),
        isPlaying: true,
        currentTime: 0,
        startedAt: Date.now(),
        listeners: [],
        shuffleEnabled: false,
        repeatMode: 'all' as const,
        creatorId: 'system',
        joinMode: 'free' as const,
        playHistory: [],
        isBackgroundMusic: true,
        backgroundMusicTracksToShow: 3 // Show first 3 default tracks in UI
      };

      await setDoc(hallRef, initialState, { merge: true });
    }
  }

  /**
   * Get default Music Hall tracks
   */
  getDefaultTracks(): MusicTrack[] {
    return this.defaultTracks;
  }

  /**
   * Check if room is the Global Music Hall
   */
  isGlobalMusicHall(roomId: string): boolean {
    return roomId === 'global-public' || roomId === 'music_room_global-public';
  }

  /**
   * Check if room ID is global-public
   */
  isGlobalPublic(roomId: string): boolean {
    return roomId === 'global-public';
  }
}

export const musicHallService = new MusicHallService();
