# Airport Tycoon — Multi-Aircraft Operations Update 1.2

A browser-based 3D airport management game built with Three.js and Vite. Build an expanding airport, operate passenger and cargo services, coordinate multiple aircraft, manage runway and taxiway capacity, grow your airline network and respond to operational incidents.

## Release history

- **1.2** — Multi-aircraft operations foundation, exclusive runway/taxiway reservations and save format 4.
- **1.1** — Expanded world and corrected recurring cash flow.

## Airport world

### Airport world
- Much larger continuous 3D region with an expanded construction campus (roughly 184 × 78 world units), a marked airport service road, perimeter fencing and room for future development.
- Regional airport with terminal, apron, runway 09/27, taxiways, stand markings, approach lighting and textured asphalt.
- Surrounding road network, larger residential district, local shops, logistics warehouses, cargo truck courts, retention pond, tree belts and distant wind turbines.
- Procedural passenger aircraft, passenger jets and cargo freighters.
- Scheduled flight lifecycle: approach, landing, rollout, taxi-in, turnaround, taxi-out and take-off.
- Two visible parked aircraft, animated passengers, baggage tug and carts.
- Surrounding town with houses, shops and continuously moving road traffic on a 14-car regional road network.
- Day/night lighting, changing weather and four seasonal landscape palettes.

### Management and progression
- Airport building catalogue with 13 facility types, unlock levels, costs, upkeep and footprint validation.
- Specialist facilities: Cargo Terminal, Airport Hotel and Engineering Depot.
- Employee roles for security, handling, cleaning, maintenance and cargo.
- Airline contracts with progress tracking, cash rewards, XP and facility requirements.
- Operational incidents: baggage backlogs, medical assistance, runway debris and freight delays. Dispatch qualified staff or hire an external response before the timer expires.
- Runway wear, paid repairs, flight revenue, research, missions and airport statistics.
- Recurring service income and operating expenses are now both posted to the live cash balance; the finance screen itemises each income and cost category. The starter airport begins with a positive cash flow.
- Demolish additional buildings for a 55% purchase-price refund. Gates in active use are protected from demolition.

### Learning and controls
- Six-step beginner tutorial and a permanent advanced reference guide.
- Left mouse drag: rotate the camera.
- Mouse wheel: zoom.
- Right mouse drag: pan.
- `B`: open Build.
- `Esc`: cancel placement or dismiss the tutorial.
- `1`, `2`, `4`: simulation speed.
- `Space`: pause/resume.
- Collapse or reopen the management panel with its arrow control.

## Run locally

1. Install Node.js 20.19+ or 22.12+.
2. Open the repository folder in a terminal.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the local URL printed by Vite.

Run `npm test` to execute the automated gameplay and placement checks. Run `npm run build` to create the production website in `dist/`.

On Windows, `Start-Airport-Tycoon.bat` starts the local development version and `Build-Airport-Tycoon.bat` creates the production build.

## Saves and compatibility

Saves remain local to the browser. The 1.1 update keeps the existing version 1, 2 and 3 save migration path; the enlarged scenery and service-yard area do not reset existing airport progress. Saves are not shared between browsers or devices; cloud synchronisation and save export are not included.

## Scope notes

This is a single-player browser release. The 1.2 traffic layer supports multiple active aircraft, holding patterns, separate gate reservations and exclusive runway/shared-taxiway use. It is still a tycoon simulation rather than a real-world ATC system. Full terminal interior navigation, parallel taxiway pathfinding, advanced baggage/security/boarding processes, multiplayer, sound design and cloud saves remain later development stages.

## GitHub Pages

The HTML loads both stylesheets with relative paths and Vite generates the production CSS asset. GitHub Actions runs the gameplay and construction tests, builds the site, verifies the stylesheet and deploys the Pages artifact on pushes to `main`.


## Update 1.2 — multi-aircraft operations foundation

- The simulation stores multiple active visiting aircraft instead of a single active flight.
- Each aircraft reserves one physical gate from arrival scheduling until it has departed. Gate capacity therefore controls how many visiting aircraft can be handled at the same time.
- A second arrival can enter a visible holding pattern while another aircraft is using the approach or runway.
- Runway and shared taxiway reservations are exclusive. Aircraft wait at the runway exit or departure holding point instead of being allowed to overlap on the same piece of pavement.
- The 3D renderer maintains a separate aircraft model for every active flight and animates each aircraft's propellers and navigation lights independently.
- The Flights and Aircraft panels show all active arrivals, holding aircraft, taxi movements, parked aircraft and departures.
- Save format 4 migrates existing version 1–3 airports and retains the old single-flight save field for compatibility.

### Traffic model boundaries

This is the first operational traffic layer, not a certified air-traffic-control simulation. The airport currently models one shared taxiway reservation and one runway reservation at a time. Multiple arrivals can be visible and queued, and multiple aircraft can occupy separate gates, but parallel taxiway pathfinding, editable real airline timetables, ATC phraseology, live multiplayer, cloud saves and backend-hosted shared worlds are not included in this update. The next engineering stages are a node-based taxiway network, user-editable airline schedules, terminal passenger processes, detailed ground-service chains, then a backend for accounts, cloud saves and multiplayer synchronisation.

### ATC controls and manual flight planning

The 1.2 operations foundation also includes an accessible ATC control desk. Players can manually schedule selected aircraft/airline/destination combinations, issue holding and approach-clearance commands, and close or reopen the runway when it is safe to do so. The control desk presents runway and taxiway occupancy and the live arrival sequence. It does not yet implement a full procedural ATC phraseology model, configurable SID/STAR procedures, multiple intersecting runways or independently routed taxiway nodes.

### Ground handling turnaround

Passenger flights now pass through baggage unloading, refuelling, catering, technical inspection, passenger boarding/security and pushback before taxiing out. Cargo aircraft use separate unloading and freight-loading tasks. Staffing, research and the presence of specialist facilities change service times. The stages are simulated as operational tasks; dedicated animated baggage carts, fuel trucks, catering trucks, staff task agents and service billing remain future visual/economic integrations.

### Loans, corporate tax and capital investments

The 1.2 finance layer supports three optional loan sizes with transparent game-hour interest and scheduled principal repayment, early full repayment, selectable corporate tax rates and one-time capital projects. Taxes are calculated on positive operating profit after the recurring operating and financing cost base. Purchased investments flow into the same recurring income/savings/maintenance totals used by the bank balance and finance panel. Existing save games receive empty loan/investment ledgers and the default 8% tax policy during save format 5 migration.

### Repeatable airport land expansion

Airport management now supports repeatable land acquisitions to the west, east and north. Every purchase creates a saved parcel with its own coordinates and a matching 3D terrain/grid tile; the placement validator accepts service buildings only inside the original yard or owned parcels. Costs rise with each acquired parcel. Purchased parcels are restored when an existing airport save is loaded. This is expandable plot-based construction, not a streamed planetary world: the existing runway/apron and terminal approach remain fixed airside infrastructure until a later airport-layout/pathfinding redesign.

### Global routes, campaign chapters and airport ambience

- The world-map panel now lists 19 international destination airports around the Skyport hub, with IATA codes, countries and approximate one-way distances.
- Players can pick an aircraft and airline and schedule a destination directly into the multi-aircraft traffic system.
- Mission objectives are grouped into three longer campaign chapters: Regional airport, International gateway and Major airport hub. They include long-term milestones for flight volume, passengers, land expansion, airline contracts, cargo, airport level and construction.
- Settings now include a user-activated procedural ambience soundscape with volume controls. It synthesises soft wind, terminal ventilation and low airfield ambience through Web Audio; it is not a library of recorded aircraft, vehicle or ATC sounds.

### Airside layout pieces

The build catalogue now includes rotatable taxiway segments and aircraft apron pads. Use the R key while placing to rotate a piece by 90 degrees. New aircraft gates can be placed on the original apron or inside a purchased expansion parcel after an apron pad is built there. Both the placement preview and saved building restore retain the selected orientation. The taxiway and apron pieces are currently construction/visual infrastructure; the traffic engine still uses its shared runway and taxiway reservation model rather than a full node-by-node route planner, and the current runway extension remains tied to the two original runway ends.

### Passenger movement and emergency response

The visible pedestrian loop now passes through the terminal interior, connecting the check-in side, security area, departure lounge and baggage side. Active operational incidents also create a visible response scene with airport responders and an emergency/support vehicle. A new aircraft-fire warning incident requires a staffed fire facility for the lower-cost in-house response; unresolved incidents carry a larger financial and reputation penalty. Emergency-response animation is a game-world representation, not a real fire physics or rescue certification model.
