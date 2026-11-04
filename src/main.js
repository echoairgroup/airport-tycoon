import { AirportWorld } from './world/World.js';
import { INITIAL_STATE, BUILDINGS, RESEARCH, MISSION_DEFS, CONTRACT_DEFS } from './data.js';
import { saveGame, loadGame, hasSave, deleteSave } from './engine/save.js';
import { hourlyExpenses, hourlyIncome, hourlyIncomeBreakdown, hourlyExpenseBreakdown, addMoney, LOAN_OFFERS, INVESTMENT_DEFS, takeLoan, repayLoan, setTaxRate, investInProject } from './engine/economy.js';
import { tickGame, flightPhaseLabel, giveXP, resolveIncident, scheduleArrival, holdArrival, clearArrival, setRunwayClosed } from './engine/simulation.js';
import { getPlacementStatus as validatePlacement } from './engine/placement.js';

let state = INITIAL_STATE();
let world;
let currentTab = 'overview';
let selectedBuild = null;
let selectedCategory = 'All';
let lastFrame = performance.now();
let lastAutosave = 0;
let lastSimulationNotification = 0;
let panelOpen = true;
let toastQueue = [];
let tutorialVisible = false;
let graphicsQuality = 'High';

const $ = id => document.getElementById(id);
const fmt = n => `€${Math.round(n).toLocaleString('en-GB')}`;
const fmtSigned = n => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`;
const timeLabel = minutes => `${String(Math.floor(minutes / 60) % 24).padStart(2,'0')}:${String(Math.floor(minutes) % 60).padStart(2,'0')}`;
const totalStaff = () => Object.values(state.staff).reduce((a,b)=>a+b,0);
const extraGates = () => state.buildings.filter(b=>b.type==='gate').length;
const allBuildings = () => state.buildings.length + 3;
const activeFlightList = () => Array.isArray(state.activeFlights) ? state.activeFlights : (state.activeFlight ? [state.activeFlight] : []);

function bootWorld() {
  world = new AirportWorld($('game-world'), onWorldClick, onWorldHover);
  world.addInitialGate();
  for (const building of state.buildings) world.addBuilding(building);
  world.setWeather(state.weather);
  world.syncFlights(activeFlightList());
}

function beginGame(loaded = false) {
  $('main-menu').classList.add('hidden');
  for (const id of ['topbar','sidebar','bottom-controls']) $(id).classList.remove('hidden');
  $('panel').classList.remove('hidden');
  $('panel').classList.add('collapsed'); panelOpen = false; $('panel-toggle').textContent = '›';
  if (loaded && state.offlineEarnings) {
    notifyLocal('Welcome back!', `Your airport earned ${fmt(state.offlineEarnings)} while you were away.`, 'success');
    delete state.offlineEarnings;
  }
  renderPanel(); refreshHUD();
  if (!state.tutorialComplete && state.tutorialStep < 6) showTutorial();
}

function startNewGame() {
  state = INITIAL_STATE();
  world.dispose();
  $('game-world').innerHTML = '';
  bootWorld();
  beginGame(false);
  saveNow(false);
  notifyLocal('Welcome, airport manager!', 'Your regional airport is ready. Your first flight is already scheduled.', 'success');
}

function loadSavedGame() {
  const saved = loadGame();
  if (!saved) { notifyLocal('No valid save found', 'Start a new airport to begin playing.', 'warning'); return; }
  state = { ...INITIAL_STATE(), ...saved };
  world.dispose(); $('game-world').innerHTML=''; bootWorld(); beginGame(true);
  if (state.offlineEarnings) { const earned=state.offlineEarnings; notifyLocal('Offline earnings', `You earned ${fmt(earned)} while away.`, 'success'); delete state.offlineEarnings; }
}

function saveNow(showToast = true) {
  try {
    saveGame(state);
    if (showToast) notifyLocal('Game saved', 'Your airport progress has been saved in this browser.', 'success');
    updateMenuSaveLabel();
  } catch (error) {
    console.error(error); notifyLocal('Save failed', 'Browser storage may be full or unavailable.', 'warning');
  }
}

function updateMenuSaveLabel() {
  $('menu-save-label').textContent = hasSave() ? 'Saved airport detected · Continue your progress anytime.' : 'A new airport is waiting for you.';
  $('load-button').classList.toggle('hidden', !hasSave());
  $('play-button').innerHTML = hasSave() ? '▶ &nbsp; CONTINUE AIRPORT' : '▶ &nbsp; PLAY';
}

function notifyLocal(title, message, type = 'info') {
  const item = { id: `${Date.now()}-${Math.random()}`, title, message, type };
  toastQueue.unshift(item); toastQueue = toastQueue.slice(0,4); renderToasts();
}
function renderToasts() {
  $('toast-stack').innerHTML = toastQueue.slice(0,4).map(t => `<div class="toast ${t.type}"><span class="toast-symbol">${t.type==='success'?'✓':t.type==='warning'?'!':t.type==='flight'?'✈':'•'}</span><div><b>${t.title}</b><p>${t.message}</p></div><button data-dismiss-toast="${t.id}" aria-label="Dismiss">×</button></div>`).join('');
}
function onWorldHover(pos) {
  if (!selectedBuild) return;
  const item = BUILDINGS.find(x => x.id === selectedBuild);
  const result = getPlacementStatus(selectedBuild, pos.x, pos.z);
  $('hint-text').textContent = result.valid
    ? `${item?.name || 'Building'} · X ${pos.x}, Z ${pos.z} · Clear site`
    : `${result.reason} · X ${pos.x}, Z ${pos.z}`;
  $('world-coords').textContent = `X ${pos.x}  ·  Z ${pos.z}`;
  world.updatePreview(result.valid);
}

function getPlacementStatus(type, x, z) {
  return validatePlacement(type, x, z, state.buildings);
}

function onWorldClick(pos) {
  if (!selectedBuild) return;
  const item=BUILDINGS.find(b=>b.id===selectedBuild);
  if(!item) return;
  if(state.level<item.level){notifyLocal('Building locked',`Reach airport level ${item.level} to unlock ${item.name}.`,'warning');return;}
  if(state.money<item.cost){notifyLocal('Not enough funds',`You need ${fmt(item.cost-state.money)} more to build ${item.name}.`,'warning');return;}
  const placement = getPlacementStatus(selectedBuild, pos.x, pos.z); if(!placement.valid){notifyLocal('Cannot build here', placement.reason + '. Move the preview to a clear plot.','warning');return;}
  addMoney(state,-item.cost);
  const building={id:`b-${Date.now()}-${Math.floor(Math.random()*1000)}`,type:item.id,x:pos.x,z:pos.z,upkeep:item.upkeep,name:item.name};
  state.buildings.push(building); state.stats.constructions++; giveXP(state,item.xp);
  world.addBuilding(building);
  notifyLocal('Construction complete',`${item.name} is now operational. Maintenance: ${fmt(item.upkeep)} / hour.`,'success');
  selectedBuild=null; world.clearPlacement(); $('world-hint').classList.add('hidden');
  currentTab='build'; setActiveTab('build'); renderPanel(); refreshHUD();
}

function setActiveTab(tab) {
  currentTab=tab;
  document.querySelectorAll('.nav-button').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===tab));
  $('panel').classList.remove('collapsed'); panelOpen=true; $('panel-toggle').textContent='‹';
}
function togglePanel() {
  panelOpen = !panelOpen;
  $('panel').classList.toggle('collapsed', !panelOpen);
  $('panel-toggle').textContent = panelOpen ? '‹' : '›';
}

function openBuild(type) {
  const item=BUILDINGS.find(b=>b.id===type); if(!item) return;
  $('panel').classList.remove('collapsed'); panelOpen = true; $('panel-toggle').textContent = '‹';
  if(state.level<item.level){notifyLocal('Locked',`${item.name} unlocks at level ${item.level}.`,'warning');return;}
  if(state.money<item.cost){notifyLocal('Not enough funds',`You need ${fmt(item.cost-state.money)} to build this.`,'warning');return;}
  selectedBuild=type; world.setPlacement(type, item.footprint || [8,8]); $('world-hint').classList.remove('hidden'); $('hint-text').textContent=`${item.name} selected · Green preview = valid plot`; notifyLocal('Placement mode',`Click an open area to place ${item.name}. Press Esc to cancel.`,'info');
}
function cancelBuild() { selectedBuild=null; world?.clearPlacement(); $('world-hint').classList.add('hidden'); }

function renderPanel() {
  const content=$('panel-content');
  if(!content) return;
  const template={
    overview:renderOverview, operations:renderOperations, atc:renderATC, build:renderBuild, flights:renderFlights, aircraft:renderAircraft,
    employees:renderEmployees, passengers:renderPassengers, finances:renderFinances, contracts:renderContracts,
    research:renderResearch, missions:renderMissions, statistics:renderStatistics, settings:renderSettings, guide:renderGuide
  }[currentTab] || renderOverview;
  content.innerHTML=template();
}
function panelHeader(kicker,title,desc,action='') { return `<div class="panel-header"><div><div class="panel-kicker">${kicker}</div><h2>${title}</h2><p>${desc}</p></div>${action}</div>`; }
function statCard(label,value,sub,icon,accent='blue') { return `<div class="stat-card ${accent}"><div class="stat-card-top"><span>${label}</span><b>${icon}</b></div><strong>${value}</strong><small>${sub}</small></div>`; }

function incidentTeamReady(incident) {
  if (!incident) return false;
  const roleReady = (state.staff?.[incident.staffRole] || 0) >= incident.minStaff;
  const facilityReady = !incident.requiredBuilding || state.buildings.some(b => b.type === incident.requiredBuilding);
  return roleReady && facilityReady;
}
function renderIncidentCard() {
  const incident = state.activeIncident;
  if (!incident) {
    const next = Math.max(0, Math.ceil((state.nextIncidentAt || state.gameMinutes + 90) - state.gameMinutes));
    return `<div class="incident-clear-card"><span class="incident-symbol">✓</span><div><b>Operations stable</b><small>No active incident · Next review in about ${next} game minutes</small></div><span class="status-pill active">STABLE</span></div>`;
  }
  const ready = incidentTeamReady(incident);
  const cost = ready ? incident.staffedCost : incident.emergencyCost;
  return `<div class="incident-card"><div class="incident-card-top"><span class="incident-symbol">!</span><span class="status-pill warning">ACTION REQUIRED</span><small>${Math.max(0,Math.ceil(incident.remaining))} GAME MIN LEFT</small></div><b>${incident.title}</b><p>${incident.description}</p><div class="incident-response-row"><span>${ready ? 'Qualified team available' : 'External response required'}</span><button class="primary-small" data-action="respond-incident">DISPATCH · ${fmt(cost)}</button></div></div>`;
}
function renderOperations() {
  const condition = Math.round(state.runwayCondition ?? 100);
  const conditionLabel = condition >= 85 ? 'Excellent' : condition >= 65 ? 'Serviceable' : condition >= 45 ? 'Worn' : 'Critical';
  const trafficCount = activeFlightList().length; const status = trafficCount ? trafficCount + ' aircraft active · ' + flightPhaseLabel(state.activeFlight.phase) : 'No active aircraft';
  const capacities = [
    ['Passenger processing', 120 + state.buildings.filter(b => b.type === 'terminal').length * 100, 'passengers'],
    ['Aircraft stands', 1 + extraGates(), 'gates'],
    ['Cargo facility', state.buildings.some(b => b.type === 'cargo-terminal') ? 'Online' : 'Not built', ''],
    ['Engineering support', state.buildings.some(b => b.type === 'maintenance') ? 'Online' : 'Basic crew', '']
  ];
  return `${panelHeader('AIRPORT OPERATIONS','Operations centre','Monitor runway health, incident response, handling capacity and the live operating picture.')}
    <div class="operations-hero"><div><small>LIVE AIRPORT STATUS</small><strong>${state.activeIncident ? 'ATTENTION REQUIRED' : 'ALL SYSTEMS STABLE'}</strong><span>${status}</span></div><span class="operations-live-dot"></span></div>
    <div class="section-title"><h3>Incident response</h3><span class="muted-label">AIRPORT SAFETY</span></div>${renderIncidentCard()}
    <div class="section-title"><h3>Runway integrity</h3><span class="muted-label">09 / 27</span></div>
    <div class="runway-condition-card"><div class="runway-condition-heading"><b>Surface condition</b><strong>${condition}%</strong></div><div class="satisfaction-bar"><i style="width:${condition}%"></i></div><small>${conditionLabel} · Each landing adds wear. Repairs protect reliability.</small><button class="secondary-small" data-tab="finances">OPEN FINANCES & MAINTENANCE →</button></div>
    <div class="section-title"><h3>Airport capacity</h3><span class="muted-label">FACILITIES</span></div>
    <div class="content-card">${capacities.map(([label,value,unit])=>`<div class="facility-row"><span>${label}</span><b>${value}${unit ? ' '+unit : ''}</b></div>`).join('')}</div>
    <div class="section-title"><h3>Operational readiness</h3><span class="muted-label">STAFF & FACILITIES</span></div>
    <div class="readiness-list">${[['Security','security',3,'fire'],['Ground handling','handling',4,null],['Cleaning','cleaning',2,null],['Maintenance','maintenance',2,'maintenance'],['Cargo','cargo',2,'cargo-terminal']].map(([name,role,min,building])=>{const staffed=(state.staff[role]||0)>=min, built=!building||state.buildings.some(b=>b.type===building);return `<div class="readiness-row"><span>${name}</span><b class="${staffed&&built?'good-text':'bad-text'}">${state.staff[role]||0} staff · ${staffed&&built?'READY':'NEEDS ATTENTION'}</b></div>`;}).join('')}</div>`;
}

function renderOverview() {
  const f=state.activeFlight;
  const objective=state.missionsClaimed.length>=MISSION_DEFS.length?'All starter missions complete':MISSION_DEFS.find(m=>!state.missionsClaimed.includes(m.id))?.title||'Expand your airport';
  return `${panelHeader('AIRPORT CONTROL','Airport overview','A live snapshot of your airport operations.',`<button class="small-action" data-action="focus">◎ Focus airport</button>`)}
  <div class="stat-grid">${statCard('AIRPORT RATING',`${Math.round(state.reputation)}%`,'Public reputation','★','purple')}${statCard('PASSENGERS ON SITE',Math.floor(state.passengers).toLocaleString('en-GB'),'Currently in your airport','♙','teal')}${statCard('FLIGHTS COMPLETED',state.flightsCompleted,'Successful departures','✈','orange')}</div>
  <div class="section-title"><h3>Live operations</h3><span class="live-label"><i></i> LIVE SIMULATION</span></div>
  <div class="flight-live-card">${f?`<div class="flight-route-icon">✈</div><div class="flight-live-main"><div class="flight-label">${f.id} · ${f.airline}</div><strong>${f.model}</strong><p>${flightPhaseLabel(f.phase)} · ${f.passengers} passengers · Gate ${f.gateId==='initial-gate'?'01':String(state.buildings.findIndex(b=>b.id===f.gateId)+2).padStart(2,'0')}</p></div><div class="flight-live-status"><span class="status-pill active">${f.phase==='approach'?'ARRIVING':f.phase==='takeoff'?'DEPARTING':'IN PROGRESS'}</span><small>ETA · LIVE</small></div>`:`<div class="flight-route-icon muted">✈</div><div class="flight-live-main"><div class="flight-label">NO AIRCRAFT CURRENTLY MOVING</div><strong>Next arrival scheduled</strong><p>Expected in ${Math.max(0,Math.ceil(state.nextFlightAt-state.gameMinutes))} game minutes.</p></div><div class="flight-live-status"><span class="status-pill">STANDBY</span></div>`}</div>
  <div class="section-title"><h3>Operations alerts</h3><span class="muted-label">SAFETY & RELIABILITY</span></div>${renderIncidentCard()}
  <div class="two-col"><div class="content-card"><div class="card-heading"><h3>Airport development</h3><span class="tiny-tag">LEVEL ${state.level}</span></div><div class="objective-row"><span class="objective-icon">⚑</span><div><b>${objective}</b><small>Your next milestone</small></div><button class="text-action" data-tab="missions">VIEW →</button></div><div class="mini-progress"><div style="width:${Math.min(100,state.xp/(state.level*500)*100)}%"></div></div><div class="mini-progress-label"><span>${state.xp} XP</span><span>${state.level*500} XP</span></div></div>
  <div class="content-card"><div class="card-heading"><h3>Airport facilities</h3><span class="tiny-tag">${allBuildings()} BUILT</span></div><div class="facility-row"><span>🛬 Runway</span><b class="good-text">Operational</b></div><div class="facility-row"><span>🏢 Terminal</span><b class="good-text">Operational</b></div><div class="facility-row"><span>🛫 Aircraft gates</span><b>${1+extraGates()} active</b></div><div class="facility-row"><span>♙ Airport employees</span><b>${totalStaff()} on duty</b></div></div></div>
  <div class="section-title"><h3>Recent notifications</h3><span class="muted-label">LATEST EVENTS</span></div><div class="event-list">${state.notifications.slice(0,4).map(n=>`<div class="event-item"><span class="event-dot ${n.type}"></span><div><b>${n.title}</b><small>${n.message}</small></div><time>${timeLabel(n.time||state.gameMinutes)}</time></div>`).join('')||'<div class="empty-state">No new airport events. Everything is quiet.</div>'}</div>`;
}
function renderBuild() {
  const cats=['All','Operations','Passenger','Transport','Safety','Infrastructure','Logistics'];
  const items=BUILDINGS.filter(b=>(selectedCategory==='All'||b.category===selectedCategory));
  return `${panelHeader('AIRPORT DEVELOPMENT','Build & expand','Choose from the expanded construction campus behind the terminal. Buildings have real footprints and cannot overlap infrastructure or other facilities.',`<button class="small-action" data-action="cancel-build">✕ Cancel placement</button>`)}
  <div class="category-tabs">${cats.map(c=>`<button class="category-tab ${selectedCategory===c?'active':''}" data-category="${c}">${c}</button>`).join('')}</div>
  <div class="build-list">${items.map(b=>{const locked=state.level<b.level;const active=selectedBuild===b.id;return `<div class="build-card ${locked?'locked':''} ${active?'selected':''}"><div class="build-icon">${b.icon}</div><div class="build-info"><div class="build-title-row"><b>${b.name}</b>${locked?`<span class="lock-label">LVL ${b.level}</span>`:`<span class="available-label">AVAILABLE</span>`}</div><p>${b.description}</p><div class="build-meta"><span>↗ ${fmt(b.cost)}</span><span>⌁ ${fmt(b.upkeep)}/hr</span><span>⌂ ${b.category}</span></div></div><button class="build-select ${active?'chosen':''}" data-build="${b.id}" ${locked?'disabled':''}>${locked?'LOCKED':active?'SELECTED':'PLACE'}</button></div>`;}).join('')}</div>
  <div class="section-title"><h3>Your facilities</h3><span class="muted-label">${state.buildings.length} BUILT · 55% REFUND</span></div>
  <div class="owned-building-list">${state.buildings.map(building=>{const def=BUILDINGS.find(x=>x.id===building.type);const refund=Math.floor((def?.cost||0)*.55);const occupied=activeFlightList().some(flight=>flight.gateId===building.id);return `<div class="owned-building-row"><div><b>${def?.icon||'🏗️'} ${building.name||def?.name||building.type}</b><small>${building.type==='gate'?'Aircraft stand':'Service facility'} · ${fmt(building.upkeep||0)} / hr upkeep</small></div><button class="demolish-button" data-demolish="${building.id}" ${occupied?'disabled':''}>${occupied?'IN USE':`SELL · +${fmt(refund)}`}</button></div>`;}).join('')||'<div class="empty-state">No additional buildings yet. Your initial terminal and Gate 01 are permanent infrastructure.</div>'}</div>
  <div class="info-note"><b>Construction tip</b><span>Gates belong on the apron. Other facilities belong in the marked service yard. Demolishing a building refunds 55% of its original purchase price. A gate cannot be removed while an aircraft is using it.</span></div>`;
}
function renderATC() {
  const active = activeFlightList();
  const runwayBusy = Boolean(state.runwayFlightId);
  const taxiwayBusy = Boolean(state.taxiwayFlightId);
  const holding = active.filter(f => f.phase === 'holding');
  const runwayStatus = state.runwayClosed ? 'CLOSED' : runwayBusy ? 'OCCUPIED' : 'AVAILABLE';
  const rows = active.map(f => {
    const action = f.phase === 'approach'
      ? '<button class="atc-command" data-atc-action="hold" data-flight-id="' + f.id + '">INSTRUCT HOLD</button>'
      : f.phase === 'holding'
        ? '<button class="atc-command" data-atc-action="clear" data-flight-id="' + f.id + '" ' + (state.runwayClosed || runwayBusy ? 'disabled' : '') + '>CLEAR APPROACH</button>'
        : '<span class="atc-no-command">NO COMMAND</span>';
    return '<div class="atc-traffic-row"><div><b>' + f.id + ' · ' + f.airline + '</b><small>' + f.model + ' · ' + (f.destination || '—') + '</small></div><span class="status-pill active">' + flightPhaseLabel(f.phase) + '</span>' + action + '</div>';
  }).join('');
  return panelHeader('AIR TRAFFIC CONTROL','ATC control centre','An arcade-accessible control desk for arrivals, holding instructions, runway status and controlled clearances.') +
    '<div class="atc-runway-card"><div><small>RUNWAY 09 / 27</small><strong class="' + (state.runwayClosed ? 'bad-text' : 'good-text') + '">' + runwayStatus + '</strong><span>' + (runwayBusy ? 'Aircraft occupying runway' : 'No aircraft on runway') + '</span></div><button class="' + (state.runwayClosed ? 'primary-small' : 'danger-small') + '" data-atc-action="toggle-runway">' + (state.runwayClosed ? 'REOPEN RUNWAY' : 'CLOSE RUNWAY') + '</button></div>' +
    '<div class="traffic-counts"><div><small>ACTIVE AIRCRAFT</small><b>' + active.length + '</b></div><div><small>HOLDING</small><b>' + holding.length + '</b></div><div><small>RUNWAY</small><b>' + (runwayBusy ? 'BUSY' : state.runwayClosed ? 'CLOSED' : 'FREE') + '</b></div><div><small>TAXIWAY</small><b>' + (taxiwayBusy ? 'BUSY' : 'FREE') + '</b></div></div>' +
    '<div class="section-title"><h3>Traffic instructions</h3><span class="muted-label">LIVE CONTROL</span></div>' +
    (rows || '<div class="empty-state">No aircraft under control. Use the flight board to schedule an arrival.</div>') +
    '<div class="section-title"><h3>Arrival sequence</h3><span class="muted-label">' + holding.length + ' AIRCRAFT HOLDING</span></div>' +
    (holding.length ? holding.map((flight,i)=>'<div class="facility-row"><span>' + (i+1) + '. ' + flight.id + ' · ' + flight.airline + '</span><b>' + flight.destination + '</b></div>').join('') : '<div class="empty-state">No aircraft are currently in the holding pattern.</div>') +
    '<div class="info-note"><b>Control model</b><span>The runway and taxiway are protected by exclusive reservations. Closing a runway prevents new landings and take-offs; a runway cannot be closed while an aircraft is using it.</span></div>';
}

function renderFlights() {
  const active = activeFlightList();
  const count = phase => active.filter(f => f.phase === phase).length;
  const gateNumber = id => id === 'initial-gate' ? '01' : String(state.buildings.findIndex(b => b.id === id) + 2).padStart(2, '0');
  const rows = active.map(f => {
    const kind = f.kind === 'cargo' ? 'CARGO' : 'PASSENGER';
    return '<article class="traffic-row"><div class="traffic-aircraft-icon">✈</div><div class="traffic-main"><div class="traffic-topline"><b>' + f.id + ' · ' + f.airline + '</b><span class="traffic-kind">' + kind + '</span></div><strong>' + f.model + '</strong><small>' + (f.destination || 'Regional network') + ' · Gate ' + gateNumber(f.gateId) + '</small></div><div class="traffic-status"><span class="status-pill active">' + flightPhaseLabel(f.phase) + '</span><small>' + (f.passengers || 0) + ' PAX · ' + (f.cargoTons || 0) + ' T</small></div></article>';
  }).join('');
  const next = Math.max(0, Math.ceil(state.nextFlightAt - state.gameMinutes));
  return panelHeader('FLIGHT OPERATIONS','Live flight board','Follow multiple arrivals, runway movements, gate turnarounds and departures as one coordinated airport operation.') +
    '<div class="traffic-counts"><div><small>ACTIVE</small><b>' + active.length + '</b></div><div><small>ARRIVALS</small><b>' + (count('approach') + count('holding') + count('landing-rollout') + count('runway-exit-wait')) + '</b></div><div><small>TAXIING</small><b>' + (count('taxi-in') + count('taxi-out')) + '</b></div><div><small>AT GATE</small><b>' + count('parked') + '</b></div></div>' +
    '<div class="section-title"><h3>Plan an arrival</h3><span class="muted-label">MANUAL FLIGHT DISPATCH</span></div>' +
    '<div class="schedule-grid">' +
    '<button class="schedule-card" data-schedule-flight data-model="ATR 72-600" data-airline="Northstar Air" data-destination="Copenhagen"><b>ATR 72-600</b><small>Northstar Air · Copenhagen</small><span>REGIONAL · SCHEDULE</span></button>' +
    '<button class="schedule-card" data-schedule-flight data-model="Airbus A320neo" data-airline="CloudJet" data-destination="London"><b>Airbus A320neo</b><small>CloudJet · London</small><span>JET · SCHEDULE</span></button>' +
    '<button class="schedule-card" data-schedule-flight data-model="Boeing 737-800" data-airline="BluePeak" data-destination="Paris"><b>Boeing 737-800</b><small>BluePeak · Paris</small><span>JET · SCHEDULE</span></button>' +
    '<button class="schedule-card" data-schedule-flight data-model="Boeing 737-800F" data-airline="CargoLink" data-destination="Frankfurt"><b>Boeing 737-800F</b><small>CargoLink · Frankfurt</small><span>CARGO · SCHEDULE</span></button>' +
    '</div>' +
    '<div class="section-title"><h3>Aircraft in operation</h3><span class="muted-label">' + active.length + ' / ' + (1 + extraGates()) + ' GATES RESERVED</span></div>' +
    (rows || '<div class="empty-state">No aircraft are currently active. The next arrival is scheduled in ' + next + ' game minutes.</div>') +
    '<div class="section-title"><h3>Recent flight activity</h3><span class="muted-label">LAST 20 FLIGHTS</span></div>' +
    '<div class="table-wrap"><table><thead><tr><th>FLIGHT</th><th>AIRLINE</th><th>AIRCRAFT</th><th>PAX</th><th>DESTINATION</th><th>NET RESULT</th></tr></thead><tbody>' +
    (state.flightHistory.map(f => '<tr><td><b>' + f.id + '</b></td><td>' + f.airline + '</td><td>' + f.model + '</td><td>' + f.passengers + '</td><td>' + (f.destination || '—') + '</td><td class="' + (f.net >= 0 ? 'good-text' : 'bad-text') + '">' + fmtSigned(f.net) + '</td></tr>').join('') || '<tr><td colspan="6" class="table-empty">Your first flight is on its way.</td></tr>') +
    '</tbody></table></div>' +
    '<div class="info-note"><b>Air traffic coordination</b><span>Each aircraft reserves a gate for its full visit. The runway and shared taxiway are exclusive resources: aircraft wait in the air or at the holding point rather than occupying the same route at once. Build additional gates to increase simultaneous traffic capacity.</span></div>';
}

function renderAircraft() {
  const active = activeFlightList();
  const gateNumber = id => id === 'initial-gate' ? '01' : String(state.buildings.findIndex(b => b.id === id) + 2).padStart(2, '0');
  const cards = active.map(f => '<article class="traffic-row"><div class="traffic-aircraft-icon">✈</div><div class="traffic-main"><div class="traffic-topline"><b>' + f.airline + ' · ' + f.id + '</b><span class="traffic-kind">' + (f.kind || 'regional').toUpperCase() + '</span></div><strong>' + f.model + '</strong><small>Gate ' + gateNumber(f.gateId) + ' · ' + (f.destination || 'Regional network') + '</small></div><div class="traffic-status"><span class="status-pill active">' + flightPhaseLabel(f.phase) + '</span><small>' + (f.passengers || 0) + ' PAX · ' + (f.cargoTons || 0) + ' T cargo</small></div></article>').join('');
  return panelHeader('FLEET MANAGEMENT','Aircraft','Track every aircraft visiting your airport, including arrivals, turnarounds, holding aircraft and departures.') +
    '<div class="fleet-summary"><div><span>ACTIVE AIRCRAFT</span><b>' + active.length + '</b></div><div><span>FLIGHTS COMPLETED</span><b>' + state.flightsCompleted + '</b></div><div><span>AVAILABLE GATES</span><b>' + Math.max(0, 1 + extraGates() - active.length) + ' / ' + (1 + extraGates()) + '</b></div></div>' +
    (cards || '<div class="empty-state">No visiting aircraft are currently at the airport. Scheduled arrivals will appear here.</div>') +
    '<div class="section-title"><h3>Aircraft catalogue</h3><span class="muted-label">AIR TRAFFIC TYPES</span></div><div class="catalogue-row"><div class="catalogue-icon">🛩️</div><div><b>ATR 72-600 / Dash 8 Q400</b><small>Regional turboprops · Short-haul passenger flights</small></div><span class="status-pill active">IN TRAFFIC</span></div><div class="catalogue-row"><div class="catalogue-icon">✈️</div><div><b>Airbus A320neo / Boeing 737-800</b><small>Narrow-body passenger jets · Medium-haul flights</small></div><span class="status-pill active">IN TRAFFIC</span></div><div class="catalogue-row"><div class="catalogue-icon">📦</div><div><b>Boeing 737-800F / Airbus A330F</b><small>Cargo aircraft · Freight services</small></div><span class="status-pill active">IN TRAFFIC</span></div>';
}
function renderEmployees() {
  const roles=[['security','Security','🛂','Passenger screening and terminal safety'],['handling','Ground handling','🦺','Aircraft turnaround and baggage services'],['cleaning','Cleaning staff','🧹','Terminal cleanliness and comfort'],['maintenance','Maintenance','🔧','Runway and facility reliability'],['cargo','Cargo handlers','📦','Freight loading, warehouse and cargo turnaround']];
  return `${panelHeader('HUMAN RESOURCES','Employees','Hire and manage the team that keeps your airport running.')}
  <div class="employee-summary"><div><small>TOTAL STAFF</small><b>${totalStaff()}</b></div><div><small>WAGE COST / HR</small><b>${fmt(totalStaff()*55)}</b></div><div><small>STAFF EFFICIENCY</small><b>${Math.min(100,Math.round(55+totalStaff()*3))}%</b></div></div>
  <div class="employee-list">${roles.map(([id,name,icon,desc])=>`<div class="employee-card"><div class="employee-icon">${icon}</div><div class="employee-info"><b>${name}</b><small>${desc}</small><span>${fmt(state.staff[id]*55)} / hour · 55 € per employee</span></div><div class="employee-count"><button data-staff="${id}" data-delta="-1" ${state.staff[id]<=0?'disabled':''}>−</button><b>${state.staff[id]}</b><button data-staff="${id}" data-delta="1">＋</button></div></div>`).join('')}</div>
  <div class="info-note"><b>Staffing matters</b><span>More employees improve passenger satisfaction and operational efficiency, but each employee adds €55 per game hour to your expenses. Keep an eye on your balance.</span></div>`;
}
function renderPassengers() {
  const capacity=120+state.buildings.filter(b=>b.type==='terminal').length*100;
  return `${panelHeader('PASSENGER EXPERIENCE','Passengers','Passenger satisfaction is shaped by staffing, services and airport conditions.')}
  <div class="satisfaction-card"><div class="satisfaction-score"><strong>${Math.round(state.satisfaction)}%</strong><span>PASSENGER SATISFACTION</span></div><div class="satisfaction-copy"><b>${state.satisfaction>=85?'Excellent experience':state.satisfaction>=70?'Good passenger experience':'Needs attention'}</b><p>${state.satisfaction>=85?'Passengers are enjoying their visit. Keep your facilities staffed.':'Improve staffing and add passenger facilities to lift satisfaction.'}</p><div class="satisfaction-bar"><i style="width:${state.satisfaction}%"></i></div></div></div>
  <div class="stat-grid">${statCard('CURRENT PASSENGERS',Math.floor(state.passengers),'At the airport','♙','teal')}${statCard('TOTAL PROCESSED',state.totalPassengers.toLocaleString('en-GB'),'Lifetime passenger count','⇄','blue')}${statCard('PEAK PASSENGERS',state.stats.peakPassengers,'On-site record','⌃','purple')}</div>
  <div class="section-title"><h3>Passenger facilities</h3><span class="muted-label">OPERATIONAL EFFECT</span></div><div class="facility-row"><span>🏢 Terminal processing</span><b class="good-text">${capacity} passenger capacity</b></div><div class="facility-row"><span>☕ Food & beverage</span><b>${state.buildings.filter(b=>b.type==='cafe').length} cafés</b></div><div class="facility-row"><span>🛍️ Shopping</span><b>${state.buildings.filter(b=>b.type==='shop').length} shops</b></div><div class="facility-row"><span>🧹 Cleaning coverage</span><b>${state.staff.cleaning} employees</b></div>`;
}
function renderFinances() {
  const incomeParts = hourlyIncomeBreakdown(state);
  const expenseParts = hourlyExpenseBreakdown(state);
  const income = Math.round(Object.values(incomeParts).reduce((sum, value) => sum + value, 0));
  const expenses = Math.round(Object.values(expenseParts).reduce((sum, value) => sum + value, 0));
  const net = income - expenses;
  const history = state.financialHistory.slice(-10);
  const max = Math.max(1, ...history.map(x => Math.max(x.income, x.expenses)));
  const incomeLabels = [
    ['Airport & flight services', incomeParts.airportServices],
    ['Aircraft gate services', incomeParts.gateServices],
    ['Retail and concessions', incomeParts.retail],
    ['Passenger parking', incomeParts.parking],
    ['Airport hotel', incomeParts.hotels],
    ['Cargo operations', incomeParts.cargo],
    ['Investment returns', incomeParts.investmentReturns || 0],
  ];
  const expenseLabels = [
    ['Employee wages', expenseParts.wages],
    ['Base airport operations', expenseParts.baseOperations],
    ['Building maintenance', expenseParts.buildingMaintenance],
    ['Runway wear & maintenance', expenseParts.runwayMaintenance],
    ['Investment upkeep', expenseParts.investmentUpkeep || 0],
    ['Loan principal repayments', expenseParts.loanPrincipal || 0],
    ['Loan interest', expenseParts.loanInterest || 0],
    ['Corporate tax', expenseParts.taxes || 0],
  ];
  return `${panelHeader('AIRPORT ECONOMY','Finances','See every recurring payment and watch the money actually enter or leave your airport account.')}
  <div class="finance-balance"><div><small>CURRENT BALANCE</small><strong>${fmt(state.money)}</strong><span class="${net>=0?'good-text':'bad-text'}">${fmtSigned(net)} net per game hour · automatically paid</span></div><div class="balance-icon">€</div></div>
  <div class="stat-grid">${statCard('HOURLY INCOME',fmt(income),'Deposited automatically','↗','teal')}${statCard('HOURLY EXPENSES',fmt(expenses),'Debited automatically','↘','orange')}${statCard('LIFETIME REVENUE',fmt(state.lifetimeRevenue),'Total earned','€','purple')}</div>
  <div class="info-note"><b>How the cash flow works</b><span>Income and costs are both applied directly to your bank balance as the simulation runs. Every 60 in-game minutes, one full game-hour of income and expenses is booked.</span></div>
  <div class="content-card"><div class="card-heading"><h3>Recurring income</h3><span class="muted-label">PER GAME HOUR</span></div>${incomeLabels.map(([label,value])=>`<div class="facility-row"><span>${label}</span><b class="good-text">+${fmt(value)}</b></div>`).join('')}</div>
  <div class="content-card"><div class="card-heading"><h3>Operating expenses</h3><span class="muted-label">PER GAME HOUR</span></div>${expenseLabels.map(([label,value])=>`<div class="facility-row"><span>${label}</span><b class="bad-text">−${fmt(value)}</b></div>`).join('')}<div class="facility-row"><span><b>Net recurring result</b></span><b class="${net>=0?'good-text':'bad-text'}">${fmtSigned(net)}</b></div></div>
  <div class="content-card chart-card"><div class="card-heading"><h3>Recent flight performance</h3><span class="muted-label">PER COMPLETED FLIGHT</span></div><div class="chart-legend"><span><i class="legend-income"></i> Revenue</span><span><i class="legend-expense"></i> Expenses</span></div><div class="bar-chart">${history.map(h=>`<div class="bar-group"><div class="bar-pair"><i class="bar-income" style="height:${Math.max(2,h.income/max*100)}%" title="Revenue ${fmt(h.income)}"></i><i class="bar-expense" style="height:${Math.max(2,h.expenses/max*100)}%" title="Expenses ${fmt(h.expenses)}"></i></div><small>${h.label}</small></div>`).join('')||'<div class="empty-state">Complete a flight to start building your financial history.</div>'}</div></div>
  <div class="maintenance-card"><div><small>RUNWAY SURFACE CONDITION</small><strong>${Math.round(state.runwayCondition ?? 100)}%</strong><p>Landings wear the asphalt. Repair the surface to keep maintenance costs under control.</p><div class="satisfaction-bar"><i style="width:${state.runwayCondition ?? 100}%"></i></div></div><button class="primary-small" data-action="repair-runway" ${(state.runwayCondition ?? 100) >= 99 ? 'disabled' : ''}>REPAIR · ${fmt(Math.round((100-(state.runwayCondition ?? 100))*140+250))}</button></div>
  <div class="section-title"><h3>Tax policy</h3><span class="muted-label">CORPORATE TAX</span></div>
  <div class="content-card"><div class="facility-row"><span>Current tax rate</span><b>${Math.round((state.taxRate || .08)*100)}%</b></div><div class="tax-buttons">${[.05,.08,.12,.16].map(rate=>`<button class="secondary-small ${Math.abs((state.taxRate || .08)-rate)<.001?'active':''}" data-tax-rate="${rate}">${Math.round(rate*100)}%</button>`).join('')}</div><small>Tax is charged on positive hourly operating profit after wages, maintenance, investments and loan servicing.</small><div class="facility-row"><span>Lifetime tax paid</span><b>${fmt(state.taxPaid || 0)}</b></div></div>
  <div class="section-title"><h3>Bank loans</h3><span class="muted-label">${(state.loans || []).length} ACTIVE · LIMIT 2</span></div>
  <div class="loan-list">${(state.loans || []).map(loan=>`<div class="loan-card"><div><b>${loan.name}</b><small>Original ${fmt(loan.originalAmount)} · ${loan.hoursRemaining.toFixed(0)} game hours remaining</small></div><strong>${fmt(loan.balance)}</strong><span>${(loan.interestPerGameHour*100).toFixed(2)}% interest per game hour</span><button class="secondary-small" data-repay-loan="${loan.id}" data-amount="${Math.ceil(loan.balance)}">REPAY IN FULL · ${fmt(loan.balance)}</button></div>`).join('') || '<div class="empty-state">No active loans. Borrowing is optional and all repayments are visible in hourly costs.</div>'}
  <div class="loan-offers">${LOAN_OFFERS.map(offer=>{const locked=state.level<offer.level,limit=(state.loans||[]).filter(loan=>loan.balance>.01).length>=2;return `<div class="loan-offer"><div><b>${offer.name}</b><small>${fmt(offer.principal)} · ${offer.termHours} game hours · level ${offer.level}</small></div><button class="primary-small" data-take-loan="${offer.id}" ${locked||limit?'disabled':''}>${locked?'LOCKED':limit?'LOAN LIMIT':'BORROW'}</button></div>`;}).join('')}</div>
  <div class="facility-row"><span>Lifetime loan interest paid</span><b>${fmt(state.loanInterestPaid || 0)}</b></div></div>
  <div class="section-title"><h3>Capital investments</h3><span class="muted-label">${(state.investments || []).length} PROJECTS ACTIVE</span></div>
  <div class="investment-list">${INVESTMENT_DEFS.map(project=>{const owned=(state.investments||[]).some(item=>item.id===project.id),locked=state.level<project.level,facility=project.requiredBuilding&&!state.buildings.some(b=>b.type===project.requiredBuilding);return `<div class="investment-card"><div class="investment-icon">${project.icon}</div><div><b>${project.name}</b><small>${project.description}</small><span>Cost ${fmt(project.cost)} · +${fmt(project.income||0)}/hr income · ${fmt(project.savings||0)}/hr savings</span></div><button class="secondary-small" data-invest-project="${project.id}" ${owned||locked||facility||state.money<project.cost?'disabled':''}>${owned?'OWNED':locked?'LOCKED':facility?'FACILITY REQUIRED':state.money<project.cost?'UNAFFORDABLE':'INVEST'}</button></div>`;}).join('')}</div>
  <div class="facility-row"><span>Cargo handled</span><b>${(state.cargoTonsHandled || 0).toLocaleString('en-GB')} tonnes</b></div>`;
}
function renderResearch() {
  return `${panelHeader('AIRPORT INNOVATION','Research & technology','Invest in improvements that have a measurable effect on airport operations.')}
  ${state.researchInProgress?`<div class="research-progress"><div class="research-progress-icon">⌘</div><div><small>RESEARCH IN PROGRESS</small><b>${RESEARCH.find(r=>r.id===state.researchInProgress.id)?.name}</b><div class="mini-progress"><div style="width:${Math.max(0,100-state.researchInProgress.remaining/RESEARCH.find(r=>r.id===state.researchInProgress.id).duration*100)}%"></div></div><small>${Math.ceil(state.researchInProgress.remaining)} game minutes remaining</small></div></div>`:''}
  <div class="research-list">${RESEARCH.map(r=>{const researched=state.research.includes(r.id), active=state.researchInProgress?.id===r.id, locked=state.level<r.level;return `<div class="research-card ${researched?'researched':''} ${locked?'locked':''}"><div class="research-icon">${r.icon}</div><div class="research-info"><small>${r.category.toUpperCase()}</small><b>${r.name}</b><p>${r.description}</p><span>Cost ${fmt(r.cost)} · ${r.duration} game minutes · Level ${r.level}</span></div><button class="research-button" data-research="${r.id}" ${researched||active||locked||state.researchInProgress?'disabled':''}>${researched?'✓ COMPLETE':active?'IN PROGRESS':locked?`LEVEL ${r.level}`:'RESEARCH'}</button></div>`;}).join('')}</div>
  <div class="info-note"><b>Research benefits</b><span>Research advances in game time. Only one project can run at a time. Completed technologies remain active for the rest of your save.</span></div>`;
}


function renderContracts() {
  const active = state.activeContracts || [];
  const completed = state.completedContracts || [];
  return `${panelHeader('AIRLINE RELATIONS','Contracts & partnerships','Sign service agreements with airlines and local partners. Complete their requirements to earn major rewards.')}
    <div class="contract-overview"><div><small>ACTIVE AGREEMENTS</small><strong>${active.length} / 2</strong></div><div><small>COMPLETED</small><strong>${state.contractsCompleted || 0}</strong></div><div><small>CONTRACT INCOME</small><strong>${fmt(state.contractIncome || 0)}</strong></div></div>
    <div class="section-title"><h3>Available agreements</h3><span class="muted-label">SELECT UP TO TWO</span></div>
    <div class="contract-list">${CONTRACT_DEFS.map(contract=>{
      const running=active.find(c=>c.id===contract.id);
      const done=completed.includes(contract.id);
      const facilityReady=!contract.requiredBuilding||state.buildings.some(b=>b.type===contract.requiredBuilding);
      const unlocked=state.level>=contract.level&&facilityReady;
      const full=active.length>=2;
      const detail=contract.kind==='cargo'?'Freight operations':contract.kind==='passenger'?'Passenger services':'Airport-wide performance';
      return `<article class="contract-card ${running?'contract-active':''} ${done?'contract-complete':''}">
        <div class="contract-card-top"><span class="contract-icon">${contract.icon}</span><span class="contract-client">${contract.client}</span><span class="contract-state">${done?'COMPLETED':running?'ACTIVE':unlocked?'AVAILABLE':!facilityReady?'FACILITY REQUIRED':`LEVEL ${contract.level}`}</span></div>
        <h3>${contract.name}</h3><p>${contract.description}</p>
        <div class="contract-progress"><div><span>${detail}</span><b>${running?`${running.progress || 0} / ${contract.target}`:done?`${contract.target} / ${contract.target}`:`0 / ${contract.target}`}</b></div><i><span style="width:${running?Math.min(100,(running.progress||0)/contract.target*100):done?100:0}%"></span></i></div>
        <div class="contract-footer"><strong>${fmt(contract.reward)} <small>+ ${contract.xp} XP</small></strong>${done?'<span class="status-pill active">PAID</span>':running?'<span class="status-pill active">IN PROGRESS</span>':`<button class="primary-small" data-accept-contract="${contract.id}" ${!unlocked||full?'disabled':''}>${!facilityReady?'BUILD FACILITY':!unlocked?`LEVEL ${contract.level}`:full?'CONTRACT LIMIT':'SIGN AGREEMENT'}</button>`}</div>
      </article>`;
    }).join('')}</div>
    <div class="info-note"><b>Contract strategy</b><span>Contracts are optional but pay more than ordinary flight handling. Cargo agreements require a Cargo Terminal. Completing a contract frees one of your two active slots.</span></div>`;
}

function renderGuide() {
  return `${panelHeader('LEARNING CENTRE','Tutorial & airport guide','Start the simple beginner tour or use this complete reference while you play.')}
    <div class="guide-mode-grid">
      <section class="guide-mode-card"><span class="guide-icon">🧭</span><div><b>Beginner mode</b><p>A six-step tour through the airport, camera, aircraft, construction and management.</p></div><button class="primary-small" data-action="restart-tutorial">START TUTORIAL</button></section>
      <section class="guide-mode-card"><span class="guide-icon">📚</span><div><b>Advanced reference</b><p>Look up the systems and controls whenever you need a reminder.</p></div><span class="guide-tag">FULL GUIDE</span></section>
    </div>
    <div class="guide-section"><h3>1. Camera and controls</h3><div class="guide-row"><b>Rotate</b><span>Hold the left mouse button and drag across the 3D world.</span></div><div class="guide-row"><b>Zoom</b><span>Use the mouse wheel to zoom in on aircraft, buildings and runway details.</span></div><div class="guide-row"><b>Move view</b><span>Hold the right mouse button and drag to pan across the map.</span></div><div class="guide-row"><b>Keyboard</b><span><kbd>B</kbd> opens Build, <kbd>Esc</kbd> cancels placement, <kbd>1</kbd>/<kbd>2</kbd>/<kbd>4</kbd> changes speed and <kbd>Space</kbd> pauses.</span></div></div>
    <div class="guide-section"><h3>2. Understand the airport</h3><div class="guide-row"><b>Runway</b><span>The long marked strip is where aircraft land and take off. Rubber marks, thresholds and lights identify it.</span></div><div class="guide-row"><b>Taxiways</b><span>Aircraft follow the yellow centre line between the runway and apron.</span></div><div class="guide-row"><b>Apron and gates</b><span>Aircraft park on the apron. Gates connect the terminal to an aircraft at a stand.</span></div><div class="guide-row"><b>Terminal</b><span>Passengers enter here, use airport services and walk to their gate.</span></div></div>
    <div class="guide-section"><h3>3. Flights and aircraft</h3><p>Arriving aircraft descend, touch down, roll along the runway and taxi to a stand. At the gate passengers or freight are handled. The aircraft then taxis out and takes off. Traffic includes regional aircraft, passenger jets and cargo freighters.</p><p>Aircraft appear in the 3D world: parked aircraft remain on the apron while scheduled flights follow their route.</p></div>
    <div class="guide-section"><h3>4. Passengers and ground handling</h3><p>Passengers walk between the terminal and apron. The baggage tug and carts represent ground handling. Hire handling staff to support turnarounds, security staff for passenger screening and cleaning staff for passenger comfort.</p><p>Build cafés, shops, parking and terminal extensions to add services and passenger capacity.</p></div>
    <div class="guide-section"><h3>5. Build and expand</h3><p>Open Build, choose a category and select a facility. Move the preview over the map and click to construct it. Green means the location is valid; red means it is blocked. Gates belong on the apron; most other buildings belong in the marked service yard. Press <kbd>Esc</kbd> or Cancel to stop placing a building.</p></div>
    <div class="guide-section"><h3>6. Finance and maintenance</h3><p>Flight fees, passengers, cafés, shops and parking create income. Staff wages, airport operations and building upkeep create expenses. Landings slowly wear the runway. Open Finances to check its condition and pay for repairs before wear becomes expensive.</p></div>
    <div class="guide-section"><h3>7. Weather, time and seasons</h3><p>The airport clock advances while the simulation runs. The lighting changes through daylight, dusk and night. The landscape cycles through spring, summer, autumn and winter. Weather can shift between sun, cloud, rain, fog, snow and thunderstorms.</p></div>
    <div class="guide-section"><h3>8. Airline contracts</h3><p>Open Contracts to sign up to two agreements at once. Passenger and freight agreements track completed flights that meet their requirements. Rewards are paid automatically when the target is reached. Some agreements require a Cargo Terminal or a higher airport level.</p></div>
    <div class="guide-section"><h3>9. Incidents and emergency response</h3><p>Operational alerts can create baggage backlogs, medical assistance calls, runway debris inspections or freight delays. Respond before the countdown expires. The correct staff levels and facilities reduce response costs; an external contractor can be used when your own team is not ready. Ignored incidents affect cash, reputation and passenger satisfaction.</p></div>
    <div class="guide-section"><h3>10. Facility ownership</h3><p>The Build screen lists your owned buildings. You can demolish an additional facility for a 55% refund. Gates cannot be removed while an aircraft is using them. Specialist facilities include a Cargo Terminal, Airport Hotel and Engineering Depot.</p></div>
    <div class="guide-footnote">Tip: save regularly with the disk button in the top bar. Your airport is stored in this browser.</div>`;
}

function missionProgress(m) {
  if(m.metric==='extraGates') return extraGates();
  return state[m.metric] ?? 0;
}
function renderMissions() {
  return `${panelHeader('GOALS & REWARDS','Missions','Complete airport milestones to earn cash and experience points.')}
  <div class="mission-list">${MISSION_DEFS.map(m=>{const progress=missionProgress(m);const complete=progress>=m.goal;const claimed=state.missionsClaimed.includes(m.id);return `<div class="mission-card ${claimed?'claimed':''}"><div class="mission-icon">${m.icon}</div><div class="mission-info"><div class="mission-title-row"><b>${m.title}</b>${claimed?'<span class="status-pill">CLAIMED</span>':complete?'<span class="available-label">COMPLETED</span>':''}</div><p>${m.description}</p><div class="mini-progress"><div style="width:${Math.min(100,progress/m.goal*100)}%"></div></div><small>${Math.min(progress,m.goal).toLocaleString('en-GB')} / ${m.goal.toLocaleString('en-GB')}</small></div><div class="mission-reward"><b>${fmt(m.reward)}</b><small>+${m.xp} XP</small><button data-claim="${m.id}" ${!complete||claimed?'disabled':''}>${claimed?'CLAIMED':complete?'CLAIM':'IN PROGRESS'}</button></div></div>`;}).join('')}</div>`;
}
function renderStatistics() {
  return `${panelHeader('AIRPORT ANALYTICS','Statistics','Long-term performance indicators for your growing airport.')}
  <div class="stat-grid">${statCard('FLIGHTS COMPLETED',state.flightsCompleted,'Successful departures','✈','blue')}${statCard('PASSENGERS SERVED',state.totalPassengers.toLocaleString('en-GB'),'Lifetime total','♙','teal')}${statCard('CARGO HANDLED',`${(state.cargoTonsHandled||0).toLocaleString('en-GB')} t`,'Freight throughput','📦','orange')}</div>
  <div class="stat-grid">${statCard('CONTRACTS COMPLETED',state.contractsCompleted||0,'Airline partnerships','🤝','teal')}${statCard('INCIDENTS RESOLVED',state.stats.incidentsResolved||0,'Successful responses','✓','purple')}${statCard('FACILITIES BUILT',state.buildings.length,'Constructed assets','＋','blue')}</div>
  <div class="two-col"><div class="content-card"><div class="card-heading"><h3>Airport profile</h3></div><div class="facility-row"><span>Airport level</span><b>${state.level}</b></div><div class="facility-row"><span>Reputation</span><b>${Math.round(state.reputation)}%</b></div><div class="facility-row"><span>Passenger satisfaction</span><b>${Math.round(state.satisfaction)}%</b></div><div class="facility-row"><span>Research completed</span><b>${state.research.length}</b></div></div><div class="content-card"><div class="card-heading"><h3>Financial profile</h3></div><div class="facility-row"><span>Lifetime revenue</span><b>${fmt(state.lifetimeRevenue)}</b></div><div class="facility-row"><span>Lifetime expenses</span><b>${fmt(state.lifetimeExpenses)}</b></div><div class="facility-row"><span>Net lifetime result</span><b class="${state.lifetimeRevenue>=state.lifetimeExpenses?'good-text':'bad-text'}">${fmt(state.lifetimeRevenue-state.lifetimeExpenses)}</b></div><div class="facility-row"><span>Retail income</span><b>${fmt(state.retailIncome+state.parkingIncome)}</b></div></div></div>`;
}
function renderSettings() {
  return `${panelHeader('GAME OPTIONS','Settings','Manage your save, simulation preferences and visual quality.')}
  <div class="settings-group"><h3>Graphics</h3><div class="setting-row"><div><b>Rendering quality</b><small>Lower quality can improve performance on older computers.</small></div><select id="quality-select"><option ${graphicsQuality==='High'?'selected':''}>High</option><option ${graphicsQuality==='Medium'?'selected':''}>Medium</option><option ${graphicsQuality==='Low'?'selected':''}>Low</option></select></div></div>
  <div class="settings-group"><h3>Audio</h3><div class="setting-row"><div><b>Music and sound effects</b><small>The audio engine is scheduled for a later development phase.</small></div><span class="status-pill">NOT IN PHASE 1</span></div></div>
  <div class="settings-group"><h3>Simulation</h3><div class="setting-row"><div><b>Automatic saving</b><small>Your airport is saved automatically every 10 seconds.</small></div><span class="status-pill active">ENABLED</span></div><div class="setting-row"><div><b>Game speed</b><small>Choose the speed from the controls at the bottom of the screen.</small></div><b>${state.speed===0?'Paused':`${state.speed}×`}</b></div></div>
  <div class="settings-group"><h3>Save management</h3><div class="setting-actions"><button class="primary-small" data-action="save">▣ Save now</button><button class="secondary-small" data-action="load">↶ Load saved game</button><button class="danger-small" data-action="new-game">＋ New airport</button></div><small class="save-detail">Save data is stored locally in this browser. Clearing browser storage can remove the save.</small></div>`;
}

function refreshHUD() {
  $('cash-value').textContent=fmt(state.money);
  const net=hourlyIncome(state)-hourlyExpenses(state); $('net-hour').textContent=fmtSigned(net); $('net-hour').className=net>=0?'good-text':'bad-text';
  $('level-value').textContent=state.level; $('rep-value').textContent=`${Math.round(state.reputation)}%`;
  $('pax-value').textContent=Math.floor(state.passengers).toLocaleString('en-GB');
  $('clock-value').textContent=timeLabel(state.gameMinutes);
  const w={Sunny:'☀',Cloudy:'☁',Rain:'🌧',Fog:'🌫',Snow:'❄',Thunderstorm:'⛈'};
  $('weather-icon').textContent=w[state.weather]||'☀'; $('weather-name').textContent=state.weather;
  const seasons=['Spring','Summer','Autumn','Winter'];
  const seasonIcons=['🌱','☀','🍂','❄'];
  const seasonIndex=Math.floor(state.gameMinutes/(1440*3))%4;
  $('season-name').textContent=seasons[seasonIndex];
  $('season-icon').textContent=seasonIcons[seasonIndex];
  $('xp-label').textContent=`LEVEL ${state.level} · ${Math.floor(state.xp)} / ${state.level*500} XP`;
  $('xp-next').textContent=`NEXT: LEVEL ${state.level+1}`;
  $('xp-fill').style.width=`${Math.min(100,state.xp/(state.level*500)*100)}%`;
  document.querySelectorAll('.speed-button').forEach(b=>b.classList.toggle('active',Number(b.dataset.speed)===state.speed));
  world.syncFlights(activeFlightList()); world.setTimeOfDay(state.gameMinutes);
}


function showTutorial() {
  const steps = [
    ['Welcome to your airport', 'You are in charge of a small regional airport. Your first scheduled aircraft will arrive soon. This guide shows you the most important areas and what to do first.', 'NEXT STEP', 'You start with a terminal, an aircraft gate and €75,000.'],
    ['Move around the 3D world', 'Hold the left mouse button and drag to rotate the camera. Scroll to zoom. Hold the right mouse button and drag to move the view. Zoom in to inspect aircraft and runway markings.', 'NEXT STEP', 'Try zooming in on the apron, then zoom back out.'],
    ['Learn the airport layout', 'The long marked strip is the runway. Yellow lines lead along the taxiways. Aircraft park on the apron beside terminal gates. The much larger service campus behind the terminal is ready for future expansion, with roads, logistics buildings, a town and countryside beyond the perimeter.', 'NEXT STEP', 'The runway is for take-offs and landings; aircraft do not park there.'],
    ['Watch aircraft operations', 'An arrival descends, touches down, rolls along the runway and taxis to a gate. Passengers or freight are handled at the stand. The aircraft then taxis out and takes off again.', 'VIEW FLIGHT BOARD', 'The Flights page shows the current phase and aircraft type.'],
    ['Build new facilities', 'Open Build, choose a facility and move the placement preview over the map. Green means the location is valid; red means something blocks it. Gates belong on the apron, while most other buildings belong in the service yard.', 'OPEN BUILD MENU', 'Press Esc or Cancel to stop a placement.'],
    ['Manage a growing airport', 'Hire staff, watch passenger satisfaction, review income and expenses, and repair the runway when its condition drops. Weather, daylight and seasons change as the simulation runs. Save with the disk button.', 'FINISH TUTORIAL', 'The full reference is always available in Tutorial & Guide.']
  ];
  const [title, desc, button, reminder] = steps[Math.min(state.tutorialStep, steps.length - 1)];
  $('tutorial-card').innerHTML = `<div class="tutorial-step">BEGINNER MODE · STEP ${state.tutorialStep + 1} / ${steps.length}</div><b>${title}</b><p>${desc}</p><div class="tutorial-task"><strong>REMEMBER</strong><span>${reminder}</span></div><div class="tutorial-actions"><button class="text-action" data-tutorial="guide">FULL GUIDE</button><button class="text-action" data-tutorial="skip">SKIP</button><button class="primary-small" data-tutorial="${state.tutorialStep===3?'flights':state.tutorialStep===4?'build':'next'}">${button} →</button></div>`;
  $('tutorial-card').classList.remove('hidden');
  tutorialVisible = true;
}
function advanceTutorial(skip = false) {
  if (skip) {
    state.tutorialComplete = true;
    state.tutorialStep = 6;
  } else {
    state.tutorialStep++;
    if (state.tutorialStep >= 6) state.tutorialComplete = true;
  }
  if (state.tutorialComplete) {
    $('tutorial-card').classList.add('hidden');
    tutorialVisible = false;
    saveNow(false);
    notifyLocal('Tutorial complete', 'You are ready to manage your airport. Open Tutorial & Guide whenever you need help.', 'success');
  } else {
    showTutorial();
  }
}

function handlePanelClick(e) {
  const loan=e.target.closest('[data-take-loan]');
  if(loan){
    const result=takeLoan(state,loan.dataset.takeLoan);
    if(!result.ok){const messages={'level':'This loan unlocks at airport level '+result.level+'.','loan-limit':'The bank allows up to two active loans.','unknown-loan':'Loan offer not found.'};notifyLocal('Loan unavailable',messages[result.reason]||'The loan could not be issued.','warning');}
    else notifyLocal('Loan approved',fmt(result.loan.originalAmount)+' added to the airport account. Repayments and interest are now part of hourly expenses.','success');
    renderPanel();refreshHUD();saveNow(false);return;
  }
  const repayment=e.target.closest('[data-repay-loan]');
  if(repayment){
    const result=repayLoan(state,repayment.dataset.repayLoan,Number(repayment.dataset.amount));
    if(!result.ok)notifyLocal('Repayment unavailable',result.reason==='funds'?'There is not enough cash for this repayment.':'This loan is no longer active.','warning');
    else notifyLocal('Loan repayment processed',fmt(result.amount)+' repaid. Remaining balance: '+fmt(result.remaining)+'.','success');
    renderPanel();refreshHUD();saveNow(false);return;
  }
  const tax=e.target.closest('[data-tax-rate]');
  if(tax){
    setTaxRate(state,Number(tax.dataset.taxRate));
    notifyLocal('Tax policy updated','Corporate tax is now '+Math.round(state.taxRate*100)+'% of positive operating profit.','success');
    renderPanel();refreshHUD();saveNow(false);return;
  }
  const investment=e.target.closest('[data-invest-project]');
  if(investment){
    const result=investInProject(state,investment.dataset.investProject);
    if(!result.ok){
      const messages={'level':'This investment unlocks at level '+result.level+'.','facility':'Build the required specialist facility first.','already-owned':'This investment is already active.','funds':'There is not enough cash for this investment.','unknown-project':'Investment project not found.'};
      notifyLocal('Investment unavailable',messages[result.reason]||'The project could not be purchased.','warning');
    } else notifyLocal('Investment completed',result.project.name+' is now active. Its recurring return is included in the finance dashboard.','success');
    renderPanel();refreshHUD();saveNow(false);return;
  }
  const schedule=e.target.closest('[data-schedule-flight]');
  if(schedule){
    const flight=scheduleArrival(state,{model:schedule.dataset.model,airline:schedule.dataset.airline,destination:schedule.dataset.destination});
    if(!flight)notifyLocal('No free aircraft stand','Build another gate or wait for an aircraft to depart before scheduling another arrival.','warning');
    else notifyLocal('Flight scheduled',flight.id+' · '+flight.airline+' to '+flight.destination+' has entered the arrival sequence.','success');
    renderPanel();refreshHUD();saveNow(false);return;
  }
  const atc=e.target.closest('[data-atc-action]');
  if(atc){
    const action=atc.dataset.atcAction;
    let result={ok:true};
    if(action==='toggle-runway') result=setRunwayClosed(state,!state.runwayClosed);
    else if(action==='hold') result=holdArrival(state,atc.dataset.flightId);
    else if(action==='clear') result=clearArrival(state,atc.dataset.flightId);
    if(!result.ok){
      const messages={'runway-busy':'The runway cannot be closed while an aircraft is on it.','not-approaching':'This aircraft is not on final approach.','not-holding':'This aircraft is not waiting in the holding pattern.','runway-closed':'Reopen the runway before clearing an approach.','traffic-conflict':'Another aircraft has priority on the approach or runway.','missing':'This aircraft is no longer active.'};
      notifyLocal('ATC instruction unavailable',messages[result.reason]||'The instruction could not be completed.','warning');
    } else if(action==='hold') notifyLocal('Holding instruction issued',atc.dataset.flightId+' is entering the holding pattern.','success');
    else if(action==='clear') notifyLocal('Approach clearance issued',atc.dataset.flightId+' is cleared for approach.','success');
    renderPanel();refreshHUD();saveNow(false);return;
  }
  const tab=e.target.closest('[data-tab]'); if(tab){setActiveTab(tab.dataset.tab);renderPanel();return;}
  const build=e.target.closest('[data-build]'); if(build){openBuild(build.dataset.build);renderPanel();return;}
  const cat=e.target.closest('[data-category]');if(cat){selectedCategory=cat.dataset.category;renderPanel();return;}
  const staff=e.target.closest('[data-staff]');if(staff){const role=staff.dataset.staff,delta=Number(staff.dataset.delta);if(delta>0){const cost=1250;if(state.money<cost){notifyLocal('Not enough funds',`Hiring costs ${fmt(cost)}.`,'warning');return;}addMoney(state,-cost);state.staff[role]++;notifyLocal('Employee hired',`${role[0].toUpperCase()+role.slice(1)} staff increased to ${state.staff[role]}.`,'success');}else{if(state.staff[role]<=0)return;state.staff[role]--;notifyLocal('Employee released',`${role[0].toUpperCase()+role.slice(1)} staff reduced to ${state.staff[role]}.`,'info');}renderPanel();refreshHUD();return;}
  const research=e.target.closest('[data-research]');if(research){const r=RESEARCH.find(x=>x.id===research.dataset.research);if(!r||state.research.includes(r.id)||state.researchInProgress)return;if(state.money<r.cost){notifyLocal('Not enough funds',`Research requires ${fmt(r.cost)}.`,'warning');return;}addMoney(state,-r.cost);state.researchInProgress={id:r.id,remaining:r.duration};notifyLocal('Research started',`${r.name} is now in development.`,'success');renderPanel();refreshHUD();return;}
  const claim=e.target.closest('[data-claim]');if(claim){const m=MISSION_DEFS.find(x=>x.id===claim.dataset.claim);if(!m||state.missionsClaimed.includes(m.id)||missionProgress(m)<m.goal)return;state.missionsClaimed.push(m.id);addMoney(state,m.reward);giveXP(state,m.xp);notifyLocal('Mission completed',`${m.title}: ${fmt(m.reward)} and ${m.xp} XP earned.`,'success');renderPanel();refreshHUD();return;}

  const contractButton=e.target.closest('[data-accept-contract]');
  if(contractButton){
    const contract=CONTRACT_DEFS.find(item=>item.id===contractButton.dataset.acceptContract);
    if(!contract||state.activeContracts.some(item=>item.id===contract.id)||state.completedContracts.includes(contract.id))return;
    if(state.activeContracts.length>=2){notifyLocal('Contract limit reached','Complete an active agreement before signing another.','warning');return;}
    if(state.level<contract.level){notifyLocal('Airport level too low',`This agreement unlocks at level ${contract.level}.`,'warning');return;}
    if(contract.requiredBuilding&&!state.buildings.some(b=>b.type===contract.requiredBuilding)){notifyLocal('Facility required','Build the Cargo Terminal before signing this agreement.','warning');return;}
    state.activeContracts.push({...contract,progress:0});
    notifyLocal('Partnership signed',`${contract.client} has awarded your airport a new service agreement.`,'success');
    renderPanel();saveNow(false);return;
  }
  const demolish=e.target.closest('[data-demolish]');
  if(demolish){
    const building=state.buildings.find(item=>item.id===demolish.dataset.demolish);
    if(!building)return;
    if(activeFlightList().some(flight=>flight.gateId===building.id)){notifyLocal('Gate in use','Wait until every aircraft assigned to this stand has departed before removing this gate.','warning');return;}
    const dependentContract=(state.activeContracts||[]).find(contract=>contract.requiredBuilding===building.type);
    if(dependentContract){
      notifyLocal('Facility required by contract',`Complete or cancel ${dependentContract.name} before selling this facility.`,'warning');
      return;
    }
    const definition=BUILDINGS.find(item=>item.id===building.type);
    const refund=Math.floor((definition?.cost||0)*.55);
    confirmModal('Demolish this facility?',`This will remove ${building.name||definition?.name||building.type} and refund ${fmt(refund)} (55% of its purchase price).`,'Demolish & refund',()=>{
      if(!world.removeBuilding(building.id)){notifyLocal('Could not remove building','The 3D facility could not be found.','warning');return;}
      state.buildings=state.buildings.filter(item=>item.id!==building.id);
      addMoney(state,refund);
      notifyLocal('Facility demolished',`${building.name||definition?.name||building.type} removed. ${fmt(refund)} refunded.`,'success');
      renderPanel();refreshHUD();saveNow(false);
    });
    return;
  }
  const incidentAction=e.target.closest('[data-action="respond-incident"]');
  if(incidentAction){
    const result=resolveIncident(state,incidentTeamReady(state.activeIncident));
    if(!result.ok)notifyLocal(result.reason==='funds'?'Insufficient funds':'No active incident',result.reason==='funds'?`Response requires ${fmt(result.cost)}.`:'There is no incident to resolve.','warning');
    else notifyLocal('Response team dispatched','Airport incident contained successfully.','success');
    renderPanel();refreshHUD();saveNow(false);return;
  }

  const tutorial=e.target.closest('[data-tutorial]');
  if(tutorial){
    const action=tutorial.dataset.tutorial;
    if(action==='guide'){
      $('tutorial-card').classList.add('hidden');
      tutorialVisible=false;
      setActiveTab('guide');
      renderPanel();
      return;
    }
    if(action==='flights'||action==='build'){
      state.tutorialStep++;
      setActiveTab(action);
      renderPanel();
      showTutorial();
      saveNow(false);
      return;
    }
    advanceTutorial(action==='skip');
    return;
  }
  const repairButton=e.target.closest('[data-action="repair-runway"]');
  if(repairButton){
    const condition=state.runwayCondition??100;
    const cost=Math.round((100-condition)*140+250);
    if(condition>=99){
      notifyLocal('Runway in good condition','No repair is required right now.','info');
    }else if(state.money<cost){
      notifyLocal('Not enough funds',`Runway repair requires ${fmt(cost)}.`,'warning');
    }else{
      addMoney(state,-cost);
      state.runwayCondition=100;
      notifyLocal('Runway repaired','The runway surface is back to 100% condition.','success');
      refreshHUD();
    }
    renderPanel();
    return;
  }
  const restartTutorial=e.target.closest('[data-action="restart-tutorial"]');
  if(restartTutorial){
    state.tutorialStep=0;
    state.tutorialComplete=false;
    showTutorial();
    saveNow(false);
    return;
  }
  const action=e.target.closest('[data-action]');if(action){const a=action.dataset.action;if(a==='save')saveNow();else if(a==='load'){const saved=loadGame();if(saved){state={...INITIAL_STATE(),...saved};world.dispose();$('game-world').innerHTML='';bootWorld();renderPanel();refreshHUD();notifyLocal('Save loaded','Your saved airport has been restored.','success');}else notifyLocal('No save found','There is no valid saved airport.','warning');}else if(a==='new-game')confirmModal('Start a new airport?','This will replace your current airport. Save first if you want to keep it.','Start new game',startNewGame);else if(a==='focus')world.focusAirport();else if(a==='cancel-build')cancelBuild();else if(a==='toggle-panel')togglePanel();renderPanel();return;}
}

function confirmModal(title,desc,confirmText,callback) {
  $('modal-card').innerHTML=`<div class="modal-icon">✈</div><h3>${title}</h3><p>${desc}</p><div class="modal-actions"><button class="secondary-small" data-modal="cancel">CANCEL</button><button class="danger-small" data-modal="confirm">${confirmText}</button></div>`;
  $('modal-backdrop').classList.remove('hidden');
  const close=()=>{$('modal-backdrop').classList.add('hidden');$('modal-card').onclick=null;};
  $('modal-card').onclick=e=>{const b=e.target.closest('[data-modal]');if(!b)return;if(b.dataset.modal==='confirm')callback();close();};
}

// Global event wiring.
$('play-button').addEventListener('click',()=>{if(hasSave()){const saved=loadGame();if(saved){state={...INITIAL_STATE(),...saved};world.dispose();$('game-world').innerHTML='';bootWorld();beginGame(true);}else startNewGame();}else startNewGame();});
$('load-button').addEventListener('click',loadSavedGame);
$('save-button').addEventListener('click',()=>saveNow());
$('main-nav').addEventListener('click',handlePanelClick);
$('panel-content').addEventListener('click',handlePanelClick);
$('tutorial-card').addEventListener('click',handlePanelClick);
$('panel-content').addEventListener('change',e=>{if(e.target.id==='quality-select'){graphicsQuality=e.target.value;world.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,graphicsQuality==='High'?2:graphicsQuality==='Medium'?1.4:1));notifyLocal('Graphics updated',`Rendering quality set to ${graphicsQuality}.`,'info');} });
$('bottom-controls').addEventListener('click',e=>{const b=e.target.closest('[data-speed]');if(!b)return;state.speed=Number(b.dataset.speed);refreshHUD();notifyLocal(state.speed===0?'Simulation paused':`Simulation speed ${state.speed}×`,state.speed===0?'Airport operations are paused.':`Game time is running at ${state.speed}× speed.`,'info');});
$('cancel-build').addEventListener('click',cancelBuild);
$('panel-toggle').addEventListener('click', togglePanel);
$('toast-stack').addEventListener('click',e=>{const b=e.target.closest('[data-dismiss-toast]');if(!b)return;toastQueue=toastQueue.filter(t=>t.id!==b.dataset.dismissToast);renderToasts();});
$('panel').addEventListener('dblclick',e=>{if(e.target.closest('.panel-header'))togglePanel();});
$('modal-backdrop').addEventListener('click',e=>{if(e.target.id==='modal-backdrop')$('modal-backdrop').classList.add('hidden');});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(selectedBuild)cancelBuild();else if(!$('modal-backdrop').classList.contains('hidden'))$('modal-backdrop').classList.add('hidden');else if(tutorialVisible)advanceTutorial(true);}
  if(e.key.toLowerCase()==='b' && !$('main-menu').classList.contains('hidden')){setActiveTab('build');renderPanel();}
  if(['1','2','4'].includes(e.key) && !$('main-menu').classList.contains('hidden')){state.speed=Number(e.key);refreshHUD();}
  if(e.key===' ' && !$('main-menu').classList.contains('hidden')){e.preventDefault();state.speed=state.speed===0?1:0;refreshHUD();}
});

bootWorld();
updateMenuSaveLabel();

function animate(now) {
  requestAnimationFrame(animate);
  const realDelta=Math.min((now-lastFrame)/1000,.1); lastFrame=now;
  const inGame=$('main-menu').classList.contains('hidden');
  if(inGame && state.speed!==0){
    const oldWeather=state.weather;
    const oldResearch=state.researchInProgress?.remaining;
    tickGame(state,realDelta);
    if(state.notifications.length && state.notifications[0].id !== lastSimulationNotification){lastSimulationNotification=state.notifications[0].id;const n=state.notifications[0];notifyLocal(n.title,n.message,n.type||'info');}
    if(state.researchInProgress){
      state.researchInProgress.remaining-=realDelta*state.speed;
      if(state.researchInProgress.remaining<=0){const r=RESEARCH.find(x=>x.id===state.researchInProgress.id);state.research.push(r.id);state.researchInProgress=null;notifyLocal('Research completed',`${r.name}: ${r.description}`,'success');renderPanel();}
    }
    if(Math.floor(state.gameMinutes/5)!==Math.floor((state._lastPanelTick||0)/5)){if(['missions','overview','flights','operations','contracts','finances'].includes(currentTab))renderPanel();state._lastPanelTick=state.gameMinutes;}
    if(oldWeather!==state.weather)world.setWeather(state.weather);
    world.setTimeOfDay(state.gameMinutes);
    world.syncFlights(activeFlightList());
    if(now-lastAutosave>10000){saveNow(false);lastAutosave=now;}
    if(now%400<18)refreshHUD();
  }
  world.update(realDelta, inGame && state.speed !== 0);
}
requestAnimationFrame(animate);
