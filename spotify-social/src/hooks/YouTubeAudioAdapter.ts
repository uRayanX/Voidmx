export class YouTubeAudioAdapter extends EventTarget {
  private _src = '';
  private _volume = 1;
  private _currentTime = 0;
  private _paused = true;
  private player: any = null;
  private iframe: HTMLDivElement;
  private ready = false;
  private checkInterval: any = null;
  public crossOrigin = '';
  public preload = '';
  private state = -1; // unstarted
  private _playbackRate = 1;

  get playbackRate() {
    return this._playbackRate;
  }

  set playbackRate(val: number) {
    this._playbackRate = val;
    if (this.ready && this.player && this.player.setPlaybackRate) {
      this.player.setPlaybackRate(val);
    }
  }

  get readyState() {
    return this.ready ? 4 : 0;
  }

  get buffered() {
    // Return a dummy TimeRanges object
    return {
      length: 1,
      start: () => 0,
      end: () => {
        if (this.ready && this.player && this.player.getVideoLoadedFraction && this.player.getDuration) {
          return this.player.getVideoLoadedFraction() * this.player.getDuration();
        }
        return 0;
      }
    };
  }

  constructor() {
    super();
    
    // Create a hidden container for the YT Iframe
    this.iframe = document.createElement('div');
    this.iframe.id = 'yt-audio-player-container';
    this.iframe.style.position = 'absolute';
    this.iframe.style.width = '0px';
    this.iframe.style.height = '0px';
    this.iframe.style.top = '-9999px';
    this.iframe.style.left = '-9999px';
    this.iframe.style.opacity = '0';
    this.iframe.style.pointerEvents = 'none';
    document.body.appendChild(this.iframe);

    // Inject YouTube IFrame API script
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    const initPlayer = () => {
      this.player = new (window as any).YT.Player(this.iframe.id, {
        height: '0',
        width: '0',
        videoId: '',
        playerVars: {
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: () => {
            this.ready = true;
            this.player.setVolume(this._volume * 100);
            if (this._src) {
              const vid = this.extractId(this._src);
              if (vid) {
                this.player.loadVideoById(vid);
              }
            }
          },
          onStateChange: (event: any) => {
            this.state = event.data;
            const YT = (window as any).YT;
            if (event.data === YT.PlayerState.PLAYING) {
              this._paused = false;
              this.dispatchEvent(new Event('play'));
              this.dispatchEvent(new Event('playing'));
              this.startTracking();
              
              // Simulate loadedmetadata and durationchange
              this.dispatchEvent(new Event('loadedmetadata'));
              this.dispatchEvent(new Event('durationchange'));
              this.dispatchEvent(new Event('canplay'));
            } else if (event.data === YT.PlayerState.PAUSED) {
              this._paused = true;
              this.dispatchEvent(new Event('pause'));
              this.stopTracking();
            } else if (event.data === YT.PlayerState.ENDED) {
              this._paused = true;
              this._currentTime = this.duration;
              this.dispatchEvent(new Event('ended'));
              this.stopTracking();
            } else if (event.data === YT.PlayerState.BUFFERING) {
              this.dispatchEvent(new Event('waiting'));
            }
          },
          onError: (event: any) => {
            console.error('[YouTubeAudioAdapter] Player Error:', event.data);
            this.dispatchEvent(new Event('error'));
          }
        }
      });
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      const prevCallback = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };
    }
  }

  private extractId(url: string) {
    // We expect the usePlayer to pass either the raw videoId OR a fake URL
    // e.g. yt:bCyrVBqncJk or just the videoId. Let's handle both.
    if (!url) return '';
    if (url.startsWith('yt:')) return url.substring(3);
    if (url.includes('v=')) {
      const match = url.match(/[?&]v=([^&]+)/);
      return match ? match[1] : url;
    }
    // If it's a proxy url, extract videoId
    if (url.includes('videoId=')) {
      const match = url.match(/[?&]videoId=([^&]+)/);
      if (match) return match[1];
    }
    // Assume it's a plain video ID if it's 11 chars
    if (url.length === 11) return url;
    return '';
  }

  private startTracking() {
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkInterval = setInterval(() => {
      if (this.player && this.player.getCurrentTime) {
        this._currentTime = this.player.getCurrentTime();
        this.dispatchEvent(new Event('timeupdate'));
      }
    }, 250);
  }

  private stopTracking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  get src() {
    return this._src;
  }

  set src(val: string) {
    this._src = val;
    this._currentTime = 0;
    this._paused = true;
    if (this.ready && this.player) {
      const vid = this.extractId(val);
      if (vid) {
        this.player.loadVideoById(vid);
        // loadVideoById auto-plays. We immediately pause if we don't want to play?
        // Actually usePlayer calls play() manually right after setting src.
      } else {
        this.player.stopVideo();
      }
    }
  }

  get volume() {
    return this._volume;
  }

  set volume(val: number) {
    this._volume = val;
    if (this.ready && this.player) {
      this.player.setVolume(val * 100);
    }
  }

  get currentTime() {
    return this._currentTime;
  }

  set currentTime(val: number) {
    this._currentTime = val;
    if (this.ready && this.player) {
      this.player.seekTo(val, true);
    }
  }

  get duration() {
    if (this.ready && this.player && this.player.getDuration) {
      return this.player.getDuration() || 0;
    }
    return 0;
  }

  get paused() {
    return this._paused;
  }

  async play() {
    if (this.ready && this.player) {
      this.player.playVideo();
    }
  }

  pause() {
    if (this.ready && this.player) {
      this.player.pauseVideo();
    }
  }
}
