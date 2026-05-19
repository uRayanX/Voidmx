import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TidalTrack } from '../types/tidal';
import { getTrackRecommendations } from '../api/tidal';
import { SongInfoModal } from './SongInfoModal';
import { usePlayerStore } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';

interface TrackMenuProps {
  track: TidalTrack;
  menuDirection?: "left" | "right";
}

export const TrackMenu: React.FC<TrackMenuProps> = ({ track, menuDirection = "right" }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [open, setOpen] = useState(false);
  const [playlistSubOpen, setPlaylistSubOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [dropdownAlign, setDropdownAlign] = useState<'left-0' | 'right-0'>(menuDirection === "left" ? "right-0" : "left-0");
  const [subDropdownPosition, setSubDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [subDropdownAlign, setSubDropdownAlign] = useState<'left-full ml-1' | 'right-full mr-1'>(menuDirection === "left" ? "right-full mr-1" : "left-full ml-1");
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const subDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const addNextToQueue = usePlayerStore(state => state.addNextToQueue);
  const addToQueue = usePlayerStore(state => state.addToQueue);
  
  const likedTracks = useLibraryStore(state => state.likedTracks);
  const toggleLike = useLibraryStore(state => state.toggleLike);
  const isLiked = likedTracks.some(t => t.id === track.id);
  
  const customPlaylists = useLibraryStore(state => state.playlists);
  const addTrackToPlaylist = useLibraryStore(state => state.addTrackToPlaylist);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    
    const parentNode = menuRef.current?.parentElement as HTMLElement | null;
    const parentRow = menuRef.current?.closest('.group') as HTMLElement | null;
    
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
      if (parentNode) {
        parentNode.style.setProperty('opacity', '1', 'important');
      }
      if (parentRow) {
        parentRow.style.setProperty('z-index', '9999', 'important');
        
        // Force relative positioning if it's currently static so z-index actually applies
        if (window.getComputedStyle(parentRow).position === 'static') {
          parentRow.style.setProperty('position', 'relative', 'important');
        }
      }
    } else {
      if (parentNode) {
        parentNode.style.removeProperty('opacity');
      }
      if (parentRow) {
        parentRow.style.removeProperty('z-index');
        parentRow.style.removeProperty('position');
      }
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      if (parentNode) parentNode.style.removeProperty('opacity');
      if (parentRow) {
        parentRow.style.removeProperty('z-index');
        parentRow.style.removeProperty('position');
      }
    };
  }, [open]);

  useEffect(() => {
    if (open && dropdownRef.current) {
      // Small timeout to allow render to complete so we can measure bounding rect
      setTimeout(() => {
        if (!dropdownRef.current) return;
        const rect = dropdownRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const windowWidth = document.documentElement.clientWidth;

        // if menu extends past bottom of screen, show above
        if (rect.bottom > windowHeight - 20) {
          setDropdownPosition('top');
        } else {
          setDropdownPosition('bottom');
        }

        // horizontal flip
        if (rect.right > windowWidth - 20) {
          setDropdownAlign('right-0');
        } else {
          setDropdownAlign(menuDirection === "left" ? "right-0" : "left-0");
        }
      }, 0);
    } else {
      setDropdownPosition('bottom');
      setDropdownAlign(menuDirection === "left" ? "right-0" : "left-0");
    }
  }, [open, menuDirection]);

  useEffect(() => {
    if (playlistSubOpen && subDropdownRef.current) {
      setTimeout(() => {
        if (!subDropdownRef.current) return;
        const rect = subDropdownRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const windowWidth = document.documentElement.clientWidth;

        if (rect.bottom > windowHeight - 20) {
          setSubDropdownPosition('top');
        } else {
          setSubDropdownPosition('bottom');
        }

        if (rect.right > windowWidth - 20) {
          setSubDropdownAlign('right-full mr-1');
        } else {
          setSubDropdownAlign(menuDirection === "left" ? "right-full mr-1" : "left-full ml-1");
        }
      }, 0);
    } else {
      setSubDropdownPosition('bottom');
      setSubDropdownAlign(menuDirection === "left" ? "right-full mr-1" : "left-full ml-1");
    }
  }, [playlistSubOpen, menuDirection]);

  return (
    <div className={`relative ${open ? 'z-[9999]' : 'z-10'}`} ref={menuRef}>
      <button
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
          setPlaylistSubOpen(false);
        }}
        className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </button>

      {showInfo && <SongInfoModal track={track} onClose={() => setShowInfo(false)} />}
      {open && (
        <div 
          ref={dropdownRef}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className={`absolute ${dropdownAlign} ${dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} min-w-[180px] bg-[#1a1a1a] border border-white/[0.08] rounded-xl overflow-visible shadow-2xl py-1 z-[9999]`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              addNextToQueue(track);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            Play Next
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToQueue(track);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            Add to Queue
          </button>

          <div className="h-px bg-white/[0.04] my-1" />

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(track);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            {isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
          </button>

          <div
            className="relative"
            onMouseEnter={() => setPlaylistSubOpen(true)}
            onMouseLeave={() => setPlaylistSubOpen(false)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center justify-between"
            >
              Add to Playlist
              <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 17l5-5-5-5v10z"/>
              </svg>
            </button>

            {playlistSubOpen && (
              <div 
                ref={subDropdownRef}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className={`absolute ${subDropdownAlign} ${subDropdownPosition === 'top' ? 'bottom-0' : 'top-0'} min-w-[180px] bg-[#1a1a1a] border border-white/[0.08] rounded-xl shadow-2xl py-1 z-[99999] max-h-[300px] overflow-y-auto`}
              >
                {customPlaylists.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-white/50 text-center italic">No playlists yet</div>
                ) : (
                  customPlaylists.map(p => (
                    <button
                      key={p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        addTrackToPlaylist(p.id, track);
                        setOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors line-clamp-1"
                    >
                      {p.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="h-px bg-white/[0.04] my-1" />

          {track.artist?.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/artist/${track.artist!.id}`);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Go to Artist
            </button>
          )}
          
          {track.album?.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/album/${track.album!.id}`);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Go to Album
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              getTrackRecommendations(track.id).then(tracks => {
                usePlayerStore.getState().setQueue([track, ...tracks], 0, true);
              }).catch(() => {});
            }}
            className="w-full text-left px-4 py-2.5 text-xs text-[#00FFFF] font-bold hover:bg-white/[0.06] transition-colors flex items-center justify-between"
          >
            Song Radio
            <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 24 24"><path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12a2 2 0 002 2h16a2 2 0 002-2V8c0-.83-.51-1.57-1.24-1.85L15 4l-6 2-5.76-1.85zM8 7v10H4V8h4zm12 1v9h-4V8h4zM12 9v8h-2V9h2z"/></svg>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              setShowInfo(true);
            }}
            className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            Song Info
          </button>
          
          <div className="h-px bg-white/[0.04] my-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(`https://listen.tidal.com/track/${track.id}`);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            Share
          </button>
        </div>
      )}
    </div>
  );
};
