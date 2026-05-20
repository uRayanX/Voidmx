const fs = require('fs');
const path = './spotify-social/src/hooks/usePlayer.ts';
let code = fs.readFileSync(path, 'utf8');

const hookRegex = /export function usePlayer\(\) \{[\s\S]*?setupMediaSessionHandlers\(\);/;

const newHook = `export function usePlayer() {
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const onStateChange = (e: any) => {
      const state = e.detail;
      if (state === 'PLAYING') {
        usePlayerStore.getState().setIsPaused(false);
        usePlayerStore.getState().setIsLoading(false);
        updateMediaSessionPlaybackState();
        syncAndroidBridge();
      } else if (state === 'NOT_PLAYING') {
        usePlayerStore.getState().setIsPaused(true);
        updateMediaSessionPlaybackState();
        syncAndroidBridge();
      } else if (state === 'STALLED') {
        usePlayerStore.getState().setIsLoading(true);
      }
    };

    const onError = (e: any) => {
      usePlayerStore.getState().setIsLoading(false);
      console.error('[Tidal SDK Error]', e);
    };

    const onEnded = () => playNext(0);

    Player.events.addEventListener('playback-state-change', onStateChange);
    Player.events.addEventListener('ended', onEnded);
    Player.events.addEventListener('error', onError);

    // Provide a loop to update position because SDK doesn't emit timeupdate
    setInterval(() => {
      if (!usePlayerStore.getState().isPaused) {
        const pos = Player.getAssetPosition();
        if (pos !== undefined && pos >= 0) {
          usePlayerStore.getState().setPositionMs(pos * 1000);
        }
        const media = Player.getMediaElement();
        if (media) {
           usePlayerStore.getState().setDurationMs(isNaN(media.duration) ? 0 : media.duration * 1000);
        }
      }
    }, 500);

    setupMediaSessionHandlers();`;

code = code.replace(hookRegex, newHook);
fs.writeFileSync(path, code);
