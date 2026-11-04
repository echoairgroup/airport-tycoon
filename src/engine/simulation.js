import { addMoney, applyHourlyCashFlow, settleFlight } from './economy.js';
import { CONTRACT_DEFS } from '../data.js';
import { getActiveFlights, getAvailableGate, reserveRunway, releaseRunway, reserveTaxiway, releaseTaxiway, syncPrimaryFlight } from './air-traffic.js';

const v = (x, y, z) => ({ x, y, z });
const START_GATE = { x: 8, z: 8.5, id: 'initial-gate' };

function getGate(state, id) {
  return id === START_GATE.id ? START_GATE : (state.buildings.find(b => b.id === id) || START_GATE);
}
function routeForGate(gate) {
  const x = gate?.x ?? START_GATE.x;
  const z = gate?.z ?? START_GATE.z;
  const standY = 1.08;
  const taxiY = 1.0;
  return [
    v(22, taxiY, -16), v(22, taxiY, -8), v(21, taxiY, -4),
    v(17, taxiY, -.5), v(13, standY, 3.0), v(x + 2.7, standY, z), v(x, standY, z),
  ];
}
function setRoute(flight, route, speed) {
  flight.route = route;
  flight.routeIndex = 0;
  flight.segmentDistance = 0;
  flight.moveSpeed = speed;
  flight.position = { ...route[0] };
  if (route.length > 1) flight.yaw = Math.atan2(route[1].x - route[0].x, route[1].z - route[0].z);
}
function angleDelta(a, b) {
  let d = (b - a + Math.PI) % (Math.PI * 2) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function advanceRoute(flight, gameDelta) {
  let distanceLeft = flight.moveSpeed * gameDelta;
  while (distanceLeft > 0 && flight.routeIndex < flight.route.length - 1) {
    const a = flight.route[flight.routeIndex];
    const b = flight.route[flight.routeIndex + 1];
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz) || .001;
    const remain = len - flight.segmentDistance;
    const take = Math.min(remain, distanceLeft);
    flight.segmentDistance += take;
    distanceLeft -= take;
    const t = flight.segmentDistance / len;
    flight.position = { x: a.x + dx * t, y: a.y + dy * t, z: a.z + dz * t };
    flight.targetYaw = Math.atan2(dx, dz);
    flight.yaw = (flight.yaw || flight.targetYaw) + angleDelta(flight.yaw || flight.targetYaw, flight.targetYaw) * Math.min(1, gameDelta * 1.8);
    if (flight.segmentDistance >= len - .001) {
      flight.routeIndex++;
      flight.segmentDistance = 0;
    }
  }
  return flight.routeIndex >= flight.route.length - 1;
}
function notify(state, title, message, type = 'info') {
  state.notifications.unshift({ id: `${Date.now()}-${Math.random()}`, title, message, type, time: state.gameMinutes });
  state.notifications = state.notifications.slice(0, 6);
}
function enterHolding(state, flight) {
  const otherHolding = getActiveFlights(state).filter(item => item.id !== flight.id && item.phase === 'holding');
  const lane = otherHolding.length;
  flight.phase = 'holding'; flight.timer = 0; flight.holdOffset = lane * 5.5;
  flight.holdPhase = (lane * 1.7 + (Number(flight.id.slice(2)) || 0) * .23) % (Math.PI * 2);
  flight.route = []; flight.routeIndex = 0; flight.segmentDistance = 0;
  flight.position = { x: -47 - lane * .8, y: 9 + lane * .35, z: -29 - lane * 5.5 };
  flight.yaw = Math.PI / 2;
}
function routeToFinal(flight) {
  setRoute(flight, [v(-66, 12, -16), v(-52, 7, -16), v(-39, 3.1, -16), v(-28, 1.19, -16)], 4.0);
}
export function scheduleArrival(state, options = {}) {
  const flights = getActiveFlights(state);
  const gate = getAvailableGate(state);
  if (!gate) { state.nextFlightAt = state.gameMinutes + 5; return null; }
  const sequence = Math.max(state.flightSequence || 0, (state.flightsCompleted || 0) + flights.length) + 1;
  state.flightSequence = sequence;
  const models = [
    { model: 'ATR 72-600', passengers: 68, kind: 'regional' },
    { model: 'Dash 8 Q400', passengers: 74, kind: 'regional' },
    { model: 'Airbus A320neo', passengers: 150, kind: 'jet' },
    { model: 'Boeing 737-800', passengers: 164, kind: 'jet' },
    { model: 'Boeing 737-800F', passengers: 0, cargoTons: 22, kind: 'cargo' },
    { model: 'Airbus A330F', passengers: 0, cargoTons: 44, kind: 'cargo' }
  ];
  const selectedModel = models.find(item => item.model === options.model);
  const model = selectedModel || models[(sequence - 1) % models.length];
  const destinations = ['Amsterdam', 'Copenhagen', 'London', 'Hamburg', 'Paris', 'Brussels', 'Frankfurt', 'Zurich', 'Madrid', 'Vienna', 'Oslo', 'Prague'];
  const passengerAirlines = ['SkyWays', 'Northstar Air', 'CloudJet', 'BluePeak', 'EuroConnect'];
  const cargoAirlines = ['CargoLink', 'Northstar Freight', 'AeroCargo'];
  const flight = {
    id: 'AT' + String(sequence).padStart(3, '0'),
    airline: options.airline || (model.kind === 'cargo' ? cargoAirlines[(sequence - 1) % cargoAirlines.length] : passengerAirlines[(sequence - 1) % passengerAirlines.length]),
    model: model.model, kind: model.kind,
    passengers: model.kind === 'cargo' ? 0 : Math.min(model.passengers, 58 + ((sequence - 1) * 7 % Math.max(1, model.passengers - 57))),
    cargoTons: model.cargoTons || 0, destination: destinations.includes(options.destination) ? options.destination : destinations[(sequence - 1) % destinations.length],
    gateId: gate.id, phase: 'approach', timer: 0, scheduledAt: state.gameMinutes,
    position: v(-66, 12, -16), yaw: Math.PI / 2
  };
  const inboundAlreadyActive = Boolean(state.runwayFlightId) ||
    flights.some(item => ['approach', 'landing-rollout', 'runway-exit-wait'].includes(item.phase));
  if (inboundAlreadyActive || state.runwayClosed) enterHolding(state, flight); else routeToFinal(flight);
  flights.push(flight);
  syncPrimaryFlight(state);
  state.nextFlightAt = state.gameMinutes + (state.research.includes('digital-slots') ? 14 : 18);
  notify(state, flight.phase === 'holding' ? 'Aircraft in arrival queue' : 'Aircraft on final',
    flight.airline + ' ' + flight.id + ' (' + flight.model + ') is scheduled for ' + flight.destination + '.', 'flight');
  return flight;
}
export function holdArrival(state, flightId) {
  const flight = getActiveFlights(state).find(item => item.id === flightId);
  if (!flight) return { ok: false, reason: 'missing' };
  if (flight.phase !== 'approach') return { ok: false, reason: 'not-approaching' };
  if (state.runwayFlightId === flight.id) return { ok: false, reason: 'runway-occupied' };
  enterHolding(state, flight);
  notify(state, 'ATC: aircraft instructed to hold', flight.id + ' is entering the holding pattern.', 'warning');
  return { ok: true };
}
export function clearArrival(state, flightId) {
  const flight = getActiveFlights(state).find(item => item.id === flightId);
  if (!flight) return { ok: false, reason: 'missing' };
  if (flight.phase !== 'holding') return { ok: false, reason: 'not-holding' };
  if (state.runwayClosed) return { ok: false, reason: 'runway-closed' };
  const conflict = getActiveFlights(state).some(item => item.id !== flight.id && ['approach','landing-rollout','runway-exit-wait'].includes(item.phase));
  if (conflict || state.runwayFlightId) return { ok: false, reason: 'traffic-conflict' };
  routeToFinal(flight);
  changePhase(state, flight, 'approach', { title: 'ATC: cleared for approach', message: flight.id + ' is cleared from the hold for runway 09.', type: 'flight' });
  return { ok: true };
}
export function setRunwayClosed(state, closed) {
  const next = Boolean(closed);
  if (next && state.runwayFlightId) return { ok: false, reason: 'runway-busy' };
  if (state.runwayClosed === next) return { ok: true, unchanged: true };
  state.runwayClosed = next;
  if (next) {
    for (const flight of getActiveFlights(state)) if (flight.phase === 'approach') enterHolding(state, flight);
    notify(state, 'ATC: runway closed', 'Runway 09/27 is closed. Arrivals will hold and departures will wait.', 'warning');
  } else notify(state, 'ATC: runway reopened', 'Runway 09/27 is available. Queued traffic may be cleared in sequence.', 'success');
  return { ok: true };
}

export function progressContracts(state, flight) {
  const active = Array.isArray(state.activeContracts) ? state.activeContracts : [];
  const stillActive = [];
  const completed = [];
  for (const contract of active) {
    const matchesType = contract.kind === 'any' ||
      (contract.kind === 'cargo' && (flight.cargoTons || 0) > 0) ||
      (contract.kind === 'passenger' && (flight.passengers || 0) > 0);
    const satisfiesPassengers = !contract.minimumPassengers || flight.passengers >= contract.minimumPassengers;
    const satisfiesCargo = !contract.minimumCargo || (flight.cargoTons || 0) >= contract.minimumCargo;
    const satisfiesSatisfaction = !contract.minimumSatisfaction || state.satisfaction >= contract.minimumSatisfaction;
    if (!matchesType || !satisfiesPassengers || !satisfiesCargo || !satisfiesSatisfaction) {
      stillActive.push(contract);
      continue;
    }
    const updated = { ...contract, progress: (contract.progress || 0) + 1 };
    if (updated.progress >= updated.target) {
      completed.push(updated.id);
      addMoney(state, updated.reward);
      state.contractIncome = (state.contractIncome || 0) + updated.reward;
      state.contractsCompleted = (state.contractsCompleted || 0) + 1;
      state.completedContracts = [...(state.completedContracts || []), updated.id];
      giveXP(state, updated.xp);
      notify(state, 'Airline contract completed', `${updated.name}: ${updated.client} paid ${fmtContractMoney(updated.reward)} and awarded ${updated.xp} XP.`, 'success');
    } else {
      stillActive.push(updated);
    }
  }
  state.activeContracts = stillActive;
  return completed;
}
function fmtContractMoney(amount) {
  return `€${Math.round(amount).toLocaleString('en-GB')}`;
}

const PASSENGER_GROUND_SERVICES = [
  { id: 'baggage-unload', phase: 'baggage-unload', label: 'Baggage unloading', role: 'handling', duration: 3.2 },
  { id: 'refueling', phase: 'refueling', label: 'Fuel service', role: 'maintenance', duration: 4.0, requiredBuilding: 'fuel' },
  { id: 'catering', phase: 'catering', label: 'Catering service', role: 'handling', duration: 2.8 },
  { id: 'maintenance-check', phase: 'maintenance-check', label: 'Technical inspection', role: 'maintenance', duration: 3.0 },
  { id: 'boarding', phase: 'boarding', label: 'Passenger boarding and security', role: 'security', duration: 4.6 },
  { id: 'pushback', phase: 'pushback', label: 'Pushback and tug disconnect', role: 'handling', duration: 1.9 }
];
const CARGO_GROUND_SERVICES = [
  { id: 'cargo-unload', phase: 'cargo-unload', label: 'Unload inbound freight', role: 'cargo', duration: 4.2 },
  { id: 'refueling', phase: 'refueling', label: 'Fuel service', role: 'maintenance', duration: 4.8, requiredBuilding: 'fuel' },
  { id: 'cargo-loading', phase: 'cargo-loading', label: 'Load outbound freight', role: 'cargo', duration: 5.4, requiredBuilding: 'cargo-terminal' },
  { id: 'maintenance-check', phase: 'maintenance-check', label: 'Technical inspection', role: 'maintenance', duration: 3.5 },
  { id: 'pushback', phase: 'pushback', label: 'Pushback and tug disconnect', role: 'handling', duration: 2.2 }
];

export function getGroundServicePlan(flight) {
  return (flight.cargoTons || 0) > 0 ? CARGO_GROUND_SERVICES : PASSENGER_GROUND_SERVICES;
}

export function startGroundServices(state, flight) {
  const plan = getGroundServicePlan(flight);
  flight.servicePlan = plan.map(stage => ({ ...stage }));
  flight.serviceStep = 0;
  flight.serviceRemaining = 0;
  flight.groundServiceComplete = false;
  beginGroundServiceStage(state, flight);
  notify(state, 'Aircraft turnaround started', flight.id + ' is receiving baggage, fuel, catering, inspection and boarding services.', 'info');
}

function beginGroundServiceStage(state, flight) {
  const stage = flight.servicePlan[flight.serviceStep];
  const staff = Math.max(0, state.staff?.[stage.role] || 0);
  const staffingFactor = staff >= 4 ? .72 : staff >= 2 ? .9 : staff === 1 ? 1.12 : 1.45;
  const facilityFactor = stage.requiredBuilding && !state.buildings.some(building => building.type === stage.requiredBuilding) ? 1.22 : .82;
  const researchFactor = state.research.includes('fast-handling') ? .88 : 1;
  flight.serviceRemaining = Math.max(1, stage.duration * staffingFactor * facilityFactor * researchFactor);
  flight.phase = stage.phase;
  flight.timer = 0;
  if (stage.phase === 'boarding') notify(state, 'Boarding in progress', flight.id + ' is boarding passengers and completing passenger security checks.', 'flight');
}

export function progressGroundServices(state, flight, gameDelta) {
  if (!Array.isArray(flight.servicePlan) || !flight.servicePlan.length) startGroundServices(state, flight);
  if (flight.serviceStep >= flight.servicePlan.length) return true;
  flight.serviceRemaining = Math.max(0, (flight.serviceRemaining || 0) - gameDelta);
  if (flight.serviceRemaining > 0) return false;
  flight.serviceStep++;
  if (flight.serviceStep >= flight.servicePlan.length) {
    flight.groundServiceComplete = true;
    flight.phase = 'pushback-ready';
    flight.timer = 0;
    notify(state, 'Ground services complete', flight.id + ' has completed turnaround and is ready for pushback.', 'success');
    return true;
  }
  beginGroundServiceStage(state, flight);
  return false;
}

const INCIDENT_POOL = [
  { id: 'baggage-backlog', title: 'Baggage handling backlog', description: 'A late baggage belt has created a queue. Dispatch extra ground handlers before passengers become unhappy.', staffRole: 'handling', minStaff: 4, staffedCost: 550, emergencyCost: 1450, penaltyCost: 2600, satisfactionPenalty: 5, reputationPenalty: 1.2 },
  { id: 'medical-assistance', title: 'Passenger medical assistance', description: 'A passenger needs urgent help in the terminal. Security staff and the fire station can coordinate a rapid response.', staffRole: 'security', minStaff: 3, requiredBuilding: 'fire', staffedCost: 650, emergencyCost: 1850, penaltyCost: 3200, satisfactionPenalty: 7, reputationPenalty: 1.8 },
  { id: 'runway-debris', title: 'Runway debris inspection', description: 'Operations has reported debris near the runway. An engineering crew must inspect and clear the surface.', staffRole: 'maintenance', minStaff: 2, requiredBuilding: 'maintenance', staffedCost: 500, emergencyCost: 2100, penaltyCost: 3900, satisfactionPenalty: 3, reputationPenalty: 2.1, runwayWear: 6 },
  { id: 'cargo-delay', title: 'Freight loading delay', description: 'A freight consignment is behind schedule. Dispatch the cargo team and use the cargo terminal to recover the slot.', staffRole: 'cargo', minStaff: 2, requiredBuilding: 'cargo-terminal', staffedCost: 700, emergencyCost: 1950, penaltyCost: 3400, satisfactionPenalty: 2, reputationPenalty: 1.4 }
];

function updateIncidents(state, gameDelta) {
  if (state.activeIncident) {
    state.activeIncident.remaining -= gameDelta;
    if (state.activeIncident.remaining <= 0) {
      const incident = state.activeIncident;
      addMoney(state, -incident.penaltyCost);
      state.satisfaction = Math.max(35, state.satisfaction - incident.satisfactionPenalty);
      state.reputation = Math.max(0, state.reputation - incident.reputationPenalty);
      if (incident.runwayWear) state.runwayCondition = Math.max(25, (state.runwayCondition ?? 100) - incident.runwayWear);
      state.stats.incidents = (state.stats.incidents || 0) + 1;
      notify(state, 'Incident escalated', `${incident.title} was not resolved in time. Airport reputation and finances have been affected.`, 'warning');
      state.activeIncident = null;
      state.nextIncidentAt = state.gameMinutes + 180;
    }
    return;
  }
  if (state.gameMinutes < (state.nextIncidentAt || state.gameMinutes + 90)) return;
  const incident = INCIDENT_POOL[(state.stats.incidents + state.flightsCompleted + (state.stats.incidentsResolved || 0)) % INCIDENT_POOL.length];
  state.activeIncident = { ...incident, remaining: 45, startedAt: state.gameMinutes };
  state.nextIncidentAt = state.gameMinutes + 225;
  notify(state, 'Operations alert', incident.title + ': ' + incident.description, 'warning');
}

export function resolveIncident(state, hasQualifiedTeam = false) {
  const incident = state.activeIncident;
  if (!incident) return { ok: false, reason: 'none' };
  const cost = hasQualifiedTeam ? incident.staffedCost : incident.emergencyCost;
  if (state.money < cost) return { ok: false, reason: 'funds', cost };
  addMoney(state, -cost);
  state.satisfaction = Math.min(100, state.satisfaction + 1.5);
  state.reputation = Math.min(100, state.reputation + .2);
  state.stats.incidentsResolved = (state.stats.incidentsResolved || 0) + 1;
  state.activeIncident = null;
  state.nextIncidentAt = state.gameMinutes + 225;
  notify(state, 'Incident resolved', `${incident.title} was handled by ${hasQualifiedTeam ? 'your airport team' : 'an emergency contractor'}.`, 'success');
  return { ok: true, cost };
}

function finishFlight(state, flight) {
  const result = settleFlight(state, flight.passengers, flight.cargoTons || 0);
  state.cargoTonsHandled = (state.cargoTonsHandled || 0) + (flight.cargoTons || 0);
  state.stats.peakPassengers = Math.max(state.stats.peakPassengers, state.passengers);
  state.reputation = Math.min(100, state.reputation + (state.satisfaction > 75 ? .45 : -.2));
  state.flightHistory.unshift({
    id: flight.id, airline: flight.airline, model: flight.model, passengers: flight.passengers,
    cargoTons: flight.cargoTons || 0, kind: flight.kind || 'regional',
    destination: flight.destination || 'Regional network', net: result.net, time: state.gameMinutes, status: 'Departed'
  });
  progressContracts(state, flight);
  state.flightHistory = state.flightHistory.slice(0, 20);
  const operation = flight.cargoTons ? flight.cargoTons + ' tonnes of cargo delivered' : flight.passengers + ' passengers served';
  notify(state, 'Flight departed', flight.id + ' took off for ' + flight.destination + '. ' + operation + '. Net contribution: €' + Math.round(result.net).toLocaleString('en-GB') + '.', 'success');
  releaseRunway(state, flight); releaseTaxiway(state, flight);
  state.activeFlights = getActiveFlights(state).filter(item => item.id !== flight.id);
  syncPrimaryFlight(state);
  state.lastCompletedFlightAt = state.gameMinutes;
}
function updateHoldingPattern(flight, gameDelta) {
  flight.holdPhase = (flight.holdPhase || 0) + gameDelta * .24;
  const angle = flight.holdPhase, lane = flight.holdOffset || 0;
  flight.position = { x: -47 + Math.cos(angle) * 7, y: 9 + lane * .28 + Math.sin(angle * 2) * .38, z: -29 - lane + Math.sin(angle) * 4 };
  flight.yaw = Math.atan2(-Math.sin(angle) * 4, -Math.sin(angle) * 7);
}
function updateFlightOperations(state, gameDelta) {
  const flights = getActiveFlights(state);
  const inboundActive = flights.some(flight => ['approach', 'landing-rollout', 'runway-exit-wait'].includes(flight.phase));
  if (!state.runwayClosed && !state.runwayFlightId && !inboundActive) {
    const nextArrival = flights.filter(flight => flight.phase === 'holding').sort((a, b) => (a.scheduledAt || 0) - (b.scheduledAt || 0))[0];
    if (nextArrival) {
      routeToFinal(nextArrival);
      changePhase(state, nextArrival, 'approach', { title: 'Arrival cleared', message: nextArrival.id + ' is leaving the holding pattern for final approach.', type: 'flight' });
    }
  }
  for (const flight of [...flights]) {
    flight.timer += gameDelta;
    if (flight.phase === 'holding') { updateHoldingPattern(flight, gameDelta); continue; }
    if (flight.phase === 'approach') {
      if (state.runwayClosed) { enterHolding(state, flight); continue; }
      if (advanceRoute(flight, gameDelta)) {
        if (!state.runwayClosed && reserveRunway(state, flight)) {
          state.stats.landings++;
          state.runwayCondition = Math.max(40, (state.runwayCondition ?? 100) - .22);
          setRoute(flight, [v(-28, 1.19, -16), v(-16, 1.19, -16), v(0, 1.19, -16), v(22, 1.19, -16)], 5.8);
          changePhase(state, flight, 'landing-rollout', { title: 'Touchdown!', message: flight.airline + ' ' + flight.id + ' has landed on runway 09.', type: 'success' });
        } else enterHolding(state, flight);
      }
      continue;
    }
    if (flight.phase === 'landing-rollout') {
      if (advanceRoute(flight, gameDelta)) {
        if (reserveTaxiway(state, flight)) {
          setRoute(flight, routeForGate(getGate(state, flight.gateId)), 2.7);
          releaseRunway(state, flight);
          changePhase(state, flight, 'taxi-in', { title: 'Runway vacated', message: flight.id + ' is taxiing to its assigned gate.', type: 'flight' });
        } else changePhase(state, flight, 'runway-exit-wait', { title: 'Runway exit queue', message: flight.id + ' is waiting for a clear taxiway exit.', type: 'warning' });
      }
      continue;
    }
    if (flight.phase === 'runway-exit-wait') {
      if (reserveTaxiway(state, flight)) {
        setRoute(flight, routeForGate(getGate(state, flight.gateId)), 2.7);
        releaseRunway(state, flight); changePhase(state, flight, 'taxi-in', null);
      }
      continue;
    }
    if (flight.phase === 'taxi-in') {
      if (advanceRoute(flight, gameDelta)) {
        releaseTaxiway(state, flight);
        state.passengers = Math.min(999, state.passengers + Math.floor(flight.passengers * .65));
        startGroundServices(state, flight);
      }
      continue;
    }
    if (flight.phase === 'parked') {
      // A version 3 save may resume with an aircraft already parked at its gate.
      startGroundServices(state, flight);
      continue;
    }
    if (['baggage-unload','cargo-unload','refueling','catering','maintenance-check','cargo-loading','boarding','pushback'].includes(flight.phase)) {
      progressGroundServices(state, flight, gameDelta);
      continue;
    }
    if (flight.phase === 'pushback-ready') {
      if (reserveTaxiway(state, flight)) {
        state.passengers = Math.max(0, state.passengers - Math.floor(flight.passengers * .55));
        setRoute(flight, routeForGate(getGate(state, flight.gateId)).reverse(), 2.6);
        changePhase(state, flight, 'taxi-out', { title: 'Pushback complete', message: flight.id + ' is taxiing out for departure.', type: 'info' });
      }
      continue;
    }
    if (flight.phase === 'taxi-out') {
      if (advanceRoute(flight, gameDelta)) {
        releaseTaxiway(state, flight);
        changePhase(state, flight, 'departure-queue', { title: 'Ready for departure', message: flight.id + ' is holding short while the runway is checked.', type: 'flight' });
      }
      continue;
    }
    if (flight.phase === 'departure-queue') {
      if (!state.runwayClosed && reserveRunway(state, flight)) {
        setRoute(flight, [v(22, 1.19, -16), v(32, 2.6, -16), v(44, 6.0, -16), v(62, 11.5, -16)], 5.5);
        changePhase(state, flight, 'takeoff', { title: 'Take-off clearance', message: flight.id + ' has entered the runway for departure.', type: 'flight' });
      }
      continue;
    }
    if (flight.phase === 'takeoff' && advanceRoute(flight, gameDelta)) finishFlight(state, flight);
  }
  syncPrimaryFlight(state);
}
function changePhase(state, flight, phase, message) {
  flight.phase = phase;
  flight.timer = 0;
  if (message) notify(state, message.title, message.message, message.type || 'info');
}

export function tickGame(state, realDelta) {
  const dt = Math.min(realDelta, .1) * state.speed;
  if (state.speed === 0) return;
  const gameDelta = dt;
  state.gameMinutes += gameDelta;
  updateIncidents(state, gameDelta);

  applyHourlyCashFlow(state, gameDelta);

  state.passengers = Math.max(0, state.passengers - gameDelta * .018);
  const staffTotal = Object.values(state.staff).reduce((a, b) => a + b, 0);
  const serviceBuildings = state.buildings.filter(b => ['cafe', 'shop', 'terminal', 'hotel'].includes(b.type)).length;
  const satisfactionTarget = Math.min(98, 72 + staffTotal * 1.25 + serviceBuildings * 2.2 + (state.buildings.some(b => b.type === 'hotel') ? 3 : 0) + state.research.length * 1.1 + (state.research.includes('smart-security') ? 5 : 0));
  state.satisfaction += (satisfactionTarget - state.satisfaction) * Math.min(.02, gameDelta * .002);
  if (['Rain', 'Thunderstorm', 'Fog'].includes(state.weather)) {
    state.satisfaction = Math.max(45, state.satisfaction - gameDelta * (state.buildings.some(b => b.type === 'fire') ? .003 : .006));
  }

  updateFlightOperations(state, gameDelta);
  if (state.gameMinutes >= state.nextFlightAt) scheduleArrival(state);

  if (!state._weatherAt) state._weatherAt = state.gameMinutes + 150;
  if (state.gameMinutes >= state._weatherAt) {
    const weathers = ['Sunny', 'Cloudy', 'Rain', 'Fog', 'Snow', 'Thunderstorm'];
    const previous = state.weather;
    state.weather = weathers[(Math.floor(state.gameMinutes / 150) + 2) % weathers.length];
    if (state.weather !== previous) notify(state, 'Weather update', `Conditions changed to ${state.weather.toLowerCase()}.`, 'warning');
    state._weatherAt = state.gameMinutes + 150;
  }

  if (state.xp >= state.level * 500) {
    state.xp -= state.level * 500;
    state.level++;
    addMoney(state, 2500 + state.level * 500);
    notify(state, 'Airport level increased!', `Your airport reached level ${state.level}. New facilities may be unlocked.`, 'success');
  }
  if (state.money < 0) state.satisfaction = Math.max(35, state.satisfaction - gameDelta * .025);
}

export function getGateCount(state) {
  return 1 + state.buildings.filter(b => b.type === 'gate').length;
}
export function flightPhaseLabel(phase) {
  return ({
    approach: 'Final approach',
    holding: 'Holding pattern',
    'landing-rollout': 'Landing roll',
    'runway-exit-wait': 'Waiting for taxiway',
    'taxi-in': 'Taxiing to gate',
    parked: 'At gate · turnaround',
    'baggage-unload': 'Unloading baggage',
    'cargo-unload': 'Unloading freight',
    refueling: 'Refueling',
    catering: 'Catering service',
    'maintenance-check': 'Technical inspection',
    'cargo-loading': 'Loading freight',
    boarding: 'Boarding passengers',
    pushback: 'Pushback in progress',
    'pushback-ready': 'Ready for pushback',
    'taxi-out': 'Taxiing to runway',
    'departure-queue': 'Holding short',
    takeoff: 'Taking off',
  })[phase] || 'Scheduled';
}
export function giveXP(state, amount) {
  state.xp += amount;
  while (state.xp >= state.level * 500) {
    state.xp -= state.level * 500;
    state.level++;
    addMoney(state, 2500 + state.level * 500);
    notify(state, 'Airport level increased!', `Your airport reached level ${state.level}.`, 'success');
  }
}
