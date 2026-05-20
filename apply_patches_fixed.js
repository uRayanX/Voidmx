const fs = require('fs');
let code = fs.readFileSync('./spotify-social/src/hooks/usePlayer.ts', 'utf8');

// Fix unused imports
code = code.replace(/import \{([\s\S]*?)addToHistory,([^}]*?)\} from '\.\.\/api\/tidal';/, "import { addToHistory } from '../api/tidal';");

// Replace store.setOriginalQueueBeforeShuffle / setShuffleActive / setQueueIndex with setState
const toggleShuffleFunc = /export function toggleShuffle\(\) \{[\s\S]*?\}\n\}/;
const newToggleShuffle = `export function toggleShuffle() {
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
}`;
code = code.replace(toggleShuffleFunc, newToggleShuffle);

// replace setQueueIndex -> usePlayerStore.setState({ queueIndex: ... })
code = code.replace(/store\.setQueueIndex\((.*?)\);/g, "usePlayerStore.setState({ queueIndex: $1 });");

// Make updateMediaSessionPosition used
code = code.replace(/Player\.events\.addEventListener\('playback-state-change', onStateChange as any\);/, "Player.events.addEventListener('playback-state-change', onStateChange as any);\n    Player.events.addEventListener('media-product-transition', updateMediaSessionPosition as any);");

// Remove invalid PlayerActions entries
code = code.replace(/\n\s*seek:\s*seekAudio,/, '');

fs.writeFileSync('./spotify-social/src/hooks/usePlayer.ts', code);
