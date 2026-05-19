import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGenreName } from '../lib/genres';
import { getCoverUrl } from '../api/tidal';

export const Genre: React.FC = () => {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const genreName = getGenreName(id);
    Promise.all([
      import('../api/tidal').then(m => m.searchAlbums(`${genreName} music`, 20)),
      import('../api/tidal').then(m => m.searchPlaylists(`${genreName} music`, 20))
    ])
      .then(([albums, playlists]) => {
        setData({
          trending_albums: albums,
          sections: [
            { type: 'PLAYLIST_LIST', title: 'Top Playlists', items: playlists }
          ]
        });
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="p-12 pt-24 text-white/50 w-full flex justify-center uppercase tracking-widest text-sm font-bold">Loading {id}...</div>;
  }

  if (!data) {
    return <div className="p-12 pt-24 text-white/50 w-full flex justify-center uppercase tracking-widest text-sm font-bold">Category not found</div>;
  }

  const renderSection = (items: any[], _type: 'ALBUM_LIST'|'PLAYLIST_LIST') => {
    return (
      <div className="flex overflow-x-auto gap-5 scrollbar-none pb-4 px-12 -mx-12 shrink-0">
        {items.map(item => {
            const uuid = item.uuid || item.id;
            const strId = String(uuid);
            const linkTo = strId.includes('-') || strId.length > 15 ? `/playlist/${uuid}` : `/album/${uuid}`;
            return (
              <Link to={linkTo} key={uuid} className="group flex flex-col gap-3 w-40 sm:w-48 shrink-0 text-left">
                  <div className="relative w-full aspect-square overflow-hidden rounded-md border border-white/5 shadow-xl bg-white/5">
                    {item.squareImage || item.image ? (
                        <img src={getCoverUrl(item.squareImage || item.image, 320)} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105`} alt={item.title} loading="lazy" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-white/20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v9.28A4 4 0 1014 16V7h4V3h-6z"/></svg>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <div className="w-12 h-12 rounded-full border border-white/20 bg-black/50 text-white flex items-center justify-center backdrop-blur-md hover:bg-white hover:text-black transition-colors">
                        <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-base font-bold truncate leading-tight text-white">{item.title}</p>
                    {item.promotedArtists && item.promotedArtists.length > 0 && (
                        <p className="text-sm text-gray-400 truncate mt-0.5">
                            {item.promotedArtists.map((a: any) => a.name).join(', ')}
                        </p>
                    )}
                  </div>
              </Link>
            )
        })}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-none flex flex-col pb-32">
      <div className="px-12 pt-24 pb-12 flex items-end gap-8 bg-gradient-to-b from-[#111] to-transparent">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight uppercase" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          {getGenreName(id || "")}
        </h1>
      </div>

      <div className="px-12 flex flex-col gap-14 mt-4">
        {data.trending_albums && data.trending_albums.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6 tracking-tight uppercase" style={{ fontFamily: 'Montserrat, sans-serif' }}>Trending</h2>
            {renderSection(data.trending_albums, 'ALBUM_LIST')}
          </section>
        )}
        
        {data.sections && data.sections.map((section: any, idx: number) => {
          if (!section.items || section.items.length === 0) return null;
          if (section.type !== 'ALBUM_LIST' && section.type !== 'PLAYLIST_LIST') return null;
          return (
            <section key={idx}>
              <h2 className="text-2xl font-bold mb-6 tracking-tight uppercase" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {section.title || (section.type === 'ALBUM_LIST' ? 'Albums' : 'Playlists')}
              </h2>
              {renderSection(section.items, section.type)}
            </section>
          )
        })}
      </div>
    </div>
  );
};
