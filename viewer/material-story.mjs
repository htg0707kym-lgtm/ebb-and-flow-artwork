// Choose whole paintings by their measured white coverage, never paint white
// over the rendered frame. The caller holds progress steady within a scene.
export function materialStoryIndex(index, materials, ranking, progress) {
 if (!Number.isFinite(progress) || progress < 0 || !ranking?.length) return index;
 const byId = new Map(ranking.map(r => [r.id, r.whiteFraction]));
 const ordered = materials.map((m, i) => ({i, white: byId.get(m.id)}))
  .filter(m => Number.isFinite(m.white)).sort((a,b) => a.white-b.white || a.i-b.i);
 if (!ordered.length) return index;
 const p = Math.max(0, Math.min(1, progress));
 // Compare measured coverage, not rank percentiles: most source paintings
 // contain almost no white, so a rank-only window would stay blue too long.
 const candidates=ordered.sort((a,b)=>Math.abs(a.white-p)-Math.abs(b.white-p)||a.i-b.i)
  .slice(0,Math.max(1,Math.ceil(ordered.length*.125))).sort((a,b)=>a.white-b.white||a.i-b.i);
 const width=candidates.length;
 const offset = ((Math.imul(index+1, 2654435761) >>> 0) % width);
 return candidates[offset].i;
}
