import React from 'react';
import type { TidalTrack } from '../types/tidal';

export const SongInfoModal: React.FC<{
  track: TidalTrack;
  onClose: () => void;
}> = ({ track, onClose }) => {
  const getAudioString = () => {
    if (!track.audioQuality && !track.streamInfo) return null;
    const parts = [];
    if (track.audioQuality) parts.push(track.audioQuality.replace(/_/g, ' '));
    if (track.streamInfo?.codec) parts.push(track.streamInfo.codec);
    if (track.streamInfo?.bitDepth) parts.push(`${track.streamInfo.bitDepth}-BIT`);
    if (track.streamInfo?.sampleRate) parts.push(`${track.streamInfo.sampleRate / 1000}kHz`);
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const audioData = getAudioString();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
         onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="bg-[#121212] border border-white/10 rounded-2xl max-w-lg w-full p-6 text-white/90 shadow-2xl relative max-h-[85vh] overflow-y-auto scrollbar-thin"
           onClick={e => e.stopPropagation()}>
        <button className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/20 rounded-full hover:bg-white/10 transition-colors z-10" 
                onClick={onClose}>
          <svg className="w-5 h-5 text-white/50" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
        <h2 className="text-xl font-extrabold mb-6">Song Information</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           {/* Primary Info */}
           <div className="col-span-1 sm:col-span-2 space-y-4 bg-white/[0.03] rounded-xl p-5 border border-white/5">
             <div>
                <p className="text-white/40 uppercase tracking-[0.15em] text-[10px] font-bold mb-1">Title</p>
                <p className="font-semibold text-lg break-words">{track.title}{track.explicit ? <span className="ml-2 inline-flex items-center justify-center bg-white/20 text-white text-[9px] font-bold px-1 rounded-sm relative -top-0.5">E</span> : ''}</p>
             </div>
             <div>
                <p className="text-white/40 uppercase tracking-[0.15em] text-[10px] font-bold mb-1">Artist(s)</p>
                <p className="break-words font-medium">{track.artists?.map(a => a.name).join(', ') || track.artist?.name}</p>
             </div>
             {track.album && (
             <div>
                <p className="text-white/40 uppercase tracking-[0.15em] text-[10px] font-bold mb-1">Album</p>
                <p className="break-words">{track.album.title}</p>
             </div>
             )}
           </div>

           {/* Meta Data */}
           <div className="space-y-4 bg-white/[0.03] rounded-xl p-5 border border-white/5">
             <div>
                <p className="text-white/40 uppercase tracking-[0.15em] text-[10px] font-bold mb-1">Duration</p>
                <p>{Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}</p>
             </div>
             {(track.trackNumber || track.volumeNumber) && (
               <div>
                  <p className="text-white/40 uppercase tracking-[0.15em] text-[10px] font-bold mb-1">Track Number</p>
                  <p>{track.trackNumber || '-'}{track.volumeNumber ? ` (Vol ${track.volumeNumber})` : ''} {track.album?.numberOfTracks ? `of ${track.album.numberOfTracks}` : ''}</p>
               </div>
             )}
             {track.album?.releaseDate && (
               <div>
                  <p className="text-white/40 uppercase tracking-[0.15em] text-[10px] font-bold mb-1">Release Date</p>
                  <p>{new Date(track.album.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
               </div>
             )}
             {typeof track.popularity === 'number' && track.popularity > 0 && (
               <div>
                  <p className="text-white/40 uppercase tracking-[0.15em] text-[10px] font-bold mb-1">Popularity Score</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400" style={{ width: `${track.popularity}%` }}></div>
                    </div>
                    <span className="text-[11px] font-bold">{track.popularity}%</span>
                  </div>
               </div>
             )}
           </div>

           {/* Technical Meta */}
           <div className="space-y-4 bg-white/[0.03] rounded-xl p-5 border border-white/5">
             {audioData && (
             <div>
                <p className="text-white/40 uppercase tracking-[0.15em] text-[10px] font-bold mb-1">Audio Profile</p>
                <p className="font-semibold text-white/90 text-sm">{audioData}</p>
             </div>
             )}
             {track.isrc && (
             <div>
                <p className="text-white/40 uppercase tracking-[0.15em] text-[10px] font-bold mb-1">ISRC</p>
                <p className="font-mono text-xs">{track.isrc}</p>
             </div>
             )}
             {track.id && (
             <div>
                <p className="text-white/40 uppercase tracking-[0.15em] text-[10px] font-bold mb-1">TIDAL Track ID</p>
                <p className="font-mono text-xs">{track.id}</p>
             </div>
             )}
             <div className="pt-2">
                <p className="text-white/40 uppercase tracking-[0.15em] text-[10px] font-bold mb-1">Streaming allowed</p>
                <p className="text-xs">{track.allowStreaming === false ? 'No' : 'Yes'}</p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
