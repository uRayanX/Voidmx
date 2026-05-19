import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { seekAudio, setAudioVolume } from './usePlayer';

export const useGlobalShortcuts = () => {
  const { player, volume, setVolume, repeatMode, setRepeatMode, toggleQueue, toggleLyrics } = usePlayerStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (!player) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          player.togglePlay();
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            player.nextTrack();
          } else {
            const pos = usePlayerStore.getState().positionMs;
            seekAudio(pos + 10000);
            usePlayerStore.getState().setPositionMs(pos + 10000);
          }
          break;
        case 'ArrowLeft':
          if (e.shiftKey) {
            player.previousTrack();
          } else {
            const pos = usePlayerStore.getState().positionMs;
            const newPos = Math.max(0, pos - 10000);
            seekAudio(newPos);
            usePlayerStore.getState().setPositionMs(newPos);
          }
          break;
        case 'ArrowUp': {
          e.preventDefault();
          const newVol = Math.min(1, volume + 0.05);
          setVolume(newVol);
          setAudioVolume(newVol);
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          const newVol = Math.max(0, volume - 0.05);
          setVolume(newVol);
          setAudioVolume(newVol);
          break;
        }
        case 'KeyM': {
          const newVol = volume > 0 ? 0 : 1;
          setVolume(newVol);
          setAudioVolume(newVol);
          break;
        }
        case 'KeyS':
          player.toggleShuffle();
          break;
        case 'KeyR':
          setRepeatMode(((repeatMode + 1) % 3) as 0 | 1 | 2);
          break;
        case 'KeyQ':
          toggleQueue();
          break;
        case 'KeyL':
          if (e.ctrlKey) {
            // Ctrl+L — focus the search bar if on Search page
            const searchInput = document.querySelector<HTMLInputElement>('input[placeholder]');
            if (searchInput) {
              e.preventDefault();
              searchInput.focus();
            }
          } else {
            toggleLyrics();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, volume, repeatMode, setVolume, setRepeatMode, toggleQueue, toggleLyrics]);
};
