import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlacementStatus } from '../src/engine/placement.js';
import { INITIAL_STATE } from '../src/data.js';
import { hourlyExpenses, hourlyIncome, settleFlight } from '../src/engine/economy.js';
import { progressContracts, resolveIncident } from '../src/engine/simulation.js';

test('allows a facility on a clear service-yard plot', () => {
  assert.equal(getPlacementStatus('cafe', 0, 39).valid, true);
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
  const result = getPlacementStatus('parking', 48, 39);
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
  assert.equal(hourlyIncome(hotel) - hourlyIncome(standard), 520);
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
