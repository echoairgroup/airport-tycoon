import { BUILDINGS } from '../data.js';

function rectanglesOverlap(a, b, gap = 0) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 + gap &&
    Math.abs(a.z - b.z) < (a.d + b.d) / 2 + gap;
}

/**
 * Validates a construction footprint against the playable airport zones,
 * fixed infrastructure and every already-built facility.
 */
export function getPlacementStatus(type, x, z, placedBuildings = [], landParcels = [], rotation = 0) {
  const item = BUILDINGS.find(b => b.id === type);
  if (!item) return { valid: false, reason: 'Unknown building' };
  const baseFootprint = item.footprint || [8, 8];
  const quarterTurn = Math.abs(Math.round(rotation / 90)) % 2 === 1;
  const [w, d] = quarterTurn ? [baseFootprint[1], baseFootprint[0]] : baseFootprint;
  const candidate = { x, z, w, d };

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

  const servicePlots = [
    { minX: -90, maxX: 90, minZ: 30.5, maxZ: 109 },
    ...landParcels.map(parcel => ({
      minX: parcel.x - parcel.w / 2, maxX: parcel.x + parcel.w / 2,
      minZ: parcel.z - parcel.d / 2, maxZ: parcel.z + parcel.d / 2
    }))
  ];
  const insideServicePlot = servicePlots.some(plot =>
    x - w / 2 >= plot.minX + .35 && x + w / 2 <= plot.maxX - .35 &&
    z - d / 2 >= plot.minZ + .35 && z + d / 2 <= plot.maxZ - .35
  );

  if (item.zone === 'apron') {
    const originalApron = x - w / 2 >= -28 && x + w / 2 <= 28 && z - d / 2 >= 2 && z + d / 2 <= 15;
    const expansionApron = landParcels.some(parcel =>
      x - w / 2 >= parcel.x - parcel.w / 2 + .35 && x + w / 2 <= parcel.x + parcel.w / 2 - .35 &&
      z - d / 2 >= parcel.z - parcel.d / 2 + .35 && z + d / 2 <= parcel.z + parcel.d / 2 - .35
    );
    if (!originalApron && !expansionApron) return { valid: false, reason: 'Gates must be placed on the original apron or an owned expansion apron' };
    if (expansionApron && !placedBuildings.some(building => building.type === 'apron' &&
      x - w / 2 >= building.x - (BUILDINGS.find(def => def.id === 'apron').footprint[0] / 2) + .5 &&
      x + w / 2 <= building.x + (BUILDINGS.find(def => def.id === 'apron').footprint[0] / 2) - .5 &&
      z - d / 2 >= building.z - (BUILDINGS.find(def => def.id === 'apron').footprint[1] / 2) + .5 &&
      z + d / 2 <= building.z + (BUILDINGS.find(def => def.id === 'apron').footprint[1] / 2) - .5
    )) return { valid: false, reason: 'Build an aircraft apron pad before placing a gate on expansion land' };
    if (originalApron) {
      const initialGate = { x: 8, z: 8.5, w: 13, d: 10 };
      if (rectanglesOverlap(candidate, initialGate, 1.2)) return { valid: false, reason: 'This gate would overlap Gate 01' };
    }
    for (const building of placedBuildings) {
      if (building.type !== 'gate') continue;
      const other = BUILDINGS.find(def => def.id === building.type);
      const footprint = other?.footprint || [13, 10];
      const otherQuarterTurn = Math.abs(Math.round((building.rotation || 0) / 90)) % 2 === 1;
      const otherW = otherQuarterTurn ? footprint[1] : footprint[0];
      const otherD = otherQuarterTurn ? footprint[0] : footprint[1];
      if (rectanglesOverlap(candidate, { x: building.x, z: building.z, w: otherW, d: otherD }, 1.2)) return { valid: false, reason: 'Gate stands need more space' };
    }
    return { valid: true, reason: originalApron ? 'Valid gate stand' : 'Valid expansion gate stand' };
  }

  if (item.zone === 'airside') {
    if (!insideServicePlot) return { valid: false, reason: 'Build airside infrastructure on owned airport land' };
    for (const building of placedBuildings) {
      const other = BUILDINGS.find(def => def.id === building.type);
      const footprint = other?.footprint || [10, 10];
      const otherQuarterTurn = Math.abs(Math.round((building.rotation || 0) / 90)) % 2 === 1;
      const otherW = otherQuarterTurn ? footprint[1] : footprint[0];
      const otherD = otherQuarterTurn ? footprint[0] : footprint[1];
      if (rectanglesOverlap(candidate, { x: building.x, z: building.z, w: otherW, d: otherD }, .1)) {
        return { valid: false, reason: 'Airside pavement overlaps ' + (other?.name || 'another facility') };
      }
    }
    return { valid: true, reason: 'Valid airside construction plot' };
  }

  // Service facilities may use the original yard or any purchased expansion parcel.
  if (!insideServicePlot) {
    if (x - w / 2 < -90 || x + w / 2 > 90) {
      return { valid: false, reason: 'Outside airport boundary — purchase an expansion parcel first' };
    }
    if (z - d / 2 < 30.5 || z + d / 2 > 109) {
      return { valid: false, reason: 'Outside service yard boundary — purchase an expansion parcel first' };
    }
    return { valid: false, reason: 'Outside owned airport land — purchase an expansion parcel first' };
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
