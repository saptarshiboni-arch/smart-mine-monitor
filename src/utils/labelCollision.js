/**
 * labelCollision.js
 * Spatial 2D bounding-box collision detection for SVG map labels.
 *
 * Used to prevent overlapping labels on the mine map.
 * Items are sorted by priority (ascending = more important first).
 * Lower-priority labels that collide with higher-priority ones are hidden.
 */

/**
 * Estimates the bounding box of a label in map-space coordinates.
 *
 * @param {number} x - anchor x in SVG map units
 * @param {number} y - anchor y in SVG map units
 * @param {string} text - label string
 * @param {number} fontSize - SVG font-size in units
 * @param {number} [padding=2] - extra padding around text
 * @param {number} [offsetX=0] - horizontal offset from anchor
 * @param {number} [offsetY=-10] - vertical offset from anchor
 * @returns {{ x1, y1, x2, y2 }}
 */
export function computeBoundingBox(x, y, text, fontSize, padding = 2, offsetX = 0, offsetY = -10) {
  const charWidth = fontSize * 0.6;
  const w = text.length * charWidth + padding * 2;
  const h = fontSize + padding * 2;
  const cx = x + offsetX;
  const cy = y + offsetY;
  return {
    x1: cx - w / 2,
    y1: cy - h / 2,
    x2: cx + w / 2,
    y2: cy + h / 2,
  };
}

/** AABB collision test */
export function areBoxesColliding(b1, b2) {
  return !(
    b1.x2 < b2.x1 ||
    b1.x1 > b2.x2 ||
    b1.y2 < b2.y1 ||
    b1.y1 > b2.y2
  );
}

/**
 * Resolve label collisions for a list of labelled items.
 *
 * @param {Array} items - each item: { id, x, y, text, fontSize, priority, minZoom }
 * @param {number} zoom - current zoom value
 * @param {{ x1, y1, x2, y2 }} viewport - visible SVG area in map units
 * @param {object} [options]
 * @param {number} [options.padding=3]
 * @returns {Map<id, boolean>} - true = visible, false = hidden
 */
export function resolveLabelCollisions(items, zoom, viewport, options = {}) {
  const padding = options.padding ?? 3;

  // Filter to items that pass their minZoom threshold
  const eligible = items.filter((item) => zoom >= (item.minZoom ?? 0));

  // Sort by priority ascending (1 = most important)
  const sorted = [...eligible].sort((a, b) => a.priority - b.priority);

  const placed = []; // placed bounding boxes
  const visibility = new Map();

  // Alternate offset positions to try before hiding a label
  const OFFSETS = [
    { dx: 0, dy: -10 },
    { dx: 0, dy: 12 },
    { dx: 14, dy: -4 },
    { dx: -14, dy: -4 },
  ];

  sorted.forEach((item) => {
    // Viewport culling — skip items completely outside visible area
    const buffer = 40;
    if (
      item.x + buffer < viewport.x1 ||
      item.x - buffer > viewport.x2 ||
      item.y + buffer < viewport.y1 ||
      item.y - buffer > viewport.y2
    ) {
      visibility.set(item.id, false);
      return;
    }

    const fontSize = item.fontSize ?? 8;
    let placed_ok = false;

    for (const off of OFFSETS) {
      const box = computeBoundingBox(
        item.x, item.y, item.text, fontSize, padding, off.dx, off.dy
      );
      const collides = placed.some((pb) => areBoxesColliding(box, pb));
      if (!collides) {
        placed.push(box);
        visibility.set(item.id, true);
        placed_ok = true;
        break;
      }
    }

    if (!placed_ok) {
      // High-priority items (1) are always shown even with overlap
      if (item.priority === 1) {
        const box = computeBoundingBox(item.x, item.y, item.text, fontSize, padding, 0, -10);
        placed.push(box);
        visibility.set(item.id, true);
      } else {
        visibility.set(item.id, false);
      }
    }
  });

  // Items that didn't pass minZoom are hidden
  items.forEach((item) => {
    if (!visibility.has(item.id)) {
      visibility.set(item.id, false);
    }
  });

  return visibility;
}
