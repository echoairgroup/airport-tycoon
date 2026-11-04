export const BUILDINGS = [
  { id: 'gate', name: 'Aircraft Gate', category: 'Operations', icon: '🛫', cost: 12500, upkeep: 85, level: 1, description: 'Adds one aircraft parking stand and increases flight capacity.', size: 3.2, footprint: [12, 10], zone: 'apron', xp: 90 },
  { id: 'cafe', name: 'Airport Café', category: 'Passenger', icon: '☕', cost: 6800, upkeep: 55, level: 1, description: 'Earns retail income and improves passenger satisfaction.', size: 3.8, footprint: [10, 9], zone: 'service', xp: 55 },
  { id: 'parking', name: 'Car Park', category: 'Transport', icon: '🅿️', cost: 9200, upkeep: 70, level: 1, description: 'Provides passenger parking and a steady stream of income.', size: 4.2, footprint: [16, 12], zone: 'service', xp: 70 },
  { id: 'tower', name: 'Control Tower', category: 'Operations', icon: '🗼', cost: 18500, upkeep: 140, level: 2, description: 'Improves runway capacity and airport reputation.', size: 3.4, footprint: [9, 9], zone: 'service', xp: 120 },
  { id: 'fire', name: 'Fire Station', category: 'Safety', icon: '🚒', cost: 22000, upkeep: 180, level: 3, description: 'Reduces the impact of airport incidents and emergencies.', size: 4.2, footprint: [14, 11], zone: 'service', xp: 130 },
  { id: 'hangar', name: 'Aircraft Hangar', category: 'Operations', icon: '🛩️', cost: 26000, upkeep: 160, level: 4, description: 'Adds maintenance capacity and supports larger aircraft.', size: 5, footprint: [17, 14], zone: 'service', xp: 150 },
  { id: 'terminal', name: 'Terminal Extension', category: 'Passenger', icon: '🏢', cost: 30000, upkeep: 220, level: 5, description: 'Increases passenger processing and comfort capacity.', size: 5, footprint: [19, 12], zone: 'service', xp: 175 },
  { id: 'runway', name: 'Runway Extension', category: 'Infrastructure', icon: '🛬', cost: 42000, upkeep: 260, level: 6, description: 'Improves airport capacity for medium-sized aircraft.', size: 8, footprint: [50, 15], zone: 'runway', xp: 220 },
  { id: 'shop', name: 'Duty-free Shop', category: 'Passenger', icon: '🛍️', cost: 14500, upkeep: 95, level: 4, description: 'Increases retail spending and passenger satisfaction.', size: 3.5, footprint: [10, 9], zone: 'service', xp: 95 },
  { id: 'fuel', name: 'Fuel Depot', category: 'Operations', icon: '⛽', cost: 17000, upkeep: 110, level: 5, description: 'Unlocks additional fuel-service revenue per flight.', size: 3.8, footprint: [8, 9], zone: 'service', xp: 110 },
  { id: 'cargo-terminal', name: 'Cargo Terminal', category: 'Logistics', icon: '📦', cost: 36500, upkeep: 210, level: 5, description: 'Boosts freight revenue and cuts cargo handling costs. Required for premium cargo contracts.', size: 5.2, footprint: [18, 12], zone: 'service', xp: 190 },
  { id: 'hotel', name: 'Airport Hotel', category: 'Passenger', icon: '🏨', cost: 42500, upkeep: 245, level: 6, description: 'Adds hotel income and improves passenger satisfaction.', size: 5.3, footprint: [17, 14], zone: 'service', xp: 210 },
  { id: 'maintenance', name: 'Engineering Depot', category: 'Infrastructure', icon: '🧰', cost: 28500, upkeep: 155, level: 4, description: 'Gives your maintenance team the equipment to respond to runway and equipment incidents.', size: 4.5, footprint: [14, 11], zone: 'service', xp: 155 }
];

export const RESEARCH = [
  { id: 'fast-handling', name: 'Rapid Turnaround', category: 'Aircraft handling', icon: '⏱️', cost: 8500, duration: 45, description: 'Aircraft turnaround time reduced by 15%.', effect: 'turnaround', level: 1 },
  { id: 'smart-security', name: 'Smart Security', category: 'Passenger processing', icon: '🛂', cost: 11000, duration: 60, description: 'Passenger satisfaction +5 and processing capacity +10%.', effect: 'satisfaction', level: 2 },
  { id: 'green-energy', name: 'LED Apron Lighting', category: 'Energy efficiency', icon: '💡', cost: 14000, duration: 75, description: 'Building maintenance costs reduced by 10%.', effect: 'maintenance', level: 3 },
  { id: 'digital-slots', name: 'Digital Slot Planning', category: 'Airport automation', icon: '📡', cost: 22000, duration: 90, description: 'Flight demand increases by 15%.', effect: 'demand', level: 5 },
  { id: 'premium-service', name: 'Premium Ground Service', category: 'Aircraft handling', icon: '⭐', cost: 32000, duration: 120, description: 'Earn 20% more from flight handling.', effect: 'revenue', level: 7 }
];

export const INITIAL_STATE = () => ({
  version: 5, money: 75000, level: 1, xp: 0, reputation: 50, satisfaction: 82,
  passengers: 0, totalPassengers: 0, cargoTonsHandled: 0, runwayCondition: 100, gameMinutes: 8 * 60, speed: 1, weather: 'Sunny',
  buildings: [], staff: { security: 2, handling: 3, cleaning: 1, maintenance: 1, cargo: 1 },
  research: [], researchInProgress: null, missionsClaimed: [], flightsCompleted: 0, flightsCancelled: 0,
  lifetimeRevenue: 0, lifetimeExpenses: 0, retailIncome: 0, parkingIncome: 0,
  flightHistory: [], notifications: [], nextFlightAt: 8 * 60 + 1, activeFlight: null, activeFlights: [], flightSequence: 0, runwayFlightId: null, taxiwayFlightId: null, runwayClosed: false, loans: [], taxRate: .08, taxPaid: 0, loanInterestPaid: 0, investments: [],
  activeContracts: [], completedContracts: [], contractsCompleted: 0, contractIncome: 0,
  activeIncident: null, nextIncidentAt: 8 * 60 + 90,
  stats: { constructions: 0, incidents: 0, incidentsResolved: 0, takeoffs: 0, landings: 0, peakPassengers: 0 },
  tutorialStep: 0, tutorialComplete: false, lastSavedAt: Date.now(), lastRealTime: Date.now(),
  financialHistory: []
});

export const MISSION_DEFS = [
  { id: 'first-arrival', title: 'Welcome to the skies', description: 'Handle your first arriving aircraft.', reward: 2500, xp: 100, goal: 1, metric: 'landings', icon: '🛬' },
  { id: 'passenger-100', title: 'First 100 passengers', description: 'Welcome 100 passengers to your airport.', reward: 4000, xp: 130, goal: 100, metric: 'totalPassengers', icon: '♙' },
  { id: 'build-gate', title: 'Room to grow', description: 'Build an additional aircraft gate.', reward: 3500, xp: 100, goal: 1, metric: 'extraGates', icon: '🛫' },
  { id: 'cash-100k', title: 'Money is rolling in', description: 'Reach a cash balance of €100,000.', reward: 7500, xp: 180, goal: 100000, metric: 'money', icon: '€' },
  { id: 'cargo-100', title: 'Freight forwarding', description: 'Handle 100 tonnes of cargo.', reward: 9000, xp: 200, goal: 100, metric: 'cargoTonsHandled', icon: '📦' },
  { id: 'contracts-3', title: 'Airline partner', description: 'Complete three airline contracts.', reward: 11000, xp: 240, goal: 3, metric: 'contractsCompleted', icon: '🤝' }
];

export const CONTRACT_DEFS = [
  { id: 'regional-partner', name: 'Regional Network Partnership', client: 'Northstar Air', description: 'Operate two passenger flights with at least 60 passengers each.', kind: 'passenger', target: 2, minimumPassengers: 60, reward: 12500, xp: 210, level: 1, icon: '🛩️' },
  { id: 'cargo-express', name: 'Cargo Express Agreement', client: 'CargoLink', description: 'Complete two freight flights carrying at least 20 tonnes each.', kind: 'cargo', target: 2, minimumCargo: 20, reward: 16500, xp: 260, level: 3, icon: '📦', requiredBuilding: 'cargo-terminal' },
  { id: 'airport-showcase', name: 'Airport Showcase', client: 'Regional Tourism Board', description: 'Complete three scheduled flights with passenger satisfaction above 70%.', kind: 'any', target: 3, minimumSatisfaction: 70, reward: 18000, xp: 300, level: 4, icon: '🌍' },
  { id: 'premium-turnaround', name: 'Premium Turnaround Service', client: 'BluePeak Airways', description: 'Complete two passenger flights while maintaining at least 80% satisfaction.', kind: 'passenger', target: 2, minimumPassengers: 75, minimumSatisfaction: 80, reward: 21000, xp: 340, level: 6, icon: '⭐' }
];
