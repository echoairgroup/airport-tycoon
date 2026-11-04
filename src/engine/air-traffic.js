export const INITIAL_GATE = Object.freeze({ x: 8, z: 8.5, id: 'initial-gate', name: 'Gate 01' });

export function getActiveFlights(state) {
  if (!Array.isArray(state.activeFlights)) state.activeFlights = state.activeFlight ? [state.activeFlight] : [];
  return state.activeFlights;
}
export function syncPrimaryFlight(state) {
  const flights = getActiveFlights(state);
  state.activeFlight = flights[0] || null;
  return state.activeFlight;
}
export function getAirportGates(state) {
  return [INITIAL_GATE, ...(state.buildings || []).filter(building => building.type === 'gate')];
}
export function getReservedGateIds(state) {
  return new Set(getActiveFlights(state).map(flight => flight.gateId).filter(Boolean));
}
export function getAvailableGate(state) {
  const reserved = getReservedGateIds(state);
  return getAirportGates(state).find(gate => !reserved.has(gate.id)) || null;
}
export function reserveRunway(state, flight) {
  if (!flight?.id || (state.runwayFlightId && state.runwayFlightId !== flight.id)) return false;
  state.runwayFlightId = flight.id;
  return true;
}
export function releaseRunway(state, flight) {
  if (!flight?.id || state.runwayFlightId !== flight.id) return false;
  state.runwayFlightId = null;
  return true;
}
export function reserveTaxiway(state, flight) {
  if (!flight?.id || (state.taxiwayFlightId && state.taxiwayFlightId !== flight.id)) return false;
  state.taxiwayFlightId = flight.id;
  return true;
}
export function releaseTaxiway(state, flight) {
  if (!flight?.id || state.taxiwayFlightId !== flight.id) return false;
  state.taxiwayFlightId = null;
  return true;
}
export function getTrafficSnapshot(state) {
  const flights = getActiveFlights(state);
  const gates = getAirportGates(state);
  const occupied = getReservedGateIds(state);
  const count = phase => flights.filter(flight => flight.phase === phase).length;
  return {
    activeAircraft: flights.length, totalGates: gates.length, occupiedGates: occupied.size,
    freeGates: Math.max(0, gates.length - occupied.size),
    arrivals: count('approach') + count('holding') + count('landing-rollout') + count('runway-exit-wait'),
    holding: count('holding'), taxiing: count('taxi-in') + count('taxi-out'),
    parked: count('parked'), departures: count('departure-queue') + count('takeoff'),
    runwayOccupied: Boolean(state.runwayFlightId), taxiwayOccupied: Boolean(state.taxiwayFlightId)
  };
}
