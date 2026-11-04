export function hourlyIncomeBreakdown(state) {
  const gates = 1 + state.buildings.filter(b => b.type === 'gate').length;
  const demandBoost = state.research.includes('digital-slots') ? 1.15 : 1;
  return {
    airportServices: (state.flightsCompleted > 0 ? 1480 : 1180) * demandBoost,
    gateServices: gates * 190 * demandBoost,
    retail: state.buildings.filter(b => ['cafe', 'shop'].includes(b.type)).length * 420 * demandBoost,
    parking: state.buildings.filter(b => b.type === 'parking').length * 650 * demandBoost,
    hotels: state.buildings.filter(b => b.type === 'hotel').length * 950 * demandBoost,
    cargo: state.buildings.some(b => b.type === 'cargo-terminal') ? 600 * demandBoost : 0,
  };
}

export function hourlyIncome(state) {
  return Math.round(Object.values(hourlyIncomeBreakdown(state)).reduce((sum, value) => sum + value, 0));
}

export function hourlyExpenseBreakdown(state) {
  const wages = Object.values(state.staff).reduce((sum, count) => sum + count * 55, 0);
  const maintenance = state.buildings.reduce((sum, building) => sum + (building.upkeep || 0), 0);
  const runwayMaintenance = Math.max(0, 82 - (state.runwayCondition ?? 100)) * 1.35;
  const loanInterest = Math.max(0, Number(state.loanDebt) || 0) * 0.00008;
  return {
    wages,
    baseOperations: 280,
    buildingMaintenance: maintenance * (state.research.includes('green-energy') ? 0.9 : 1),
    runwayMaintenance,
    loanInterest,
  };
}

export function hourlyExpenses(state) {
  return Math.round(Object.values(hourlyExpenseBreakdown(state)).reduce((sum, value) => sum + value, 0));
}

export function addMoney(state, amount) {
  state.money = Math.round((state.money + amount) * 100) / 100;
  if (amount >= 0) state.lifetimeRevenue += amount;
  else state.lifetimeExpenses += Math.abs(amount);
}

/**
 * Pays all recurring airport revenue and expenses for the elapsed game time.
 * The simulation clock advances in game minutes, so 60 elapsed game minutes
 * represent one in-game hour. Both sides of the cash flow are booked to the
 * balance and lifetime ledger at exactly the same rate.
 */
export function applyHourlyCashFlow(state, gameMinutes) {
  if (!Number.isFinite(gameMinutes) || gameMinutes <= 0) return { income: 0, expenses: 0, net: 0 };
  const incomeParts = hourlyIncomeBreakdown(state);
  const expenseParts = hourlyExpenseBreakdown(state);
  const income = Object.values(incomeParts).reduce((sum, value) => sum + value, 0);
  const expenses = Object.values(expenseParts).reduce((sum, value) => sum + value, 0);
  const factor = gameMinutes / 60;
  addMoney(state, income * factor);
  addMoney(state, -expenses * factor);
  state.retailIncome = (state.retailIncome || 0) + incomeParts.retail * factor;
  state.parkingIncome = (state.parkingIncome || 0) + incomeParts.parking * factor;
  state.hotelIncome = (state.hotelIncome || 0) + incomeParts.hotels * factor;
  state.cargoIncome = (state.cargoIncome || 0) + incomeParts.cargo * factor;
  return { income, expenses, net: income - expenses };
}

/**
 * Airport financing: loans are liabilities, not income. Interest is booked
 * through hourlyExpenseBreakdown; principal repayments reduce cash and debt.
 */
export function takeLoan(state, amount) {
  const principal = Math.round(Number(amount) || 0);
  if (principal < 10000 || principal > 500000) return { ok: false, reason: 'amount' };
  if (!Number.isFinite(state.money)) return { ok: false, reason: 'balance' };
  state.loanDebt = Math.max(0, Number(state.loanDebt) || 0) + principal;
  state.money = Math.round((state.money + principal) * 100) / 100;
  state.loanHistory = Array.isArray(state.loanHistory) ? state.loanHistory : [];
  state.loanHistory.push({ type: 'borrow', amount: principal, time: state.gameMinutes });
  return { ok: true, amount: principal, debt: state.loanDebt };
}

export function repayLoan(state, amount) {
  const repayment = Math.round(Number(amount) || 0);
  const debt = Math.max(0, Number(state.loanDebt) || 0);
  if (repayment < 1000 || repayment > debt) return { ok: false, reason: 'amount' };
  if (state.money < repayment) return { ok: false, reason: 'funds' };
  state.money = Math.round((state.money - repayment) * 100) / 100;
  state.loanDebt = Math.max(0, debt - repayment);
  state.loanHistory = Array.isArray(state.loanHistory) ? state.loanHistory : [];
  state.loanHistory.push({ type: 'repay', amount: repayment, time: state.gameMinutes });
  state.lifetimeExpenses = (state.lifetimeExpenses || 0) + repayment;
  return { ok: true, amount: repayment, debt: state.loanDebt };
}

export function createInvestment(state, amount, label = 'Airport expansion fund') {
  const principal = Math.round(Number(amount) || 0);
  if (![5000, 10000, 25000].includes(principal)) return { ok: false, reason: 'amount' };
  if (state.money < principal) return { ok: false, reason: 'funds' };
  state.money = Math.round((state.money - principal) * 100) / 100;
  state.investments = Array.isArray(state.investments) ? state.investments : [];
  state.investments.push({
    id: `inv-${state.investments.length + 1}-${Math.floor(state.gameMinutes)}`,
    label, principal, returnValue: Math.round(principal * 1.08),
    matureAt: state.gameMinutes + 7 * 1440, status: 'active'
  });
  state.lifetimeExpenses = (state.lifetimeExpenses || 0) + principal;
  return { ok: true, amount: principal, matureAt: state.gameMinutes + 7 * 1440 };
}

export function settleMatureInvestments(state) {
  const active = Array.isArray(state.investments) ? state.investments : [];
  const remaining = [];
  let paid = 0;
  for (const investment of active) {
    if (investment.status === 'active' && state.gameMinutes >= investment.matureAt) {
      const payout = Math.max(0, Number(investment.returnValue) || 0);
      state.money = Math.round((state.money + payout) * 100) / 100;
      state.lifetimeRevenue = (state.lifetimeRevenue || 0) + payout;
      investment.status = 'matured';
      investment.paidAt = state.gameMinutes;
      paid += payout;
    }
    if (investment.status === 'active') remaining.push(investment);
  }
  state.investments = remaining;
  return paid;
}

export function settleFlight(state, passengers = 64, cargoTons = 0) {
  const landing = 1250;
  const passengerFees = passengers * 16;
  const handling = state.research.includes('premium-service') ? 960 : 800;
  const retail = state.buildings.filter(b => ['cafe', 'shop'].includes(b.type)).length * passengers * 2.8;
  const fuel = state.buildings.some(b => b.type === 'fuel') ? 650 : 0;
  const towerBonus = state.buildings.some(b => b.type === 'tower') ? 180 : 0;
  const runwayMultiplier = state.buildings.some(b => b.type === 'runway') ? 1.1 : 1;
  const cargoTerminal = state.buildings.some(b => b.type === 'cargo-terminal');
  const freightRevenue = Math.max(0, cargoTons) * 620 * (cargoTerminal ? 1.25 : 1);
  const revenue = (landing + passengerFees + handling + retail + fuel + towerBonus + freightRevenue) * runwayMultiplier;
  const hangarMultiplier = state.buildings.some(b => b.type === 'hangar') ? 0.88 : 1;
  const freightCost = Math.max(0, cargoTons) * (cargoTerminal ? 62 : 105);
  const operatingCost = (1050 + passengers * 2.2 + freightCost) * hangarMultiplier;
  const net = revenue - operatingCost;

  // Record gross income and costs separately so the finance screen remains consistent.
  addMoney(state, revenue);
  addMoney(state, -operatingCost);
  state.retailIncome = (state.retailIncome || 0) + retail;
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
