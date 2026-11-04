import { BUILDINGS } from '../data.js';

function rectanglesOverlap(a, b, gap = 0) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 + gap &&
    Math.abs(a.z - b.z) < (a.d + b.d) / 2 + gap;
}

/**
 * Validates a construction footprint against the playable airport zones,
 * fixed infrastructure and every already-built facility.
 */
export function getPlacementStatus(type, x, z, placedBuildings = [], options = {}) {
  const item = BUILDINGS.find(b => b.id === type);
  if (!item) return { valid: false, reason: 'Unknown building' };
  const [w, d] = item.footprint || [8, 8];
  const candidate = { x, z, w, d };
  const buildRadius = Math.max(90, Number(options.buildRadius) || 90);
  const maxServiceZ = 109 + (buildRadius - 90);

  // A runway extension is a special airside construction: it may only connect
  // to either physical end of the existing runway, never to the service yard.
  if (item.zone === 'runway') {
    const end = x < 0 ? -1 : 1;
    if (Math.abs(x - end * 68) > 4 || Math.abs(z + 16) > 3) {
      return { valid: false, reason: 'Runway extensions must connect to an existing runway end' };
    }
    if (placedBuildings.some(building => building.type === 'runway' && Math.sign(building.x || 1) === end)) {
      return { valid: false, reason: 'A runway extension already occupies this end' };
    }
    return { valid: true, reason: 'Valid runway connection' };
  }

  if (Math.abs(x) + w / 2 > buildRadius || z - d / 2 < -48 || z + d / 2 > maxServiceZ) {
    return { valid: false, reason: 'Outside airport boundary' };
  }

  if (item.zone === 'apron') {
    if (x - w / 2 < -28 || x + w / 2 > 28 || z - d / 2 < 2 || z + d / 2 > 15) {
      return { valid: false, reason: 'Gates must be placed on the aircraft apron' };
    }
    const initialGate = { x: 8, z: 8.5, w: 13, d: 10 };
    if (rectanglesOverlap(candidate, initialGate, 1.2)) {
      return { valid: false, reason: 'This gate would overlap Gate 01' };
    }
    for (const building of placedBuildings) {
      if (building.type !== 'gate') continue;
      const other = BUILDINGS.find(def => def.id === building.type);
      const footprint = other?.footprint || [13, 10];
      if (rectanglesOverlap(candidate, { x: building.x, z: building.z, w: footprint[0], d: footprint[1] }, 1.2)) {
        return { valid: false, reason: 'Gate stands need more space' };
      }
    }
    return { valid: true, reason: 'Valid gate stand' };
  }

  if (item.zone === 'taxiway') {
    if (z - d / 2 < -46 || z + d / 2 > 30.5) return { valid: false, reason: 'Taxiway segments must connect within the airside movement area' };
    const obstacles = [{ x: 0, z: 21, w: 31, d: 13 }, ...placedBuildings.map(building => {
      const def = BUILDINGS.find(entry => entry.id === building.type);
      const fp = def?.footprint || [10, 10];
      return { x: building.x, z: building.z, w: fp[0], d: fp[1] };
    })];
    for (const obstacle of obstacles) if (rectanglesOverlap(candidate, obstacle, 1)) return { valid: false, reason: 'Taxiway segment overlaps existing airport infrastructure' };
    return { valid: true, reason: 'Valid taxiway connection' };
  }

  if (z - d / 2 < 30.5 || z + d / 2 > maxServiceZ) {
    return { valid: false, reason: 'Place this facility in the marked service yard or purchased airport land' };
  }
  const fixedObstacles = [
    { x: -38, z: 34, w: 8, d: 6, label: 'Maintenance shed' },
    { x: 0, z: 21, w: 31, d: 13, label: 'Main terminal' },
    { x: 0, z: 114, w: 190, d: 8, label: 'Airport service road' },
  ];
  for (const obstacle of fixedObstacles) {
    if (rectanglesOverlap(candidate, obstacle, .8)) {
      return { valid: false, reason: `Blocked by ${obstacle.label.toLowerCase()}` };
    }
  }
  for (const building of placedBuildings) {
    const other = BUILDINGS.find(def => def.id === building.type);
    const footprint = other?.footprint || [10, 10];
    if (rectanglesOverlap(candidate, { x: building.x, z: building.z, w: footprint[0], d: footprint[1] }, 1.25)) {
      return { valid: false, reason: `Overlaps ${other?.name || 'another building'}` };
    }
  }
  return { valid: true, reason: 'Valid construction site' };
}
