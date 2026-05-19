export const GENRES = [
  { id: 'americana', name: 'Folk / Americana' },
  { id: 'world', name: 'Global' },
  { id: 'gospel', name: 'Gospel / Christian' },
  { id: 'jazz', name: 'Jazz' },
  { id: 'kpop', name: 'K-Pop' },
  { id: 'kids', name: 'Kids' },
  { id: 'latin', name: 'Latin' },
  { id: 'metal', name: 'Metal' },
  { id: 'pop', name: 'Pop' },
  { id: 'reggae', name: 'Reggae / Dancehall' },
  { id: 'retro', name: 'Legacy' },
  { id: 'indierock', name: 'Rock / Indie' }
];

export const getGenreName = (id: string) => GENRES.find(g => g.id === id)?.name || id;
