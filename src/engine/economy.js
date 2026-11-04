export const LOAN_OFFERS = [
  { id: 'regional', name: 'Regional development loan', principal: 50000, termHours: 180, interestPerGameHour: .0011, level: 1 },
  { id: 'international', name: 'International expansion loan', principal: 150000, termHours: 360, interestPerGameHour: .0011, level: 4 },
  { id: 'hub', name: 'Airport hub investment loan', principal: 400000, termHours: 600, interestPerGameHour: .00125, level: 8 }
];

export const INVESTMENT_DEFS = [
  { id: 'terminal-retail', name: 'Terminal retail renovation', description: 'Modernise concession space to increase commercial revenue.', cost: 28000, level: 2, income: 350, upkeep: 50, icon: '🛍️' },
  { id: 'solar-generation', name: 'Airport solar generation', description: 'Install solar generation and reduce the airport energy bill.', cost: 45000, level: 3, income: 0, savings: 250, upkeep: 0, icon: '☀️' },
  { id: 'cargo-automation', name: 'Automated cargo sorting', description: 'Improve freight throughput and recurring cargo income.', cost: 85000, level: 6, income: 600, upkeep: 120, icon: '📦', requiredBuilding: 'cargo-terminal' }
];

function loanServiceBreakdown(state) {
  const loans = Array.isArray(state.loans) ? state.loans : [];
  return loans.map(loan => {
    const balance = Math.max(0, Number(loan.balance) || 0);
    const principal = Math.min(balance, (Number(loan.originalAmount) || balance) / Math.max(1, Number(loan.termHours) || 1));
    const interest = Math.max(0, balance * (Number(loan.interestPerGameHour) || 0));
    return { id: loan.id, principal, interest };
  });
}

export function takeLoan(state, offerId) {
  const offer = LOAN_OFFERS.find(item => item.id === offerId);
  if (!offer) return { ok: false, reason: 'unknown-loan' };
  if (state.level < offer.level) return { ok: false, reason: 'level', level: offer.level };
  const loans = Array.isArray(state.loans) ? state.loans : [];
  const active = loans.filter(loan => loan.balance > .01);
  if (active.length >= 2) return { ok: false, reason: 'loan-limit' };
  const loan = {
    id: 'loan-' + Date.now() + '-' + loans.length,
    offerId: offer.id, name: offer.name,
    originalAmount: offer.principal, balance: offer.principal,
    termHours: offer.termHours, hoursRemaining: offer.termHours,
    interestPerGameHour: offer.interestPerGameHour,
    createdAt: state.gameMinutes
  };
  state.loans = [...loans, loan];
  addMoney(state, offer.principal);
  return { ok: true, loan };
}

export function repayLoan(state, loanId, requestedAmount) {
  const loans = Array.isArray(state.loans) ? state.loans : [];
  const loan = loans.find(item => item.id === loanId);
  if (!loan) return { ok: false, reason: 'missing-loan' };
  const amount = Math.min(Math.max(0, Number(requestedAmount) || 0), Math.max(0, loan.balance));
  if (amount <= .01) return { ok: false, reason: 'zero-amount' };
  if (state.money < amount) return { ok: false, reason: 'funds', amount };
  addMoney(state, -amount);
  loan.balance = Math.max(0, loan.balance - amount);
  if (loan.balance <= .01) state.loans = loans.filter(item => item.id !== loanId);
  return { ok: true, amount, remaining: loan.balance };
}

export function setTaxRate(state, rate) {
  const value = Number(rate);
  if (!Number.isFinite(value)) return { ok: false, reason: 'invalid-rate' };
  state.taxRate = Math.min(.2, Math.max(.02, value));
  return { ok: true, taxRate: state.taxRate };
}

export function investInProject(state, projectId) {
  const project = INVESTMENT_DEFS.find(item => item.id === projectId);
  if (!project) return { ok: false, reason: 'unknown-project' };
  if (state.level < project.level) return { ok: false, reason: 'level', level: project.level };
  if (project.requiredBuilding && !state.buildings.some(building => building.type === project.requiredBuilding)) return { ok: false, reason: 'facility' };
  const investments = Array.isArray(state.investments) ? state.investments : [];
  if (investments.some(item => item.id === project.id)) return { ok: false, reason: 'already-owned' };
  if (state.money < project.cost) return { ok: false, reason: 'funds', amount: project.cost };
  addMoney(state, -project.cost);
  state.investments = [...investments, { ...project, purchasedAt: state.gameMinutes }];
  return { ok: true, project };
}

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
    investmentReturns: (state.investments || []).reduce((sum, item) => sum + (item.income || 0), 0),
  };
}

export function hourlyIncome(state) {
  return Math.round(Object.values(hourlyIncomeBreakdown(state)).reduce((sum, value) => sum + value, 0));
}

export function hourlyExpenseBreakdown(state) {
  const wages = Object.values(state.staff).reduce((sum, count) => sum + count * 55, 0);
  const maintenance = state.buildings.reduce((sum, building) => sum + (building.upkeep || 0), 0);
  const runwayMaintenance = Math.max(0, 82 - (state.runwayCondition ?? 100)) * 1.35;
  const investments = Array.isArray(state.investments) ? state.investments : [];
  const loanService = loanServiceBreakdown(state);
  const loanPrincipal = loanService.reduce((sum, item) => sum + item.principal, 0);
  const loanInterest = loanService.reduce((sum, item) => sum + item.interest, 0);
  const energySavings = investments.reduce((sum, item) => sum + (item.savings || 0), 0);
  const investmentUpkeep = investments.reduce((sum, item) => sum + (item.upkeep || 0), 0);
  const income = Object.values(hourlyIncomeBreakdown(state)).reduce((sum, value) => sum + value, 0);
  const preTaxExpenses = wages + 280 + maintenance + runwayMaintenance + loanPrincipal + loanInterest + investmentUpkeep;
  const taxes = Math.max(0, income - preTaxExpenses) * Math.min(.2, Math.max(.02, Number(state.taxRate) || .08));
  return {
    wages,
    baseOperations: Math.max(80, 280 - energySavings),
    buildingMaintenance: maintenance * (state.research.includes('green-energy') ? 0.9 : 1),
    runwayMaintenance,
    investmentUpkeep,
    loanPrincipal,
    loanInterest,
    taxes
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
  const loanSchedule = loanServiceBreakdown(state);
  const expenseParts = hourlyExpenseBreakdown(state);
  const income = Object.values(incomeParts).reduce((sum, value) => sum + value, 0);
  const expenses = Object.values(expenseParts).reduce((sum, value) => sum + value, 0);
  const factor = gameMinutes / 60;
  addMoney(state, income * factor);
  addMoney(state, -expenses * factor);
  for (const payment of loanSchedule) {
    const loan = (state.loans || []).find(item => item.id === payment.id);
    if (!loan) continue;
    loan.balance = Math.max(0, loan.balance - payment.principal * factor);
    loan.hoursRemaining = Math.max(0, (loan.hoursRemaining || loan.termHours) - factor);
  }
  state.loans = (state.loans || []).filter(loan => loan.balance > .01);
  state.taxPaid = (state.taxPaid || 0) + (expenseParts.taxes || 0) * factor;
  state.loanInterestPaid = (state.loanInterestPaid || 0) + (expenseParts.loanInterest || 0) * factor;
  state.retailIncome = (state.retailIncome || 0) + incomeParts.retail * factor;
  state.parkingIncome = (state.parkingIncome || 0) + incomeParts.parking * factor;
  state.hotelIncome = (state.hotelIncome || 0) + incomeParts.hotels * factor;
  state.cargoIncome = (state.cargoIncome || 0) + incomeParts.cargo * factor;
  return { income, expenses, net: income - expenses };
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
