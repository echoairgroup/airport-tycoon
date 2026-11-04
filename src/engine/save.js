import { getPlacementStatus } from './placement.js';

import { createAirportExpansionState, ensureAirportExpansionState } from './airport-expansion.js';

const SAVE_KEY = 'airport-tycoon-save-v4';
const LEGACY_SAVE_KEYS = ['airport-tycoon-save-v3', 'airport-tycoon-save-v2', 'airport-tycoon-save-v1'];

export function saveGame(state) {
  const snapshot = { ...state, version: 4, speed: 1, lastSavedAt: Date.now(), lastRealTime: Date.now() };
  localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
  return snapshot.lastSavedAt;
}

function migrateV1(parsed) {
  // Phase 1's original map used free placement. Re-seat legacy buildings in
  // the new service yard so the updated footprint collision system remains valid.
  const migrated = { ...parsed, version: 2 };
  const oldBuildings = parsed.buildings || [];
  const migratedBuildings = [];

  const oldGates = oldBuildings.filter(b => b.type === 'gate');
  for (const oldGate of oldGates) {
    let placed = false;
    for (const x of [-20, -6]) {
      if (getPlacementStatus('gate', x, 8.5, migratedBuildings).valid) {
        migratedBuildings.push({ ...oldGate, x, z: 8.5 });
        placed = true;
        break;
      }
    }
    if (!placed) migratedBuildings.push({ ...oldGate, x: -20, z: 8.5 });
  }

  const oldRunways = oldBuildings.filter(b => b.type === 'runway');
  for (const oldRunway of oldRunways) {
    const endX = migratedBuildings.some(b => b.type === 'runway' && b.x > 0) ? -68 : 68;
    migratedBuildings.push({ ...oldRunway, x: endX, z: -16 });
  }

  const serviceBuildings = oldBuildings.filter(b => b.type !== 'gate' && b.type !== 'runway');
  for (const oldBuilding of serviceBuildings) {
    let placed = false;
    for (let z = 31; z <= 46 && !placed; z += 1) {
      for (let x = -54; x <= 54; x += 2) {
        if (getPlacementStatus(oldBuilding.type, x, z, migratedBuildings).valid) {
          migratedBuildings.push({ ...oldBuilding, x, z });
          placed = true;
          break;
        }
      }
    }
    // Keep an unplaceable legacy item rather than silently deleting player progress.
    if (!placed) migratedBuildings.push(oldBuilding);
  }

  migrated.buildings = migratedBuildings;
  // A flight route from the previous airport layout does not match the new runway geometry.
  migrated.activeFlight = null;
  migrated.nextFlightAt = (parsed.gameMinutes || 480) + 2;
  migrated._weatherAt = undefined;
  return migrated;
}

function migrateV3(parsed) {
  const defaults = {
    version: 3,
    staff: { security: 2, handling: 3, cleaning: 1, maintenance: 1, cargo: 1 },
    activeContracts: [], completedContracts: [], contractsCompleted: 0, contractIncome: 0,
    activeIncident: null, nextIncidentAt: (parsed.gameMinutes || 480) + 90,
    cargoTonsHandled: 0, runwayCondition: 100,
    stats: { constructions: 0, incidents: 0, incidentsResolved: 0, takeoffs: 0, landings: 0, peakPassengers: 0 }
  };
  return {
    ...defaults,
    ...parsed,
    version: 3,
    staff: { ...defaults.staff, ...(parsed.staff || {}) },
    stats: { ...defaults.stats, ...(parsed.stats || {}) },
    activeContracts: Array.isArray(parsed.activeContracts) ? parsed.activeContracts : [],
    completedContracts: Array.isArray(parsed.completedContracts) ? parsed.completedContracts : []
  };
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || LEGACY_SAVE_KEYS.map(key => localStorage.getItem(key)).find(Boolean);
    if (!raw) return null;
    let parsed = JSON.parse(raw);
    if (!parsed || ![1, 2, 3, 4].includes(parsed.version) || typeof parsed.money !== 'number' || !Array.isArray(parsed.buildings)) return null;
    if (parsed.version === 1) parsed = migrateV1(parsed);
    parsed = migrateV3(parsed);
    parsed.version = 4;
    parsed.staff = { security: 2, handling: 3, cleaning: 1, maintenance: 1, cargo: 1, checkin: 0, baggage: 0, fueling: 0, catering: 0, mechanics: 0, controllers: 0, rescue: 0, pilots: 0, cabinCrew: 0, shuttle: 0, ...(parsed.staff || {}) };
    parsed.expansion = parsed.expansion || createAirportExpansionState(parsed.gameMinutes || 480);
    const expansionState = { ...parsed };
    ensureAirportExpansionState(expansionState);
    parsed.expansion = expansionState.expansion;
    parsed.nextFlightAt = Number.MAX_SAFE_INTEGER;
    const elapsedHours = Math.max(0, Math.min(8, (Date.now() - (parsed.lastRealTime || Date.now())) / 3600000));
    if (elapsedHours > .01) {
      const staffCost = Object.values(parsed.staff || {}).reduce((a, b) => a + b, 0) * 32;
      const maintenance = (parsed.buildings || []).reduce((a, b) => a + (b.upkeep || 0), 0);
      const hourlyNet = Math.max(0, 900 + (parsed.flightsCompleted || 0) * 48 - staffCost - maintenance);
      parsed.offlineEarnings = Math.floor(hourlyNet * elapsedHours * .35);
      parsed.money += parsed.offlineEarnings;
    }
    parsed.version = 4;
    parsed.lastRealTime = Date.now();
    return parsed;
  } catch {
    return null;
  }
}

export function hasSave() {
  return Boolean(localStorage.getItem(SAVE_KEY) || LEGACY_SAVE_KEYS.some(key => localStorage.getItem(key)));
}
export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
  LEGACY_SAVE_KEYS.forEach(key => localStorage.removeItem(key));
}
