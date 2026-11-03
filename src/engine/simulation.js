import { addMoney, hourlyExpenses, settleFlight } from './economy.js';

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
function startFlight(state) {
  const availableGates = [START_GATE, ...state.buildings.filter(b => b.type === 'gate')];
  const gate = availableGates[state.flightsCompleted % availableGates.length];
  const models = [
    { model: 'ATR 72-600', passengers: 68 },
    { model: 'Dash 8 Q400', passengers: 62 },
    { model: 'Saab 2000', passengers: 78 },
  ];
  const aircraft = models[state.flightsCompleted % models.length];
  const f = {
    id: `AT${String(state.flightsCompleted + 1).padStart(3, '0')}`,
    airline: ['SkyWays', 'Northstar Air', 'CloudJet', 'BluePeak'][state.flightsCompleted % 4],
    model: aircraft.model,
    passengers: Math.min(aircraft.passengers, 58 + (state.flightsCompleted * 7 % 27)),
    gateId: gate.id,
    phase: 'approach',
    timer: 0,
    position: v(-66, 12, -16),
    yaw: Math.PI / 2,
  };
  setRoute(f, [v(-66, 12, -16), v(-52, 7, -16), v(-39, 3.1, -16), v(-28, 1.19, -16)], 4.0);
  state.activeFlight = f;
  notify(state, 'Aircraft on final', `${f.airline} ${f.id} is descending for runway 09.`, 'flight');
}
function finishFlight(state) {
  const f = state.activeFlight;
  const result = settleFlight(state, f.passengers);
  state.stats.peakPassengers = Math.max(state.stats.peakPassengers, state.passengers);
  state.reputation = Math.min(100, state.reputation + (state.satisfaction > 75 ? .45 : -.2));
  state.flightHistory.unshift({ id: f.id, airline: f.airline, model: f.model, passengers: f.passengers, net: result.net, time: state.gameMinutes, status: 'Departed' });
  state.flightHistory = state.flightHistory.slice(0, 20);
  notify(state, 'Flight departed', `${f.id} took off successfully. Net contribution: €${Math.round(result.net).toLocaleString('en-GB')}.`, 'success');
  state.activeFlight = null;
  state.nextFlightAt = state.gameMinutes + (state.research.includes('digital-slots') ? 22 : 26);
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

  const hourlyCost = hourlyExpenses(state);
  addMoney(state, -hourlyCost / 60 * gameDelta);
  const retailCount = state.buildings.filter(b => ['cafe', 'shop'].includes(b.type)).length;
  const parkingCount = state.buildings.filter(b => b.type === 'parking').length;
  const passive = (retailCount * 22 + parkingCount * 35) * gameDelta / 60;
  if (passive > 0) {
    addMoney(state, passive);
    state.retailIncome += retailCount * 22 * gameDelta / 60;
    state.parkingIncome += parkingCount * 35 * gameDelta / 60;
  }

  state.passengers = Math.max(0, state.passengers - gameDelta * .018);
  const staffTotal = Object.values(state.staff).reduce((a, b) => a + b, 0);
  const satisfactionTarget = Math.min(97, 75 + staffTotal * 1.3 + state.buildings.filter(b => ['cafe', 'shop', 'terminal'].includes(b.type)).length * 2 + state.research.length * 1.1 + (state.research.includes('smart-security') ? 5 : 0));
  state.satisfaction += (satisfactionTarget - state.satisfaction) * Math.min(.02, gameDelta * .002);
  if (['Rain', 'Thunderstorm', 'Fog'].includes(state.weather)) {
    state.satisfaction = Math.max(45, state.satisfaction - gameDelta * (state.buildings.some(b => b.type === 'fire') ? .003 : .006));
  }

  if (state.activeFlight) {
    const f = state.activeFlight;
    f.timer += gameDelta;
    if (f.phase === 'approach') {
      if (advanceRoute(f, gameDelta)) {
        state.stats.landings++;
        setRoute(f, [v(-28, 1.19, -16), v(-16, 1.19, -16), v(0, 1.19, -16), v(22, 1.19, -16)], 5.8);
        changePhase(state, f, 'landing-rollout', { title: 'Touchdown!', message: `${f.airline} ${f.id} has landed on runway 09.`, type: 'success' });
      }
    } else if (f.phase === 'landing-rollout') {
      if (advanceRoute(f, gameDelta)) {
        const gate = getGate(state, f.gateId);
        setRoute(f, routeForGate(gate), 2.7);
        changePhase(state, f, 'taxi-in', { title: 'Runway vacated', message: `${f.id} is taxiing to its assigned gate.`, type: 'flight' });
      }
    } else if (f.phase === 'taxi-in') {
      if (advanceRoute(f, gameDelta)) {
        state.passengers = Math.min(999, state.passengers + Math.floor(f.passengers * .65));
        changePhase(state, f, 'parked', { title: 'At the gate', message: `${f.id} is parked. Passengers are disembarking and the aircraft is being serviced.`, type: 'success' });
      }
    } else if (f.phase === 'parked') {
      if (f.timer >= (state.research.includes('fast-handling') ? 12 : 17)) {
        state.passengers = Math.max(0, state.passengers - Math.floor(f.passengers * .55));
        const gate = getGate(state, f.gateId);
        setRoute(f, routeForGate(gate).reverse(), 2.6);
        changePhase(state, f, 'taxi-out', { title: 'Boarding complete', message: `${f.id} has completed turnaround and is taxiing for departure.`, type: 'info' });
      }
    } else if (f.phase === 'taxi-out') {
      if (advanceRoute(f, gameDelta)) {
        setRoute(f, [v(22, 1.19, -16), v(32, 2.6, -16), v(44, 6.0, -16), v(62, 11.5, -16)], 5.5);
        changePhase(state, f, 'takeoff', { title: 'Take-off roll', message: `${f.id} is accelerating for departure.`, type: 'flight' });
      }
    } else if (f.phase === 'takeoff') {
      if (advanceRoute(f, gameDelta)) finishFlight(state);
    }
  } else if (state.gameMinutes >= state.nextFlightAt) {
    startFlight(state);
  }

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
    state.money += 2500 + state.level * 500;
    notify(state, 'Airport level increased!', `Your airport reached level ${state.level}.`, 'success');
  }
}
