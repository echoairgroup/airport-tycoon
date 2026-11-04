import { addMoney, applyHourlyCashFlow, settleFlight } from './economy.js';
import { CONTRACT_DEFS } from '../data.js';

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
function ensureFlightList(state) {
  if (!Array.isArray(state.activeFlights)) state.activeFlights = state.activeFlight ? [state.activeFlight] : [];
  return state.activeFlights;
}
function syncPrimaryFlight(state) {
  state.activeFlight = ensureFlightList(state)[0] || null;
}
function isRunwayOccupied(state, exceptId = null) {
  return ensureFlightList(state).some(flight =>
    flight.id !== exceptId && ['approach', 'landing-rollout', 'taxi-out', 'takeoff'].includes(flight.phase)
  );
}
function availableGate(state) {
  const flights = ensureFlightList(state);
  const gates = [START_GATE, ...state.buildings.filter(b => b.type === 'gate')];
  return gates.find(gate => !flights.some(flight => flight.gateId === gate.id)) || null;
}
function assignApproach(state, flight, gate) {
  flight.gateId = gate.id;
  setRoute(flight, [v(-66, 12, -16), v(-52, 7, -16), v(-39, 3.1, -16), v(-28, 1.19, -16)], 4.0);
  changePhase(state, flight, 'approach', {
    title: 'ATC landing clearance',
    message: `${flight.airline} ${flight.id} cleared to land runway 09. Assigned stand ${gate.id === START_GATE.id ? '01' : gate.id}.`,
    type: 'flight'
  });
}
function startFlight(state, planned = null) {
  const flights = ensureFlightList(state);
  const models = [
    { model: 'ATR 72-600', passengers: 68, kind: 'regional' },
    { model: 'Dash 8 Q400', passengers: 74, kind: 'regional' },
    { model: 'Airbus A320neo', passengers: 150, kind: 'jet' },
    { model: 'Boeing 737-800', passengers: 164, kind: 'jet' },
    { model: 'Boeing 737-800F', passengers: 0, cargoTons: 22, kind: 'cargo' },
    { model: 'Airbus A330F', passengers: 0, cargoTons: 44, kind: 'cargo' },
  ];
  const sequence = state.nextFlightNumber || (state.flightsCompleted + flights.length + 1);
  const aircraft = planned || models[(sequence - 1) % models.length];
  const airline = planned?.airline || (aircraft.kind === 'cargo'
    ? ['CargoLink', 'Northstar Freight'][sequence % 2]
    : ['SkyWays', 'Northstar Air', 'CloudJet', 'BluePeak Airways'][sequence % 4]);
  const gate = availableGate(state);
  const flight = {
    id: `AT${String(sequence).padStart(3, '0')}`,
    airline,
    model: aircraft.model,
    kind: aircraft.kind,
    passengers: planned ? planned.passengers : (aircraft.kind === 'cargo' ? 0 : Math.min(aircraft.passengers, 58 + (sequence * 7 % Math.max(1, aircraft.passengers - 57)))),
    cargoTons: planned ? planned.cargoTons : (aircraft.cargoTons || 0),
    destination: planned?.destination || ['Amsterdam', 'Copenhagen', 'London', 'Hamburg', 'Paris', 'Brussels', 'Frankfurt'][sequence % 7],
    destinationCode: planned?.destinationCode || null,
    gateId: null,
    phase: 'holding',
    timer: 0,
    position: v(-76 - flights.filter(item => item.phase === 'holding').length * 5, 14, -16),
    yaw: Math.PI / 2,
    source: planned?.source || 'automatic'
  };
  state.nextFlightNumber = sequence + 1;
  flights.push(flight);
  const firstAvailable = availableGate(state);
  if (firstAvailable && !isRunwayOccupied(state, flight.id)) assignApproach(state, flight, firstAvailable);
  else notify(state, 'Aircraft in holding', `${flight.airline} ${flight.id} is holding for runway and stand capacity.`, 'flight');
  syncPrimaryFlight(state);
  return flight;
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

function finishFlight(state, f) {
  const result = settleFlight(state, f.passengers, f.cargoTons || 0);
  state.cargoTonsHandled = (state.cargoTonsHandled || 0) + (f.cargoTons || 0);
  state.stats.peakPassengers = Math.max(state.stats.peakPassengers, state.passengers);
  state.reputation = Math.min(100, state.reputation + (state.satisfaction > 75 ? .45 : -.2));
  state.flightHistory.unshift({ id: f.id, airline: f.airline, model: f.model, passengers: f.passengers, cargoTons: f.cargoTons || 0, kind: f.kind || 'regional', destination: f.destination || 'Regional network', net: result.net, time: state.gameMinutes, status: 'Departed' });
  progressContracts(state, f);
  state.flightHistory = state.flightHistory.slice(0, 20);
  const operation = f.cargoTons ? `${f.cargoTons} tonnes of cargo delivered` : `${f.passengers} passengers served`;
  notify(state, 'Flight departed', `${f.id} took off successfully. ${operation}. Net contribution: €${Math.round(result.net).toLocaleString('en-GB')}.`, 'success');
  state.activeFlights = ensureFlightList(state).filter(item => item.id !== f.id);
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

  const flights = ensureFlightList(state);
  // Aircraft are independent entities. A single runway is protected by ATC
  // sequencing, while each occupied stand remains reserved through departure.
  for (const f of [...flights]) {
    f.timer += gameDelta;
    if (f.phase === 'holding') {
      const gate = availableGate(state);
      if (gate && !isRunwayOccupied(state, f.id)) {
        assignApproach(state, f, gate);
      } else {
        const queueIndex = flights.filter(item => item.phase === 'holding').findIndex(item => item.id === f.id);
        f.position = v(-76 - Math.max(0, queueIndex) * 5, 14 + Math.max(0, queueIndex) * 2, -16);
      }
      continue;
    }
    if (f.phase === 'approach') {
      if (advanceRoute(f, gameDelta)) {
        state.stats.landings++;
        state.runwayCondition = Math.max(40, (state.runwayCondition ?? 100) - .22);
        setRoute(f, [v(-28, 1.19, -16), v(-16, 1.19, -16), v(0, 1.19, -16), v(22, 1.19, -16)], 5.8);
        changePhase(state, f, 'landing-rollout', { title: 'Touchdown!', message: `${f.airline} ${f.id} has landed on runway 09.`, type: 'success' });
      }
    } else if (f.phase === 'landing-rollout') {
      if (advanceRoute(f, gameDelta)) {
        const gate = getGate(state, f.gateId);
        setRoute(f, routeForGate(gate), 2.7);
        changePhase(state, f, 'taxi-in', { title: 'Runway vacated', message: `${f.id} is taxiing to stand ${f.gateId === START_GATE.id ? '01' : f.gateId}.`, type: 'flight' });
      }
    } else if (f.phase === 'taxi-in') {
      if (advanceRoute(f, gameDelta)) {
        state.passengers = Math.min(999, state.passengers + Math.floor(f.passengers * .65));
        changePhase(state, f, 'parked', { title: 'At the gate', message: `${f.id} is parked. Ground handling, unloading and turnaround have started.`, type: 'success' });
      }
    } else if (f.phase === 'parked') {
      const handlingTime = state.research.includes('fast-handling') ? 12 : 17;
      if (f.timer >= handlingTime) {
        state.passengers = Math.max(0, state.passengers - Math.floor(f.passengers * .55));
        const gate = getGate(state, f.gateId);
        setRoute(f, routeForGate(gate).reverse(), 2.6);
        changePhase(state, f, 'taxi-out', { title: 'Boarding complete', message: `${f.id} has completed turnaround and is taxiing for departure.`, type: 'info' });
      }
    } else if (f.phase === 'taxi-out') {
      if (advanceRoute(f, gameDelta)) {
        setRoute(f, [v(22, 1.19, -16), v(32, 2.6, -16), v(44, 6.0, -16), v(62, 11.5, -16)], 5.5);
        changePhase(state, f, 'takeoff', { title: 'Take-off clearance', message: `${f.id} cleared for departure runway 27.`, type: 'flight' });
      }
    } else if (f.phase === 'takeoff') {
      if (advanceRoute(f, gameDelta)) finishFlight(state, f);
    }
  }

  const queuedIndex = (state.flightPlanQueue || []).findIndex(plan => plan.scheduledAt <= state.gameMinutes);
  if (queuedIndex >= 0) {
    const [plan] = state.flightPlanQueue.splice(queuedIndex, 1);
    startFlight(state, plan);
  } else if (state.gameMinutes >= state.nextFlightAt) {
    startFlight(state);
    state.nextFlightAt = state.gameMinutes + (state.research.includes('digital-slots') ? 14 : 18);
  }
  syncPrimaryFlight(state);

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
    holding: 'Holding for ATC clearance',
    approach: 'Final approach',
    'landing-rollout': 'Landing roll',
    'taxi-in': 'Taxiing to gate',
    parked: 'At gate · turnaround',
    'taxi-out': 'Taxiing to runway',
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
