import type { TidalTrack } from '../types/tidal';

export function prioritizeRadioTracks(seed: TidalTrack, tracks: TidalTrack[]): TidalTrack[] {
  const IGNORE_ISRC_COUNTRIES = ['US', 'QZ', 'GB', 'FR']; // Global distributors

  return [...tracks].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    
    // Prioritize language match (highest weight)
    if (a.language && seed.language && a.language === seed.language) scoreA += 10;
    if (b.language && seed.language && b.language === seed.language) scoreB += 10;
    
    // Prioritize country match
    const validCountry = seed.country && !IGNORE_ISRC_COUNTRIES.includes(seed.country);
    if (validCountry && a.country === seed.country) scoreA += 5;
    if (validCountry && b.country === seed.country) scoreB += 5;
    
    return scoreB - scoreA;
  });
}
