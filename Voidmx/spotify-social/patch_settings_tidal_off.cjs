const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const tidalRegex = /\{\/\* ── Tidal Account ── \*\/\}([\s\S]*?)<\/Section>/;

const match = code.match(tidalRegex);
if (match) {
  const replacement = `
          {/* ── Tidal Account [DEPRECATED] ── */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4 opacity-50 relative overflow-hidden mt-8">
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
               <span className="bg-red-500/20 text-red-500 font-bold px-3 py-1 rounded border border-red-500/30">TIDAL DEPRECATED - MIGRATING TO SPOTIFY</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">Tidal Account</p>
                <p className="text-xs text-white/50">Deprecated API</p>
              </div>
              <button disabled className="px-3 py-1.5 text-xs font-semibold bg-red-500/10 text-red-400 rounded-lg opacity-50 cursor-not-allowed">
                Inactive
              </button>
            </div>
          </div>
        </Section>`;

  code = code.replace(tidalRegex, replacement);
  fs.writeFileSync('src/pages/Settings.tsx', code);
  console.log("Settings patched to disable Tidal");
} else {
  console.log("Could not find block");
}
