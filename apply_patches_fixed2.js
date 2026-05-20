const fs = require('fs');
let code = fs.readFileSync('./spotify-social/src/hooks/usePlayer.ts', 'utf8');

// I failed previously because of the way I formulated the RegEx. Lets hard delete toggleShuffle to remove the TS errors from the untouched versions.
const toggleStr = code.match(/export function toggleShuffle\(\) \{[\s\S]*?function playTrackFromQueue/)[0];
const newToggle = `export function toggleShuffle() {
  const store = usePlayerStore.getState();
  const { queue, originalQueueBeforeShuffle, queueIndex, shuffleActive, currentTrack } = store;

  if (!shuffleActive) {
    const upcoming = queue.slice(queueIndex + 1);
    const shuffledUpcoming = fisherYates(upcoming);
    const newQueue = currentTrack ? [currentTrack, ...shuffledUpcoming] : shuffledUpcoming;
    usePlayerStore.setState({
      originalQueueBeforeShuffle: [...queue],
      shuffleActive: true,
      queueIndex: 0
    });
    store.setQueue(newQueue, 0, false); 
  } else {
    usePlayerStore.setState({ shuffleActive: false });
    if (originalQueueBeforeShuffle.length > 0) {
      if (currentTrack) {
        const origIndex = originalQueueBeforeShuffle.findIndex(t => t.id === currentTrack.id);
        if (origIndex !== -1) {
          store.setQueue(originalQueueBeforeShuffle, origIndex, false);
          return;
        }
      }
      store.setQueue(originalQueueBeforeShuffle, 0, false);
    }
  }
}

export function playTrackFromQueue`;

code = code.replace(toggleStr, newToggle);

// Fix unused imports
code = code.replace(/import {[\s\S]*?} from '\.\.\/api\/tidal';/, "import { addToHistory } from '../api/tidal';");

// Remove invalid PlayerActions entries (again, doing it directly)
code = code.replace(/seek:\s*seekAudio,/, '');

// Replace store.setQueueIndex(...) -> usePlayerStore.setState(...) safely
code = code.replace(/store\.setQueueIndex\(([^)]+)\)/g, "usePlayerStore.setState({ queueIndex: $1 })");

// Make updateMediaSessionPosition used
code = code.replace(/Player\.events\.addEventListener\('playback-state-change', onStateChange as any\);/, "Player.events.addEventListener('playback-state-change', onStateChange as any);\n    Player.events.addEventListener('media-product-transition', updateMediaSessionPosition as any);");

fs.writeFileSync('./spotify-social/src/hooks/usePlayer.ts', code);
