export const FLIGHT_DESTINATIONS = [
  { code: 'AMS', name: 'Amsterdam', region: 'Netherlands' },
  { code: 'CPH', name: 'Copenhagen', region: 'Denmark' },
  { code: 'LHR', name: 'London Heathrow', region: 'United Kingdom' },
  { code: 'HAM', name: 'Hamburg', region: 'Germany' },
  { code: 'CDG', name: 'Paris Charles de Gaulle', region: 'France' },
  { code: 'BRU', name: 'Brussels', region: 'Belgium' },
  { code: 'FRA', name: 'Frankfurt', region: 'Germany' },
  { code: 'MAD', name: 'Madrid', region: 'Spain' },
  { code: 'FCO', name: 'Rome Fiumicino', region: 'Italy' },
  { code: 'JFK', name: 'New York JFK', region: 'United States' },
  { code: 'DXB', name: 'Dubai', region: 'United Arab Emirates' },
  { code: 'SIN', name: 'Singapore Changi', region: 'Singapore' }
];

export const FLIGHT_AIRLINES = [
  'Northstar Air', 'SkyWays', 'CloudJet', 'BluePeak Airways',
  'Lowlands Connect', 'CargoLink', 'Northstar Freight'
];

export const FLIGHT_AIRCRAFT = [
  { id: 'atr72', model: 'ATR 72-600', kind: 'regional', passengers: 68, cargoTons: 0 },
  { id: 'q400', model: 'Dash 8 Q400', kind: 'regional', passengers: 74, cargoTons: 0 },
  { id: 'a320neo', model: 'Airbus A320neo', kind: 'jet', passengers: 150, cargoTons: 0 },
  { id: 'b738', model: 'Boeing 737-800', kind: 'jet', passengers: 164, cargoTons: 0 },
  { id: 'b738f', model: 'Boeing 737-800F', kind: 'cargo', passengers: 0, cargoTons: 22 },
  { id: 'a330f', model: 'Airbus A330F', kind: 'cargo', passengers: 0, cargoTons: 44 }
];

export function createFlightPlan(state, selection = {}) {
  const airline = FLIGHT_AIRLINES.includes(selection.airline) ? selection.airline : null;
  const destination = FLIGHT_DESTINATIONS.find(item => item.code === selection.destination);
  const aircraft = FLIGHT_AIRCRAFT.find(item => item.id === selection.aircraft);
  if (!airline || !destination || !aircraft) {
    return { ok: false, reason: 'Choose a valid airline, aircraft and destination.' };
  }
  if (aircraft.kind === 'cargo' && !/cargo|freight/i.test(airline)) {
    return { ok: false, reason: 'Cargo aircraft require a cargo or freight airline.' };
  }
  if (aircraft.kind !== 'cargo' && /cargo|freight/i.test(airline)) {
    return { ok: false, reason: 'Passenger aircraft require a passenger airline.' };
  }
  const queue = Array.isArray(state.flightPlanQueue) ? state.flightPlanQueue : [];
  if (queue.length >= 12) return { ok: false, reason: 'The flight schedule is full (12 queued flights).' };
  const scheduledAt = Math.max(state.gameMinutes + 5, (queue.at(-1)?.scheduledAt || state.gameMinutes) + 15);
  const plan = {
    id: `PLAN-${(state.nextFlightNumber || 1) + queue.length}`,
    airline, destination: destination.name, destinationCode: destination.code,
    model: aircraft.model, aircraft: aircraft.id, kind: aircraft.kind,
    passengers: aircraft.kind === 'cargo' ? 0 : aircraft.passengers,
    cargoTons: aircraft.cargoTons,
    scheduledAt, source: 'player'
  };
  state.flightPlanQueue = [...queue, plan];
  // A player-created slot takes precedence over the next automatic timetable slot.
  state.nextFlightAt = Math.max(state.nextFlightAt || 0, scheduledAt + 18);
  return { ok: true, plan };
}
