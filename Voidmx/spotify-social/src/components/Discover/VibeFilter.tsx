import React from 'react';

export interface Vibe {
  id: string;
  label: string;
  query: string;
}

export const VIBES: Vibe[] = [
  { id: 'chill',      label: 'Chill',      query: 'genre:chill lo-fi relaxing' },
  { id: 'hype',       label: 'Hype',       query: 'genre:hip-hop genre:edm energetic' },
  { id: 'focus',      label: 'Focus',      query: 'genre:ambient focus instrumental study' },
  { id: 'happy',      label: 'Happy',      query: 'genre:pop happy upbeat feel-good' },
  { id: 'melancholy', label: 'Melancholy', query: 'genre:indie sad emotional' },
  { id: 'jazz',       label: 'Jazz',       query: 'genre:jazz classic smooth' },
  { id: 'acoustic',   label: 'Acoustic',   query: 'acoustic folk singer-songwriter' },
  { id: 'hiphop',     label: 'Hip-Hop',    query: 'genre:hip-hop rap trap' },
];

interface VibeFilterProps {
  selected: string | null;
  onSelect: (vibe: Vibe) => void;
}

export const VibeFilter: React.FC<VibeFilterProps> = ({ selected, onSelect }) => (
  <div className="flex flex-wrap gap-2">
    {VIBES.map(v => (
      <button
        key={v.id}
        onClick={() => onSelect(v)}
        className={`px-4 py-2 rounded-xl text-sm transition-all ${
          selected === v.id
            ? 'bg-white text-black font-medium'
            : 'bg-white/[0.05] text-white/40 hover:text-white hover:bg-white/[0.09]'
        }`}
      >
        {v.label}
      </button>
    ))}
  </div>
);
