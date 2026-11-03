export function hourlyExpenses(state) {
  const wages = Object.values(state.staff).reduce((sum, count) => sum + count * 55, 0);
  const maintenance = state.buildings.reduce((sum, building) => sum + (building.upkeep || 0), 0);
  return Math.round(280 + wages + maintenance * (state.research.includes('green-energy') ? 0.9 : 1));
}
export function hourlyIncome(state) {
  const gates = 1 + state.buildings.filter(b => b.type === 'gate').length;
  const demandBoost = state.research.includes('digital-slots') ? 1.15 : 1;
  const retail = state.buildings.filter(b => ['cafe', 'shop'].includes(b.type)).length * 260;
  const parking = state.buildings.filter(b => b.type === 'parking').length * 390;
  const operational = state.flightsCompleted > 0 ? (950 + gates * 100) : 620;
  return Math.round((operational + retail + parking) * demandBoost);
}
export function addMoney(state, amount) {
  state.money = Math.round((state.money + amount) * 100) / 100;
  if (amount >= 0) state.lifetimeRevenue += amount; else state.lifetimeExpenses += Math.abs(amount);
}
export function settleFlight(state, passengers = 64) {
  const landing = 1250;
  const passengerFees = passengers * 16;
  const handling = state.research.includes('premium-service') ? 960 : 800;
  const retail = state.buildings.filter(b => ['cafe', 'shop'].includes(b.type)).length * passengers * 2.8;
  const fuel = state.buildings.some(b => b.type === 'fuel') ? 650 : 0;
  const towerBonus = state.buildings.some(b => b.type === 'tower') ? 180 : 0;
  const runwayMultiplier = state.buildings.some(b => b.type === 'runway') ? 1.1 : 1;
  const revenue = (landing + passengerFees + handling + retail + fuel + towerBonus) * runwayMultiplier;
  const hangarMultiplier = state.buildings.some(b => b.type === 'hangar') ? 0.88 : 1;
  const operatingCost = (1050 + passengers * 2.2) * hangarMultiplier;
  const net = revenue - operatingCost;

  // Record gross income and costs separately so the finance screen remains consistent.
  addMoney(state, revenue);
  addMoney(state, -operatingCost);
  state.retailIncome += retail;
  state.totalPassengers += passengers;
  state.passengers = Math.min(999, state.passengers + passengers);
  state.flightsCompleted++;
  state.reputation = Math.min(100, state.reputation + 0.35);
  state.xp += 90;
  state.stats.takeoffs++;
  state.financialHistory.push({ label: `${state.flightsCompleted}`, income: revenue, expenses: operatingCost });
  state.financialHistory = state.financialHistory.slice(-12);
  return { revenue, operatingCost, net, passengers };
}
