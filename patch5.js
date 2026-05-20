const fs = require('fs');
const path = './spotify-social/src/hooks/usePlayer.ts';
let code = fs.readFileSync(path, 'utf8');

const playPauseRegex = /function handlePlayPause\(\) \{[\s\S]*?\}\n/s;
const newPlayPause = `function handlePlayPause() {
  const store = usePlayerStore.getState();
  const state = Player.getPlaybackState();
  if (state === 'IDLE' && store.currentTrack) {
    playTrackFromQueue(0);
    return;
  }
  if (state !== 'PLAYING') {
    Player.play().catch(e => {
        if (store.currentTrack) playTrackFromQueue(0);
    });
  } else {
    Player.pause();
    store.persistQueue();
  }
}
`;
code = code.replace(playPauseRegex, newPlayPause);
fs.writeFileSync(path, code);
