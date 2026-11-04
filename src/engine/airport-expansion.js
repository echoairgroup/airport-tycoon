export const AIRPORT_DESTINATIONS = [
 {id:'AMS',name:'Amsterdam',country:'Netherlands',region:'Europe',distance:0,mapX:53,mapY:25,demand:1.18},
 {id:'LHR',name:'London',country:'United Kingdom',region:'Europe',distance:360,mapX:47,mapY:27,demand:1.12},
 {id:'CDG',name:'Paris',country:'France',region:'Europe',distance:430,mapX:54,mapY:34,demand:1.12},
 {id:'BRU',name:'Brussels',country:'Belgium',region:'Europe',distance:155,mapX:55,mapY:29,demand:.92},
 {id:'CPH',name:'Copenhagen',country:'Denmark',region:'Europe',distance:635,mapX:59,mapY:20,demand:.95},
 {id:'HAM',name:'Hamburg',country:'Germany',region:'Europe',distance:370,mapX:58,mapY:27,demand:.9},
 {id:'FRA',name:'Frankfurt',country:'Germany',region:'Europe',distance:455,mapX:59,mapY:34,demand:1.08},
 {id:'MAD',name:'Madrid',country:'Spain',region:'Europe',distance:1480,mapX:50,mapY:47,demand:1.04},
 {id:'FCO',name:'Rome',country:'Italy',region:'Europe',distance:1290,mapX:62,mapY:45,demand:1.02},
 {id:'IST',name:'Istanbul',country:'Türkiye',region:'Europe',distance:2200,mapX:70,mapY:40,demand:.98},
 {id:'DXB',name:'Dubai',country:'United Arab Emirates',region:'Middle East',distance:5160,mapX:73,mapY:57,demand:1.24},
 {id:'JFK',name:'New York',country:'United States',region:'North America',distance:5860,mapX:27,mapY:34,demand:1.3},
 {id:'YYZ',name:'Toronto',country:'Canada',region:'North America',distance:6000,mapX:25,mapY:28,demand:1.08},
 {id:'NRT',name:'Tokyo',country:'Japan',region:'Asia',distance:9300,mapX:89,mapY:36,demand:1.2},
 {id:'SIN',name:'Singapore',country:'Singapore',region:'Asia',distance:10400,mapX:82,mapY:67,demand:1.1},
 {id:'CPT',name:'Cape Town',country:'South Africa',region:'Africa',distance:9700,mapX:57,mapY:84,demand:.88}
];
export const AIRLINE_CATALOG = [
 {id:'northstar',name:'Northstar Air',prefix:'NS',color:'#4d9bd7'},
 {id:'skyways',name:'SkyWays',prefix:'SW',color:'#50b98a'},
 {id:'cloudjet',name:'CloudJet',prefix:'CJ',color:'#d68c4b'},
 {id:'bluepeak',name:'BluePeak Airways',prefix:'BP',color:'#8a79d3'},
 {id:'cargo-link',name:'CargoLink',prefix:'CL',color:'#d4a34e'},
 {id:'northstar-freight',name:'Northstar Freight',prefix:'NF',color:'#c77c55'}
];
export const AIRCRAFT_CATALOG = [
 {id:'atr72',model:'ATR 72-600',kind:'regional',seats:70,cargoTons:0,range:1500,turnaround:13,category:'Regional'},
 {id:'q400',model:'Dash 8 Q400',kind:'regional',seats:78,cargoTons:0,range:2000,turnaround:14,category:'Regional'},
 {id:'a320',model:'Airbus A320neo',kind:'jet',seats:180,cargoTons:0,range:6300,turnaround:17,category:'Narrow-body'},
 {id:'b738',model:'Boeing 737-800',kind:'jet',seats:189,cargoTons:0,range:5400,turnaround:17,category:'Narrow-body'},
 {id:'a321',model:'Airbus A321neo',kind:'jet',seats:220,cargoTons:0,range:7400,turnaround:19,category:'Narrow-body'},
 {id:'a330',model:'Airbus A330-300',kind:'jet',seats:287,cargoTons:0,range:11750,turnaround:24,category:'Wide-body'},
 {id:'b787',model:'Boeing 787-9',kind:'jet',seats:296,cargoTons:0,range:14100,turnaround:25,category:'Wide-body'},
 {id:'b738f',model:'Boeing 737-800F',kind:'cargo',seats:0,cargoTons:23,range:3700,turnaround:22,category:'Freighter'},
 {id:'a330f',model:'Airbus A330F',kind:'cargo',seats:0,cargoTons:65,range:7400,turnaround:27,category:'Freighter'}
];
export const INVESTMENT_OPTIONS = [
 {id:'solar-farm',name:'Solar energy partnership',description:'A stable return from a long-term energy concession.',cost:30000,hourlyReturn:180,risk:'Low'},
 {id:'car-rental',name:'Car rental concession',description:'Lease space to a rental-car operator.',cost:52000,hourlyReturn:320,risk:'Low'},
 {id:'cargo-logistics',name:'Regional logistics stake',description:'Co-invest in a freight distribution hub.',cost:90000,hourlyReturn:610,risk:'Medium'},
 {id:'airport-hotel',name:'Hotel development fund',description:'A hospitality partnership near the terminal.',cost:145000,hourlyReturn:980,risk:'Medium'}
];
export const CAMPAIGN_CHAPTERS = [
 {id:'first-traffic',title:'A runway comes alive',description:'Complete five flights and establish reliable daily operations.',metric:'flightsCompleted',goal:5,reward:9000,xp:160},
 {id:'more-stands',title:'Room for the rush',description:'Operate an airport with at least three aircraft stands.',metric:'gates',goal:3,reward:14000,xp:220},
 {id:'network-builder',title:'A growing network',description:'Create scheduled services to four different destinations.',metric:'destinations',goal:4,reward:18000,xp:280},
 {id:'passenger-hub',title:'A proper passenger hub',description:'Serve 500 passengers and expand passenger facilities.',metric:'totalPassengers',goal:500,reward:28000,xp:360},
 {id:'global-gateway',title:'Global gateway',description:'Operate at least one long-haul route and reach airport level 8.',metric:'longHaul',goal:1,reward:50000,xp:600}
];
const DEFAULT_SCHEDULES=[
 {id:'route-ams',destinationId:'AMS',airlineId:'northstar',aircraftId:'a320',interval:38,enabled:true,offset:12},
 {id:'route-lhr',destinationId:'LHR',airlineId:'skyways',aircraftId:'atr72',interval:46,enabled:true,offset:24},
 {id:'route-cdg',destinationId:'CDG',airlineId:'cloudjet',aircraftId:'q400',interval:54,enabled:true,offset:34}
];
export function createAirportExpansionState(startTime=480){
 return {
  schemaVersion:1,world:{buildRadius:90,purchasedParcels:0},mode:'career',
  atc:{mode:'automatic',runwayFlightId:null},nextFlightNumber:1,
  schedules:DEFAULT_SCHEDULES.map(route=>({...route,nextAt:startTime+route.offset})),activeFlights:[],
  terminal:{checkInQueue:0,securityQueue:0,baggageQueue:0,checkedIn:0,securityScreened:0,bagsHandled:0,fuelServices:0,cateringServices:0,maintenanceChecks:0},
  finance:{taxRate:.08,loans:[],investments:[],taxPaid:0},campaign:{chapter:0,completed:[]},
  multiplayer:{enabled:false,provider:'not-configured'}
 };
}
export function ensureAirportExpansionState(state){
 const defaults=createAirportExpansionState(Number(state.gameMinutes)||480);
 const current=state.expansion&&typeof state.expansion==='object'?state.expansion:{};
 const e={
  ...defaults,...current,world:{...defaults.world,...(current.world||{})},
  atc:{...defaults.atc,...(current.atc||{})},terminal:{...defaults.terminal,...(current.terminal||{})},
  finance:{...defaults.finance,...(current.finance||{})},campaign:{...defaults.campaign,...(current.campaign||{})},
  multiplayer:{...defaults.multiplayer,...(current.multiplayer||{})},
  schedules:Array.isArray(current.schedules)?current.schedules:defaults.schedules,
  activeFlights:Array.isArray(current.activeFlights)?current.activeFlights:[],
  nextFlightNumber:Math.max(1,Number(current.nextFlightNumber)||1)
 };
 e.schedules=e.schedules.map(route=>({...route,interval:Math.max(20,Math.min(360,Number(route.interval)||45)),enabled:route.enabled!==false,nextAt:Number.isFinite(route.nextAt)?route.nextAt:state.gameMinutes+12}));
 e.activeFlights=e.activeFlights.filter(f=>f&&typeof f.id==='string'&&f.position&&typeof f.position.x==='number');
 state.expansion=e;
 if(!Number.isFinite(state.nextFlightAt)||state.nextFlightAt<Number.MAX_SAFE_INTEGER)state.nextFlightAt=Number.MAX_SAFE_INTEGER;
 return e;
}
export function investmentHourlyIncome(state){
 const selected=new Set(state.expansion?.finance?.investments?.map(item=>item.id)||[]);
 return INVESTMENT_OPTIONS.reduce((sum,item)=>sum+(selected.has(item.id)?item.hourlyReturn:0),0);
}
export function loanHourlyPaymentBreakdown(state){
 return (state.expansion?.finance?.loans||[]).reduce((sum,loan)=>{
  const principal=Math.max(0,Number(loan.principal)||0),remaining=Math.max(1,Number(loan.remainingHours)||1);
  return {principal:sum.principal+principal/remaining,interest:sum.interest+principal*(Math.max(0,Number(loan.apr)||8)/100)/240};
 },{principal:0,interest:0});
}
export function taxHourlyAmount(state,income,operatingExpenses,loanInterest=0){
 return Math.max(0,income-operatingExpenses-loanInterest)*Math.max(0,Math.min(.4,Number(state.expansion?.finance?.taxRate??.08)));
}
export function getNextLandExpansionCost(state){
 return Math.round(55000*Math.pow(1.72,Number(state.expansion?.world?.purchasedParcels)||0));
}
export function buyLandExpansion(state){
 const e=ensureAirportExpansionState(state),cost=getNextLandExpansionCost(state);
 if(e.mode!=='sandbox'&&state.money<cost)return {ok:false,reason:'funds',cost};
 if(e.mode!=='sandbox'){state.money-=cost;state.lifetimeExpenses=(state.lifetimeExpenses||0)+cost;}
 e.world.purchasedParcels++;e.world.buildRadius+=40;
 return {ok:true,cost,radius:e.world.buildRadius};
}
export function takeAirportLoan(state,amount){
 const e=ensureAirportExpansionState(state),value=Math.round(Number(amount)||0),limit=100000+Math.max(1,state.level||1)*50000;
 if(value<5000||value>limit)return {ok:false,reason:'limit',limit};
 if(e.mode==='sandbox')return {ok:true,amount:0,balance:0};
 e.finance.loans.push({id:'loan-'+Date.now(),principal:value,originalPrincipal:value,apr:8,remainingHours:240});
 state.money+=value;state.lifetimeRevenue=(state.lifetimeRevenue||0)+value;
 return {ok:true,amount:value,balance:e.finance.loans.reduce((s,l)=>s+l.principal,0)};
}
export function repayAirportLoan(state,amount=10000){
 const e=ensureAirportExpansionState(state);
 if(e.mode==='sandbox')return {ok:true,amount:0,balance:0};
 let remaining=Math.min(Math.max(0,Number(amount)||0),state.money);
 if(remaining<=0)return {ok:false,reason:'funds'};
 const requested=remaining;
 for(const loan of e.finance.loans){if(remaining<=0)break;const paid=Math.min(loan.principal,remaining);loan.principal-=paid;remaining-=paid;}
 e.finance.loans=e.finance.loans.filter(loan=>loan.principal>.01);
 const paid=requested-remaining;state.money-=paid;state.lifetimeExpenses=(state.lifetimeExpenses||0)+paid;
 return {ok:paid>0,amount:paid,balance:e.finance.loans.reduce((s,l)=>s+l.principal,0)};
}
export function makeAirportInvestment(state,id){
 const e=ensureAirportExpansionState(state),option=INVESTMENT_OPTIONS.find(item=>item.id===id);
 if(!option)return {ok:false,reason:'unknown'};
 if(e.finance.investments.some(item=>item.id===id))return {ok:false,reason:'owned'};
 if(e.mode!=='sandbox'&&state.money<option.cost)return {ok:false,reason:'funds',cost:option.cost};
 if(e.mode!=='sandbox'){state.money-=option.cost;state.lifetimeExpenses=(state.lifetimeExpenses||0)+option.cost;}
 e.finance.investments.push({id:option.id,purchasedAt:state.gameMinutes});
 return {ok:true,option};
}
export function setAtcMode(state,mode){
 if(!['automatic','manual'].includes(mode))return false;
 ensureAirportExpansionState(state).atc.mode=mode;return true;
}
export function grantAtcClearance(state,flightId,type){
 const flight=state.expansion?.activeFlights?.find(item=>item.id===flightId);
 if(!flight)return {ok:false,reason:'flight'};
 if(type==='arrival'&&flight.phase==='holding'){flight.arrivalCleared=true;return {ok:true};}
 if(type==='departure'&&flight.phase==='ready-departure'){flight.departureCleared=true;return {ok:true};}
 return {ok:false,reason:'phase'};
}
export function addFlightSchedule(state,input={}){
 const e=ensureAirportExpansionState(state);
 const destination=AIRPORT_DESTINATIONS.find(item=>item.id===input.destinationId);
 const airline=AIRLINE_CATALOG.find(item=>item.id===input.airlineId);
 const aircraft=AIRCRAFT_CATALOG.find(item=>item.id===input.aircraftId);
 if(!destination||!airline||!aircraft)return {ok:false,reason:'invalid'};
 if(aircraft.range<destination.distance)return {ok:false,reason:'range',aircraft,destination};
 if(e.schedules.length>=18)return {ok:false,reason:'limit'};
 const interval=Math.max(20,Math.min(360,Math.round(Number(input.interval)||45)));
 const route={id:'route-'+e.nextFlightNumber++,destinationId:destination.id,airlineId:airline.id,aircraftId:aircraft.id,interval,enabled:true,nextAt:state.gameMinutes+3};
 e.schedules.push(route);return {ok:true,route};
}
export function campaignMetric(state,chapter){
 if(chapter.metric==='gates')return 1+state.buildings.filter(item=>item.type==='gate').length;
 if(chapter.metric==='destinations')return new Set(state.expansion.schedules.map(item=>item.destinationId)).size;
 if(chapter.metric==='longHaul')return state.expansion.schedules.filter(route=>{const d=AIRPORT_DESTINATIONS.find(item=>item.id===route.destinationId);return d&&d.distance>3500;}).length;
 return Number(state[chapter.metric])||0;
}
export function claimCampaignChapter(state){
 const e=ensureAirportExpansionState(state),chapter=CAMPAIGN_CHAPTERS[e.campaign.chapter];
 if(!chapter)return {ok:false,reason:'complete'};
 const progress=campaignMetric(state,chapter);
 if(progress<chapter.goal)return {ok:false,reason:'progress',progress,goal:chapter.goal};
 if(e.mode!=='sandbox'){state.money+=chapter.reward;state.lifetimeRevenue=(state.lifetimeRevenue||0)+chapter.reward;}
 state.xp=(state.xp||0)+chapter.xp;e.campaign.completed.push(chapter.id);e.campaign.chapter++;
 return {ok:true,chapter};
}
export function setGameMode(state,mode){
 if(!['career','sandbox'].includes(mode))return false;
 ensureAirportExpansionState(state).mode=mode;return true;
}
const SERVICE_STEPS=[
 {id:'unload',label:'Passenger & baggage unloading',role:'baggage',duration:2.4},
 {id:'clean',label:'Cabin cleaning',role:'cleaning',duration:2},
 {id:'fuel',label:'Fuel service',role:'fueling',duration:2.2},
 {id:'catering',label:'Catering service',role:'catering',duration:2},
 {id:'maintenance',label:'Technical inspection',role:'mechanics',duration:2.4},
 {id:'checkin',label:'Check-in & security processing',role:'checkin',duration:2.6},
 {id:'load',label:'Baggage loading',role:'handling',duration:2.2},
 {id:'boarding',label:'Passenger boarding',role:'cabinCrew',duration:2.2}
];
function setRoute(flight,route,speed){
 flight.route=route;flight.routeIndex=0;flight.segmentDistance=0;flight.moveSpeed=speed;flight.position={...route[0]};
 if(route.length>1)flight.yaw=Math.atan2(route[1].x-route[0].x,route[1].z-route[0].z);
}
function advanceRoute(flight,delta){
 let distance=flight.moveSpeed*delta;
 while(distance>0&&flight.routeIndex<flight.route.length-1){
  const a=flight.route[flight.routeIndex],b=flight.route[flight.routeIndex+1],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=Math.hypot(dx,dy,dz)||.001;
  const step=Math.min(len-flight.segmentDistance,distance);flight.segmentDistance+=step;distance-=step;
  const t=flight.segmentDistance/len;flight.position={x:a.x+dx*t,y:a.y+dy*t,z:a.z+dz*t};
  const target=Math.atan2(dx,dz),angle=((target-(flight.yaw||target)+Math.PI*3)%(Math.PI*2))-Math.PI;
  flight.yaw=(flight.yaw||target)+angle*Math.min(1,delta*1.8);
  if(flight.segmentDistance>=len-.001){flight.routeIndex++;flight.segmentDistance=0;}
 }
 return flight.routeIndex>=flight.route.length-1;
}
function gates(state){return [{id:'initial-gate',x:8,z:8.5},...state.buildings.filter(item=>item.type==='gate')];}
function freeGate(state){
 const occupied=new Set(state.expansion.activeFlights.map(item=>item.gateId).filter(Boolean));
 return gates(state).find(gate=>!occupied.has(gate.id))||null;
}
function routeToGate(gate){
 return [{x:22,y:1,z:-16},{x:22,y:1,z:-8},{x:21,y:1,z:-4},{x:17,y:1,z:-.5},{x:13,y:1.08,z:3},{x:gate.x+2.7,y:1.08,z:gate.z},{x:gate.x,y:1.08,z:gate.z}];
}
function createFlight(state,schedule){
 const d=AIRPORT_DESTINATIONS.find(item=>item.id===schedule.destinationId),a=AIRLINE_CATALOG.find(item=>item.id===schedule.airlineId),type=AIRCRAFT_CATALOG.find(item=>item.id===schedule.aircraftId);
 if(!d||!a||!type)return null;
 const number=state.expansion.nextFlightNumber++,passengers=type.seats?Math.min(type.seats,Math.round(type.seats*(.52+(state.reputation||50)/220)*d.demand)):0;
 const flight={id:a.prefix+String(100+number).padStart(3,'0'),scheduleId:schedule.id,airline:a.name,airlineId:a.id,model:type.model,aircraftId:type.id,kind:type.kind,destination:d.name,destinationId:d.id,passengers,cargoTons:type.cargoTons,phase:'holding',timer:0,position:{x:-76-(state.expansion.activeFlights.length%4)*5,y:17+(state.expansion.activeFlights.length%3)*2,z:-16+(state.expansion.activeFlights.length%4)*4},yaw:Math.PI/2,gateId:null,serviceIndex:0,serviceRemaining:0,arrivalCleared:false,departureCleared:false,createdAt:state.gameMinutes};
 state.expansion.activeFlights.push(flight);
 const terminal=state.expansion.terminal;terminal.checkInQueue+=passengers;terminal.securityQueue+=passengers;terminal.baggageQueue+=passengers+type.cargoTons*2;
 return flight;
}
function notify(callbacks,title,message,type='info'){callbacks.onEvent?.({title,message,type});}
function beginArrival(state,flight,callbacks){
 const gate=freeGate(state);if(!gate||state.expansion.atc.runwayFlightId)return false;
 flight.gateId=gate.id;state.expansion.atc.runwayFlightId=flight.id;
 setRoute(flight,[{x:-72,y:16,z:-16},{x:-54,y:8,z:-16},{x:-39,y:3.1,z:-16},{x:-28,y:1.19,z:-16}],4);
 flight.phase='approach';notify(callbacks,'Aircraft cleared to land',flight.airline+' '+flight.id+' is established on final approach.','flight');return true;
}
function startTakeoff(state,flight){
 if(state.expansion.atc.runwayFlightId&&state.expansion.atc.runwayFlightId!==flight.id)return false;
 state.expansion.atc.runwayFlightId=flight.id;
 setRoute(flight,[{x:22,y:1.19,z:-16},{x:32,y:2.6,z:-16},{x:44,y:6,z:-16},{x:62,y:11.5,z:-16}],5.5);
 flight.phase='takeoff';flight.timer=0;return true;
}
export function tickAirportExpansion(state,gameDelta,callbacks={}){
 if(!Number.isFinite(gameDelta)||gameDelta<=0)return;
 const e=ensureAirportExpansionState(state);
 for(const schedule of e.schedules){
  if(!schedule.enabled||state.gameMinutes<schedule.nextAt)continue;
  if(e.activeFlights.length<12){const flight=createFlight(state,schedule);if(flight)notify(callbacks,'Flight scheduled',flight.airline+' '+flight.id+' from '+flight.destination+' is entering the traffic queue.','flight');}
  schedule.nextAt=state.gameMinutes+schedule.interval;
 }
 const completed=[];
 for(const flight of [...e.activeFlights]){
  flight.timer=(flight.timer||0)+gameDelta;
  if(flight.phase==='holding'){
   if((e.atc.mode==='automatic'||flight.arrivalCleared)&&freeGate(state)&&!e.atc.runwayFlightId)beginArrival(state,flight,callbacks);
  }else if(flight.phase==='approach'){
   if(advanceRoute(flight,gameDelta)){
    flight.phase='landing-rollout';flight.timer=0;
    setRoute(flight,[{x:-28,y:1.19,z:-16},{x:-16,y:1.19,z:-16},{x:0,y:1.19,z:-16},{x:22,y:1.19,z:-16}],5.8);
    state.stats.landings=(state.stats.landings||0)+1;state.runwayCondition=Math.max(40,(state.runwayCondition??100)-.18);
    notify(callbacks,'Touchdown',flight.airline+' '+flight.id+' has landed on runway 09.','success');
   }
  }else if(flight.phase==='landing-rollout'){
   if(advanceRoute(flight,gameDelta)){
    e.atc.runwayFlightId=null;
    const gate=gates(state).find(item=>item.id===flight.gateId)||gates(state)[0];
    setRoute(flight,routeToGate(gate),2.7);flight.phase='taxi-in';
    notify(callbacks,'Runway vacated',flight.id+' is taxiing to its assigned stand.','flight');
   }
  }else if(flight.phase==='taxi-in'){
   if(advanceRoute(flight,gameDelta)){flight.phase='servicing';flight.serviceIndex=0;flight.serviceRemaining=0;flight.position.y=1.08;notify(callbacks,'Aircraft on stand',flight.id+' is parked. Ground services have started.','success');}
  }else if(flight.phase==='servicing'){
   const step=SERVICE_STEPS[flight.serviceIndex];
   if(!step){flight.phase='ready-departure';flight.timer=0;notify(callbacks,'Turnaround complete',flight.id+' is ready for departure clearance.','success');}
   else{
    if(!flight.serviceRemaining){
     const workers=Number(state.staff?.[step.role])||0,efficiency=Math.max(.62,.78+workers*.08+(state.research.includes('fast-handling')?.15:0));
     flight.serviceRemaining=step.duration/efficiency;flight.currentService=step.label;
    }
    flight.serviceRemaining-=gameDelta;
    if(flight.serviceRemaining<=0){
     const terminal=e.terminal;
     if(step.id==='unload'){terminal.baggageQueue=Math.max(0,terminal.baggageQueue-flight.passengers-flight.cargoTons*2);terminal.bagsHandled+=flight.passengers+flight.cargoTons*2;}
     if(step.id==='fuel')terminal.fuelServices++;
     if(step.id==='catering')terminal.cateringServices++;
     if(step.id==='maintenance')terminal.maintenanceChecks++;
     if(step.id==='checkin'){terminal.checkInQueue=Math.max(0,terminal.checkInQueue-flight.passengers);terminal.securityQueue=Math.max(0,terminal.securityQueue-flight.passengers);terminal.checkedIn+=flight.passengers;terminal.securityScreened+=flight.passengers;}
     if(step.id==='load')terminal.baggageQueue+=flight.passengers*.25;
     if(step.id==='boarding')terminal.baggageQueue=Math.max(0,terminal.baggageQueue-flight.passengers*.25);
     flight.serviceIndex++;flight.serviceRemaining=0;
    }
   }
  }else if(flight.phase==='ready-departure'){
   if(e.atc.mode==='automatic'||flight.departureCleared){flight.phase='pushback';flight.timer=0;notify(callbacks,'Pushback',flight.id+' is being pushed back from its stand.','flight');}
  }else if(flight.phase==='pushback'){
   if(flight.timer>=1.5){const gate=gates(state).find(item=>item.id===flight.gateId)||gates(state)[0];setRoute(flight,routeToGate(gate).reverse(),2.6);flight.phase='taxi-out';flight.timer=0;}
  }else if(flight.phase==='taxi-out'){
   if(advanceRoute(flight,gameDelta)){flight.phase='runway-queue';flight.position={x:22,y:1.19,z:-16};flight.timer=0;}
  }else if(flight.phase==='runway-queue'){
   if(!e.atc.runwayFlightId)startTakeoff(state,flight);
  }else if(flight.phase==='takeoff'){
   if(advanceRoute(flight,gameDelta)){
    e.atc.runwayFlightId=null;callbacks.onComplete?.(flight);
    notify(callbacks,'Flight departed',flight.id+' has departed for '+flight.destination+'.','success');completed.push(flight.id);
   }
  }
 }
 if(completed.length)e.activeFlights=e.activeFlights.filter(flight=>!completed.includes(flight.id));
}
export function flightExpansionPhaseLabel(phase){
 return ({holding:'Holding for landing clearance / stand',approach:'Final approach','landing-rollout':'Landing roll','taxi-in':'Taxiing to stand',servicing:'Ground services and turnaround','ready-departure':'Awaiting departure clearance',pushback:'Pushback','taxi-out':'Taxiing to runway','runway-queue':'Holding short of runway',takeoff:'Take-off roll'})[phase]||'Scheduled';
}