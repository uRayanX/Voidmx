export async function extractVibrantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (!imageUrl) return resolve('#555555');
    
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('#555555');
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      
      let r = 0, g = 0, b = 0, count = 0;
      
      // Sample every 4th pixel to save performance
      for (let i = 0; i < data.length; i += 16) {
        // Ignore almost black or almost white pixels
        if ((data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) ||
            (data[i] < 15 && data[i+1] < 15 && data[i+2] < 15)) {
          continue;
        }
        r += data[i];
        g += data[i+1];
        b += data[i+2];
        count++;
      }
      
      if (count === 0) return resolve('#555555');
      
      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);
      
      // Increase saturation massively for a much "more vibrant" impact 
      const max = Math.max(r, g, b);
      if (max > 0) {
        // Exaggerate it significantly so it easily contrasts against the dark navpill background
        r = Math.min(255, Math.floor(r + (255 - r) * 0.4));
        g = Math.min(255, Math.floor(g + (255 - g) * 0.4));
        b = Math.min(255, Math.floor(b + (255 - b) * 0.4));
      }
      
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      resolve(hex);
    };
    
    img.onerror = () => resolve('#555555');
  });
}
