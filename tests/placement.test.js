import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlacementStatus } from '../src/engine/placement.js';
import { INITIAL_STATE } from '../src/data.js';
import { applyHourlyCashFlow, hourlyExpenses, hourlyIncome, settleFlight } from '../src/engine/economy.js';
import { progressContracts, resolveIncident } from '../src/engine/simulation.js';

test('allows a facility on a clear service-yard plot', () => {
  assert.equal(getPlacementStatus('cafe', 0, 39).valid, true);
});
test('allows construction across the expanded service yard', () => {
  assert.equal(getPlacementStatus('cafe', 72, 82).valid, true);
});

test('blocks construction beyond the expanded airport boundary', () => {
  const result = getPlacementStatus('parking', 96, 82);
  assert.equal(result.valid, false);
  assert.match(result.reason, /Outside airport boundary/i);
});

test('deposits recurring hourly income into the bank balance', () => {
  const state = INITIAL_STATE();
  const before = state.money;
  const income = hourlyIncome(state);
  const expenses = hourlyExpenses(state);
  const result = applyHourlyCashFlow(state, 1);
  assert.ok(income > expenses, 'the starter airport should have a positive recurring cash flow');
  assert.equal(result.income, income);
  assert.equal(result.expenses, expenses);
  assert.ok(Math.abs(state.money - (before + (income - expenses) / 60)) < 0.02);
  assert.ok(state.lifetimeRevenue > 0);
  assert.ok(state.lifetimeExpenses > 0);
});

test('hourly revenue covers the starter airport operating costs', () => {
  const state = INITIAL_STATE();
  assert.ok(hourlyIncome(state) > hourlyExpenses(state));
});


test('blocks placement inside the runway / apron zone for service buildings', () => {
  const result = getPlacementStatus('cafe', 0, -16);
  assert.equal(result.valid, false);
  assert.match(result.reason, /service yard/i);
});

test('blocks a building that overlaps the fixed maintenance shed', () => {
  const result = getPlacementStatus('parking', -38, 38.5);
  assert.equal(result.valid, false);
  assert.match(result.reason, /maintenance shed/i);
});

test('blocks two service buildings from occupying the same footprint', () => {
  const existing = [{ id: 'cafe-a', type: 'cafe', x: 0, z: 39 }];
  const result = getPlacementStatus('shop', 0, 39, existing);
  assert.equal(result.valid, false);
  assert.match(result.reason, /overlaps/i);
});

test('allows a new gate at a separate apron stand', () => {
  assert.equal(getPlacementStatus('gate', -16, 8.5).valid, true);
});

test('blocks a gate on top of the initial Gate 01 stand', () => {
  const result = getPlacementStatus('gate', 8, 8.5);
  assert.equal(result.valid, false);
  assert.match(result.reason, /Gate 01/i);
});

test('blocks a facility whose footprint leaves the service yard boundary', () => {
  const result = getPlacementStatus('parking', 96, 39);
  assert.equal(result.valid, false);
  assert.match(result.reason, /boundary/i);
});

test('allows a runway extension only when it connects to the right runway end', () => {
  assert.equal(getPlacementStatus('runway', 68, -16).valid, true);
});

test('allows a runway extension at the left runway end', () => {
  assert.equal(getPlacementStatus('runway', -68, -16).valid, true);
});

test('blocks a runway extension in the service yard', () => {
  const result = getPlacementStatus('runway', 0, 38);
  assert.equal(result.valid, false);
  assert.match(result.reason, /runway end/i);
});

test('prevents duplicate runway extensions on the same end', () => {
  const result = getPlacementStatus('runway', 68, -16, [{ type: 'runway', x: 68, z: -16 }]);
  assert.equal(result.valid, false);
  assert.match(result.reason, /already occupies/i);
});


test('runway wear increases hourly operating expenses', () => {
  const healthy = INITIAL_STATE();
  const worn = INITIAL_STATE();
  worn.runwayCondition = 55;
  assert.ok(hourlyExpenses(worn) > hourlyExpenses(healthy));
});

test('cargo flights add freight revenue without counting passengers', () => {
  const standard = INITIAL_STATE();
  const freight = INITIAL_STATE();
  const baseRevenue = settleFlight(standard, 0, 0).revenue;
  const cargoRevenue = settleFlight(freight, 0, 20).revenue;
  assert.equal(cargoRevenue - baseRevenue, 20 * 620);
  assert.equal(freight.totalPassengers, 0);
  assert.equal(freight.flightsCompleted, 1);
});


test('cargo terminal increases freight revenue', () => {
  const standard = INITIAL_STATE();
  const specialist = INITIAL_STATE();
  specialist.buildings.push({ id: 'cargo-1', type: 'cargo-terminal', upkeep: 210 });
  const base = settleFlight(standard, 0, 20).revenue;
  const enhanced = settleFlight(specialist, 0, 20).revenue;
  assert.ok(enhanced > base);
});

test('airport hotel adds passive hourly income', () => {
  const standard = INITIAL_STATE();
  const hotel = INITIAL_STATE();
  hotel.buildings.push({ id: 'hotel-1', type: 'hotel', upkeep: 245 });
  assert.equal(hourlyIncome(hotel) - hourlyIncome(standard), 950);
});

test('qualified teams resolve incidents at the staffed response cost', () => {
  const state = INITIAL_STATE();
  state.activeIncident = {
    id: 'test-alert', title: 'Test alert', staffRole: 'maintenance', minStaff: 1,
    staffedCost: 300, emergencyCost: 1000, penaltyCost: 2000,
    satisfactionPenalty: 4, reputationPenalty: 2
  };
  const before = state.money;
  const result = resolveIncident(state, true);
  assert.equal(result.ok, true);
  assert.equal(result.cost, 300);
  assert.equal(state.money, before - 300);
  assert.equal(state.activeIncident, null);
  assert.equal(state.stats.incidentsResolved, 1);
});

test('airline contracts progress and pay out on a matching flight', () => {
  const state = INITIAL_STATE();
  state.activeContracts = [{
    id: 'regional-partner', name: 'Regional Network Partnership', client: 'Northstar Air',
    kind: 'passenger', target: 2, progress: 0, minimumPassengers: 60, reward: 12500, xp: 210
  }];
  const flight = { kind: 'regional', passengers: 72, cargoTons: 0 };
  assert.deepEqual(progressContracts(state, flight), []);
  assert.equal(state.activeContracts[0].progress, 1);
  assert.deepEqual(progressContracts(state, flight), ['regional-partner']);
  assert.equal(state.activeContracts.length, 0);
  assert.equal(state.contractsCompleted, 1);
  assert.ok(state.money >= 87500);
});

import { getActiveFlights, getAvailableGate, getTrafficSnapshot, reserveRunway, releaseRunway, reserveTaxiway, releaseTaxiway } from '../src/engine/air-traffic.js';
import { scheduleArrival } from '../src/engine/simulation.js';

test('assigns simultaneous arrivals to separate aircraft gates', () => {
  const state = INITIAL_STATE();
  state.buildings.push({ id: 'gate-west', type: 'gate', x: -16, z: 8.5 });
  const first = scheduleArrival(state);
  const second = scheduleArrival(state);
  assert.ok(first);
  assert.ok(second);
  assert.notEqual(first.gateId, second.gateId);
  assert.equal(first.phase, 'approach');
  assert.equal(second.phase, 'holding');
  assert.equal(getActiveFlights(state).length, 2);
  assert.equal(state.activeFlight.id, first.id);
});

test('does not assign a gate that is already reserved by another aircraft', () => {
  const state = INITIAL_STATE();
  const firstGate = getAvailableGate(state);
  state.activeFlights = [{ id: 'AT001', gateId: firstGate.id, phase: 'parked' }];
  assert.equal(getAvailableGate(state), null);
  const traffic = getTrafficSnapshot(state);
  assert.equal(traffic.activeAircraft, 1);
  assert.equal(traffic.occupiedGates, 1);
  assert.equal(traffic.freeGates, 0);
});

test('runway and taxiway reservations are exclusive and can be released', () => {
  const state = INITIAL_STATE();
  const first = { id: 'AT001' }, second = { id: 'AT002' };
  assert.equal(reserveRunway(state, first), true);
  assert.equal(reserveRunway(state, second), false);
  assert.equal(releaseRunway(state, second), false);
  assert.equal(releaseRunway(state, first), true);
  assert.equal(reserveTaxiway(state, first), true);
  assert.equal(reserveTaxiway(state, second), false);
  assert.equal(releaseTaxiway(state, first), true);
});

test('traffic snapshot separates arrivals, holding, taxiing and parked aircraft', () => {
  const state = INITIAL_STATE();
  state.buildings.push({ id: 'gate-west', type: 'gate', x: -16, z: 8.5 });
  state.activeFlights = [
    { id: 'AT001', gateId: 'initial-gate', phase: 'approach' },
    { id: 'AT002', gateId: 'gate-west', phase: 'holding' }
  ];
  const traffic = getTrafficSnapshot(state);
  assert.equal(traffic.activeAircraft, 2);
  assert.equal(traffic.arrivals, 2);
  assert.equal(traffic.holding, 1);
  assert.equal(traffic.occupiedGates, 2);
  assert.equal(traffic.freeGates, 0);
});

import { holdArrival, clearArrival, setRunwayClosed } from '../src/engine/simulation.js';

test('ATC can instruct an inbound arrival to enter the holding pattern', () => {
  const state = INITIAL_STATE();
  state.buildings.push({ id: 'gate-west', type: 'gate', x: -16, z: 8.5 });
  const arrival = scheduleArrival(state);
  assert.equal(holdArrival(state, arrival.id).ok, true);
  assert.equal(arrival.phase, 'holding');
});

test('ATC only clears a holding aircraft when the approach is free', () => {
  const state = INITIAL_STATE();
  state.buildings.push({ id: 'gate-west', type: 'gate', x: -16, z: 8.5 });
  const first = scheduleArrival(state);
  const second = scheduleArrival(state, { model: 'Airbus A320neo', airline: 'CloudJet', destination: 'London' });
  assert.equal(second.phase, 'holding');
  assert.equal(clearArrival(state, second.id).ok, false);
  assert.equal(holdArrival(state, first.id).ok, true);
  assert.equal(clearArrival(state, second.id).ok, true);
  assert.equal(second.phase, 'approach');
});

test('ATC runway closure holds arrivals and prevents unsafe clearances', () => {
  const state = INITIAL_STATE();
  state.buildings.push({ id: 'gate-west', type: 'gate', x: -16, z: 8.5 });
  const arrival = scheduleArrival(state);
  assert.equal(setRunwayClosed(state, true).ok, true);
  assert.equal(state.runwayClosed, true);
  assert.equal(arrival.phase, 'holding');
  const second = scheduleArrival(state);
  assert.equal(second.phase, 'holding');
  assert.equal(clearArrival(state, arrival.id).reason, 'runway-closed');
  assert.equal(setRunwayClosed(state, false).ok, true);
  assert.equal(clearArrival(state, arrival.id).ok, true);
});

import { getGroundServicePlan, startGroundServices, progressGroundServices } from '../src/engine/simulation.js';

test('passenger flights receive a complete ground-service turnaround sequence', () => {
  const state = INITIAL_STATE();
  const flight = { id: 'AT101', passengers: 120, cargoTons: 0 };
  const plan = getGroundServicePlan(flight);
  assert.deepEqual(plan.map(stage => stage.id), ['baggage-unload','refueling','catering','maintenance-check','boarding','pushback']);
  startGroundServices(state, flight);
  assert.equal(flight.phase, 'baggage-unload');
  assert.ok(flight.serviceRemaining > 0);
  let steps = 0;
  while (!flight.groundServiceComplete && steps < 2000) {
    progressGroundServices(state, flight, 0.1);
    steps++;
  }
  assert.equal(flight.groundServiceComplete, true);
  assert.equal(flight.phase, 'pushback-ready');
  assert.ok(steps > 100);
});

test('cargo flights use loading and unloading stages rather than passenger boarding', () => {
  const flight = { id: 'AT102', passengers: 0, cargoTons: 26 };
  assert.deepEqual(getGroundServicePlan(flight).map(stage => stage.id), ['cargo-unload','refueling','cargo-loading','maintenance-check','pushback']);
});
