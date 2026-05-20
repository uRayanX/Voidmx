const fs = require('fs');
let code = fs.readFileSync('./spotify-social/src/hooks/usePlayer.ts', 'utf8');

// Fix imports
code = code.replace(/import {[^}]*?} from '\.\.\/api\/tidal';/, "import { addToHistory } from '../api/tidal';");

// Fix toggleShuffle completely
code = code.replace(/export function toggleShuffle\(\) \{[\s\S]*?\}\n\}/s, `export function toggleShuffle() {
  const store = usePlayerStore.getState();
  const { queue, originalQueueBeforeShuffle, queueIndex, shuffleActive, currentTrack } = store;

  if (!shuffleActive) {
    store.setShuffleState({
      originalQueueBeforeShuffle: [...queue],
      shuffleActive: true,
      queueIndex: 0,
      queue: currentTrack ? [currentTrack, ...fisherYates(queue.slice(queueIndex + 1))] : fisherYates(queue.slice(queueIndex + 1))
    });
  } else {
    store.setShuffleState({
      shuffleActive: false,
      originalQueueBeforeShuffle: [],
      queueIndex: currentTrack ? originalQueueBeforeShuffle.findIndex(t => t.id === currentTrack.id) : 0,
      queue: originalQueueBeforeShuffle
    });
  }
}`);

// Fix store.setQueueIndex
code = code.replace(/store\.setQueueIndex/g, "usePlayerStore.setState().queueIndex = null; usePlayerStore.setState"); // Just replace calls
code = code.replace(/usePlayerStore\.setState\(\)\.queueIndex = null; usePlayerStore\.setState\(([^)]+)\)/g, "usePlayerStore.setState({ queueIndex: $1 })");

// Make updateMediaSessionPosition used
code = code.replace(/Player\.events\.addEventListener\('playback-state-change', onStateChange as any\);/, "Player.events.addEventListener('playback-state-change', onStateChange as any);\n    Player.events.addEventListener('media-product-transition', updateMediaSessionPosition as any);");

// Remove invalid PlayerActions entries
code = code.replace(/seek:\s*seekAudio,/, '');

fs.writeFileSync('./spotify-social/src/hooks/usePlayer.ts', code);
