// MINEGUARD AI — Google Maps-style Level of Detail (LOD) & Label Collision Engine
// Intelligently computes visibility, priority ranking, and collision avoidance for underground mine maps

export const LOD_TIERS = {
  OVERVIEW: {
    id: 'OVERVIEW',
    label: 'Overview Mode',
    badge: 'Overview',
    description: 'Mine gates, major extraction sections, active personnel, and primary hub junctions.',
    minZoom: 0.4,
    maxZoom: 1.35,
  },
  SECTION: {
    id: 'SECTION',
    label: 'Section Mode',
    badge: 'Section',
    description: 'Major and secondary junctions, trunk haulage tunnels, monitoring stations, and miner IDs.',
    minZoom: 1.35,
    maxZoom: 2.2,
  },
  DETAILED: {
    id: 'DETAILED',
    label: 'Detailed Mode',
    badge: 'Street / Detailed',
    description: 'Every individual junction, cross-cut tunnel, sensor telemetry, and infrastructure node.',
    minZoom: 2.2,
    maxZoom: 4.0,
  },
};

export const LABEL_PRIORITIES = {
  SHAFT_PORTAL: 1,       // Surface Gates & Mine Entrances (Highest priority - never occluded)
  MINER_BADGE: 2,        // Active Personnel underground
  MAJOR_HUB: 3,          // High-connectivity junction nodes
  TRUNK_ROADWAY: 4,      // Arterial haulage tunnels
  MONITORING_STATION: 5, // Environmental monitoring hubs
  SECONDARY_JUNCTION: 6, // Standard branch junctions
  MINOR_TUNNEL: 7,       // Connecting cross-cuts
  MINOR_JUNCTION: 8,     // Dead-ends, stubs, micro-junctions
  SENSOR_METRIC: 9,      // Telemetry tags
};

/**
 * Determine current LOD tier based on zoom multiplier
 */
export function getLODTier(zoom) {
  if (zoom < 1.35) return LOD_TIERS.OVERVIEW;
  if (zoom < 2.2) return LOD_TIERS.SECTION;
  return LOD_TIERS.DETAILED;
}

/**
 * Classify junctions into Major Hubs, Secondary, and Minor
 * based on topological degree (connectivity), shaft adjacency, and key zone placement.
 */
export function classifyJunctions(junctions = [], roadways = [], shafts = []) {
  // 1. Calculate degree for each junction
  const degreeMap = new Map();
  junctions.forEach((j) => degreeMap.set(j.id, 0));

  roadways.forEach((r) => {
    if (degreeMap.has(r.from)) degreeMap.set(r.from, (degreeMap.get(r.from) || 0) + 1);
    if (degreeMap.has(r.to)) degreeMap.set(r.to, (degreeMap.get(r.to) || 0) + 1);
  });

  // 2. Identify junctions directly connected to surface shafts or refuge chambers
  const shaftNodeIds = new Set(shafts.map((s) => s.id));
  const shaftConnectedJunctions = new Set();
  roadways.forEach((r) => {
    if (shaftNodeIds.has(r.from)) shaftConnectedJunctions.add(r.to);
    if (shaftNodeIds.has(r.to)) shaftConnectedJunctions.add(r.from);
  });

  // 3. Track zone anchors (first junction of each zone)
  const zoneFirstSeen = new Set();

  return junctions.map((j) => {
    const deg = degreeMap.get(j.id) || 0;
    const isShaftAdjacent = shaftConnectedJunctions.has(j.id);
    const isFirstInZone = !zoneFirstSeen.has(j.zone);
    if (j.zone) zoneFirstSeen.add(j.zone);

    let priority = LABEL_PRIORITIES.MINOR_JUNCTION;
    let minZoom = 2.2;
    let classification = 'minor';
    let isHub = false;

    // Major Hub: Degree >= 3, OR directly connected to Shaft, OR key zone anchor with degree >= 2
    if (deg >= 3 || isShaftAdjacent || (isFirstInZone && deg >= 2)) {
      priority = LABEL_PRIORITIES.MAJOR_HUB;
      minZoom = 0.4;
      classification = 'major';
      isHub = true;
    }
    // Secondary Junction: Degree == 2
    else if (deg === 2 || isFirstInZone) {
      priority = LABEL_PRIORITIES.SECONDARY_JUNCTION;
      minZoom = 1.35;
      classification = 'secondary';
      isHub = false;
    }
    // Minor Junction: Degree <= 1 (Dead-ends, stubs, fine cross-cuts)
    else {
      priority = LABEL_PRIORITIES.MINOR_JUNCTION;
      minZoom = 2.2;
      classification = 'minor';
      isHub = false;
    }

    return {
      ...j,
      degree: deg,
      isHub,
      priority,
      minZoom,
      classification,
    };
  });
}

/**
 * Classify roadways into Trunk (Major) and Connecting (Minor)
 */
export function classifyRoadways(roadways = [], classifiedJunctions = []) {
  const junctionMap = new Map(classifiedJunctions.map((j) => [j.id, j]));

  return roadways.map((r) => {
    const fromJ = junctionMap.get(r.from);
    const toJ = junctionMap.get(r.to);
    const connectsHubs = (fromJ?.isHub && toJ?.isHub);
    const isLongTrunk = (r.length || 0) >= 30;
    const isMainType = r.type === 'roadway_main' || r.type === 'main';

    const isMajor = connectsHubs || isLongTrunk || isMainType;

    return {
      ...r,
      priority: isMajor ? LABEL_PRIORITIES.TRUNK_ROADWAY : LABEL_PRIORITIES.MINOR_TUNNEL,
      minZoom: isMajor ? 1.45 : 2.2,
      isMajor,
    };
  });
}

/**
 * 2D Axis-Aligned Bounding Box (AABB) collision detection with priority pruning
 * Guarantees zero overlapping text labels on the map canvas.
 *
 * @param {Array} candidateLabels Array of { id, x, y, width, height, priority, minZoom }
 * @param {number} currentZoom Current map zoom multiplier
 * @param {number} minSpacing Minimum clear spacing in pixels between labels
 * @returns {Set<string>} Set of label IDs that are granted visibility
 */
export function computeVisibleLabels(candidateLabels = [], currentZoom = 1, minSpacing = 6) {
  const visibleLabelIds = new Set();
  const placedBoxes = [];

  // Sort candidates:
  // 1. Lower priority number first (1 = highest importance)
  // 2. Hub nodes before non-hubs
  // 3. Lower minZoom first
  const sorted = [...candidateLabels].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.minZoom !== b.minZoom) return a.minZoom - b.minZoom;
    return a.id.localeCompare(b.id);
  });

  for (const item of sorted) {
    // Zoom threshold check
    if (currentZoom < item.minZoom) {
      continue;
    }

    // Normalized dimensions in SVG coordinate space
    const halfW = (item.width || 28) / 2;
    const halfH = (item.height || 14) / 2;
    const pad = minSpacing / Math.max(0.6, currentZoom);

    const box = {
      x1: item.x - halfW - pad,
      y1: item.y - halfH - pad,
      x2: item.x + halfW + pad,
      y2: item.y + halfH + pad,
    };

    // Check collision with already placed higher-priority boxes
    let hasCollision = false;
    for (const placed of placedBoxes) {
      const overlaps = !(
        box.x2 < placed.x1 ||
        box.x1 > placed.x2 ||
        box.y2 < placed.y1 ||
        box.y1 > placed.y2
      );
      if (overlaps) {
        hasCollision = true;
        break;
      }
    }

    if (!hasCollision) {
      visibleLabelIds.add(item.id);
      placedBoxes.push(box);
    }
  }

  return visibleLabelIds;
}
