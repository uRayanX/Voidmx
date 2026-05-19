import React from 'react';

/**
 * Animated equalizer bars — shown on the currently playing track.
 * Three animated bars that pulse independently via CSS animations.
 */
export const EqBars: React.FC<{ paused?: boolean; className?: string }> = ({ paused, className = '' }) => (
  <span
    className={`inline-flex items-end gap-[2px] ${className}`}
    aria-label="Now playing"
    title="Now playing"
  >
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="w-[3px] rounded-sm bg-white"
        style={{
          height: paused ? '6px' : undefined,
          animation: paused ? 'none' : `musicBar 0.${8 + i * 2}s ease-in-out ${i * 0.15}s infinite alternate`,
          minHeight: '3px',
          maxHeight: '12px',
        }}
      />
    ))}
  </span>
);
