import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_STATE } from '../src/data.js';
import { hourlyIncome } from '../src/engine/economy.js';
import { addFlightSchedule,tickAirportExpansion,setAtcMode,grantAtcClearance,takeAirportLoan,repayAirportLoan,makeAirportInvestment,buyLandExpansion,campaignMetric,CAMPAIGN_CHAPTERS } from '../src/engine/airport-expansion.js';

test('expansion initializes international schedules and v4 state',()=>{
 const state=INITIAL_STATE();assert.equal(state.version,4);assert.equal(state.expansion.schedules.length,3);
 assert.equal(state.expansion.atc.mode,'automatic');assert.equal(state.nextFlightAt,Number.MAX_SAFE_INTEGER);
});
test('multiple scheduled aircraft can coexist in the traffic queue',()=>{
 const state=INITIAL_STATE(),first=state.expansion.schedules[0],second={...state.expansion.schedules[1],nextAt:first.nextAt};
 state.expansion.schedules=[first,second];state.gameMinutes=first.nextAt+1;tickAirportExpansion(state,.1);
 assert.equal(state.expansion.activeFlights.length,2);
 assert.equal(state.expansion.activeFlights.filter(f=>f.phase==='approach').length,1);
 assert.equal(state.expansion.activeFlights.filter(f=>f.phase==='holding').length,1);
 assert.equal(state.expansion.activeFlights.filter(f=>f.gateId).length,1);
});
test('manual ATC holds arrivals until explicit landing clearance',()=>{
 const state=INITIAL_STATE();setAtcMode(state,'manual');
 const result=addFlightSchedule(state,{destinationId:'AMS',airlineId:'northstar',aircraftId:'a320',interval:45});
 state.expansion.schedules=[result.route];state.gameMinutes=result.route.nextAt+1;tickAirportExpansion(state,.1);
 const flight=state.expansion.activeFlights[0];assert.equal(flight.phase,'holding');
 assert.equal(grantAtcClearance(state,flight.id,'arrival').ok,true);tickAirportExpansion(state,.1);
 assert.equal(flight.phase,'approach');assert.equal(state.expansion.atc.runwayFlightId,flight.id);
});
test('manual departure clearance is phase-gated',()=>{
 const state=INITIAL_STATE();setAtcMode(state,'manual');
 state.expansion.activeFlights.push({id:'NS999',phase:'ready-departure',position:{x:8,y:1,z:8},gateId:'initial-gate'});
 assert.equal(grantAtcClearance(state,'NS999','departure').ok,true);assert.equal(grantAtcClearance(state,'missing','departure').ok,false);
});
test('regional aircraft cannot be scheduled beyond their declared range',()=>{
 const result=addFlightSchedule(INITIAL_STATE(),{destinationId:'NRT',airlineId:'northstar',aircraftId:'atr72',interval:60});
 assert.equal(result.ok,false);assert.equal(result.reason,'range');
});
test('land purchase extends the construction radius',()=>{
 const state=INITIAL_STATE(),before=state.expansion.world.buildRadius,result=buyLandExpansion(state);
 assert.equal(result.ok,true);assert.equal(result.radius,before+40);assert.equal(state.expansion.world.purchasedParcels,1);
});
test('loans add funds and repayments reduce principal',()=>{
 const state=INITIAL_STATE(),loan=takeAirportLoan(state,50000);assert.equal(loan.ok,true);assert.equal(state.money,125000);
 const payment=repayAirportLoan(state,12000);assert.equal(payment.amount,12000);assert.equal(state.expansion.finance.loans[0].principal,38000);
});
test('airport investments add recurring revenue',()=>{
 const state=INITIAL_STATE(),before=hourlyIncome(state),result=makeAirportInvestment(state,'solar-farm');
 assert.equal(result.ok,true);assert.equal(hourlyIncome(state)-before,180);
});
test('campaign destination milestones count distinct routes',()=>{
 assert.equal(campaignMetric(INITIAL_STATE(),CAMPAIGN_CHAPTERS[2]),3);
});


test('an arriving aircraft completes the full landing, stand, service and departure cycle',()=>{
 const state=INITIAL_STATE();
 const route=addFlightSchedule(state,{destinationId:'AMS',airlineId:'northstar',aircraftId:'a320',interval:45}).route;
 state.expansion.schedules=[route];
 state.gameMinutes=route.nextAt;
 const completed=[];
 tickAirportExpansion(state,.1,{onComplete:flight=>completed.push(flight)});
 state.expansion.schedules[0].enabled=false;
 for(let i=0;i<1200&&completed.length===0;i++){
  state.gameMinutes+=.25;
  tickAirportExpansion(state,.25,{onComplete:flight=>completed.push(flight)});
 }
 assert.equal(completed.length,1);
 assert.equal(state.expansion.activeFlights.length,0);
 assert.equal(state.stats.landings,1);
 assert.ok(state.expansion.terminal.checkedIn>0);
 assert.ok(state.expansion.terminal.securityScreened>0);
 assert.ok(state.expansion.terminal.fuelServices>0);
 assert.ok(state.expansion.terminal.cateringServices>0);
 assert.ok(state.expansion.terminal.maintenanceChecks>0);
});

test('only one flight can hold the runway reservation at a time',()=>{
 const state=INITIAL_STATE();
 const first=addFlightSchedule(state,{destinationId:'AMS',airlineId:'northstar',aircraftId:'a320',interval:45}).route;
 const second=addFlightSchedule(state,{destinationId:'LHR',airlineId:'skyways',aircraftId:'atr72',interval:45}).route;
 state.expansion.schedules=[{...first,nextAt:500},{...second,nextAt:500}];
 state.gameMinutes=501;
 tickAirportExpansion(state,.1);
 assert.equal(state.expansion.activeFlights.length,2);
 assert.equal(state.expansion.activeFlights.filter(f=>['approach','landing-rollout','takeoff'].includes(f.phase)).length,1);
 assert.ok(state.expansion.atc.runwayFlightId);
});
