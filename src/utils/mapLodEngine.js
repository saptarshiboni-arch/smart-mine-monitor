/**
 * mapLodEngine.js
 * Level-of-Detail (LOD) engine — Google Maps-style progressive label visibility.
 *
 * LOD Tiers:
 *   OVERVIEW  — zoom < 1.25   → gates, major junctions, miners, zone panels only
 *   SECTION   — zoom 1.25–2.1 → secondary junctions, tunnel trunks, sensors visible
 *   DETAILED  — zoom > 2.1    → every junction, all tunnel IDs + lengths, full sensor badges
 */

export const LOD = {
  OVERVIEW: 'OVERVIEW',
  SECTION: 'SECTION',
  DETAILED: 'DETAILED',
};

/** Returns the current LOD tier from a numeric zoom value */
export function getLodTier(zoom) {
  if (zoom >= 2.1) return LOD.DETAILED;
  if (zoom >= 1.25) return LOD.SECTION;
  return LOD.OVERVIEW;
}

/** Hard-coded major hub IDs — guaranteed Priority 1 regardless of degree */
const GUARANTEED_MAJOR = new Set([
  'J-01', 'J-05', 'J-08', 'J-09', 'J-12', 'J-15', 'J-16', 'J-20',
  // fallback keys without dash format
  'J01', 'J05', 'J08', 'J09', 'J12', 'J15', 'J16', 'J20',
]);

/**
 * Compute connectivity degree for every junction.
 * Returns Map<junctionId, degree>.
 */
export function computeJunctionDegrees(junctions, roadways) {
  const degree = new Map();
  junctions.forEach((j) => degree.set(j.id, 0));
  roadways.forEach((r) => {
    if (degree.has(r.from)) degree.set(r.from, degree.get(r.from) + 1);
    if (degree.has(r.to)) degree.set(r.to, degree.get(r.to) + 1);
  });
  return degree;
}

/**
 * Enriches each junction with:
 *   priority  1 (major) | 2 (secondary) | 3 (minor)
 *   minZoom   minimum zoom at which label should appear
 *   category  'major' | 'secondary' | 'minor'
 */
export function enrichJunctions(junctions, degrees) {
  return junctions.map((j) => {
    const deg = degrees.get(j.id) ?? 0;
    let priority, minZoom, category;

    if (GUARANTEED_MAJOR.has(j.id) || deg >= 3) {
      priority = 1; minZoom = 0.8; category = 'major';
    } else if (deg >= 2) {
      priority = 2; minZoom = 1.25; category = 'secondary';
    } else {
      priority = 3; minZoom = 2.1; category = 'minor';
    }

    return { ...j, priority, minZoom, category };
  });
}

/**
 * Enriches each roadway with priority / minZoom derived from its endpoints.
 */
export function enrichRoadways(roadways, enrichedJunctions) {
  const jMap = new Map(enrichedJunctions.map((j) => [j.id, j]));
  return roadways.map((r) => {
    const fromJ = jMap.get(r.from);
    const toJ = jMap.get(r.to);
    const minPriority = Math.min(
      fromJ?.priority ?? 3,
      toJ?.priority ?? 3
    );
    let minZoom;
    if (minPriority === 1) minZoom = 1.25;
    else if (minPriority === 2) minZoom = 1.6;
    else minZoom = 2.1;
    return { ...r, priority: minPriority, minZoom };
  });
}

/**
 * Enriches shafts (gates/exits) — always Priority 1.
 */
export function enrichShafts(shafts) {
  return shafts.map((s) => ({ ...s, priority: 1, minZoom: 0.5 }));
}
