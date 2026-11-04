import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_STATE } from '../src/data.js';
import { createFlightPlan } from '../src/engine/flight-planning.js';
import { tickGame, clearFlightForApproach } from '../src/engine/simulation.js';
import { createInvestment, repayLoan, settleMatureInvestments, takeLoan } from '../src/engine/economy.js';

test('player can schedule an international passenger flight', () => {
  const state = INITIAL_STATE();
  const result = createFlightPlan(state, {
    airline: 'Northstar Air', aircraft: 'a320neo', destination: 'JFK'
  });
  assert.equal(result.ok, true);
  assert.equal(result.plan.destination, 'New York JFK');
  assert.equal(state.flightPlanQueue.length, 1);
  assert.ok(result.plan.scheduledAt > state.gameMinutes);
});

test('flight planner rejects passenger aircraft assigned to a cargo airline', () => {
  const state = INITIAL_STATE();
  const result = createFlightPlan(state, {
    airline: 'CargoLink', aircraft: 'a320neo', destination: 'AMS'
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /Passenger aircraft/);
});

test('ATC can hold multiple aircraft while protecting one runway and gate', () => {
  const state = INITIAL_STATE();
  state.nextFlightAt = state.gameMinutes + 0.1;
  for (let i = 0; i < 3; i++) tickGame(state, 0.1);
  state.nextFlightAt = state.gameMinutes + 0.1;
  for (let i = 0; i < 3; i++) tickGame(state, 0.1);
  assert.equal(state.activeFlights.length, 2);
  assert.notEqual(state.activeFlights[0].id, state.activeFlights[1].id);
  assert.ok(state.activeFlights.some(flight => flight.phase === 'holding'));
  assert.equal(state.activeFlights.filter(flight => ['approach','landing-rollout','taxi-out','takeoff'].includes(flight.phase)).length, 1);
});

test('airport can borrow and repay loan principal', () => {
  const state = INITIAL_STATE();
  const cashBefore = state.money;
  assert.equal(takeLoan(state, 50000).ok, true);
  assert.equal(state.loanDebt, 50000);
  assert.equal(state.money, cashBefore + 50000);
  assert.equal(repayLoan(state, 10000).ok, true);
  assert.equal(state.loanDebt, 40000);
});

test('investment pays out its advertised return after seven in-game days', () => {
  const state = INITIAL_STATE();
  const before = state.money;
  const result = createInvestment(state, 5000);
  assert.equal(result.ok, true);
  assert.equal(state.money, before - 5000);
  state.gameMinutes = result.matureAt;
  assert.equal(settleMatureInvestments(state), 5400);
  assert.equal(state.money, before + 400);
  assert.equal(state.investments.length, 0);
});

test('manual ATC waits for controller landing clearance', () => {
  const state = INITIAL_STATE();
  state.atcMode = 'manual';
  state.nextFlightAt = state.gameMinutes + 0.1;
  for (let i = 0; i < 3; i++) tickGame(state, 0.1);
  const flight = state.activeFlights[0];
  assert.equal(flight.phase, 'holding');
  const clearance = clearFlightForApproach(state, flight.id);
  assert.equal(clearance.ok, true);
  assert.equal(flight.phase, 'approach');
  assert.equal(flight.gateId, 'initial-gate');
});
