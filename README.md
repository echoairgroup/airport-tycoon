# Airport Tycoon — Living Airport Update 1.2

A browser-based 3D airport management game built with Three.js and Vite. Build an airport, operate passenger and cargo services, keep the runway reliable, grow your airline network and respond to operational incidents.

## Living Airport Update 1.2

### Airport world
- Much larger continuous 3D region with an expanded construction campus (roughly 304 × 148 world units), a marked airport service road, perimeter fencing and room for future development.
- Regional airport with terminal, apron, runway 09/27, taxiways, stand markings, approach lighting and textured asphalt.
- Surrounding road network, larger residential district, local shops, logistics warehouses, cargo truck courts, retention pond, tree belts and distant wind turbines.
- Procedural passenger aircraft, passenger jets and cargo freighters.
- Concurrent independent aircraft with holding patterns, runway sequencing, gate reservations, taxi-in, turnaround, taxi-out and take-off.
- Manual airline flight planning with 12 international destinations, seven operators and six aircraft types.
- An open-top 3D terminal concourse cutaway with check-in, security lanes, boarding lounge seats, duty-free retail and baggage reclaim props.
- Automatic or manual ATC mode, live holding queue and individual landing-clearance controls.
- A queued timetable that dispatches aircraft when a runway slot and free stand are available.
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
- Recurring service income and operating expenses are both posted to the live cash balance.
- Bank loans, principal repayments, interest costs, seven-day investments with an 8% modeled return, daily profit tax and an insolvency threshold.
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

Saves remain local to the browser. The 1.2 update migrates existing version 1, 2 and 3 saves to version 4, preserving airport progress and converting an old single active flight into the new flight collection. Saves are not shared between browsers or devices; cloud synchronisation and save export are not included.

## Scope notes

This is a stable single-player browser release. This remains a browser-based single-player simulation. The new ATC layer sequences aircraft on the runway and reserves stands, but it is not certified real-world air traffic control and does not yet include full multi-aircraft taxiway pathfinding. Multiplayer, cloud saves, networked airline dispatch, full terminal traversal and production audio are later development phases; the airport remains hosted as a static GitHub Pages site.

## GitHub Pages

The HTML loads both stylesheets with relative paths and Vite generates the production CSS asset. GitHub Actions runs the gameplay and construction tests, builds the site, verifies the stylesheet and deploys the Pages artifact on pushes to `main`.

## 1.2 systems and next development phases

### Implemented on the 1.2 release branch
- Multiple active aircraft with independent movement, holding states and stand reservations.
- ATC controller mode selection with manual landing clearances for waiting aircraft.
- Single-runway ATC sequencing so only one aircraft at a time is cleared for runway phases.
- Player-created flight plans with airline, aircraft and international destination selection.
- Loan principal, loan interest, repayments, timed investments, daily profit tax and insolvency tracking.
- Version 4 save migration that carries forward existing progress.

### Planned follow-up work
1. Terminal cutaway/interior rooms with passenger routes, check-in, security, retail, departure seating and baggage reclaim.
2. Real ground-service task chains: baggage, refuelling, catering, pushback, cleaning, maintenance and boarding.
3. Taxiway graph routing, collision avoidance, gate compatibility, runway occupancy sensors and advanced ATC controls.
4. More building categories, freeform construction, larger airports and airport-region/world map.
5. Weather/season rendering improvements, audio, campaign scenarios, sandbox balancing and staff AI.
6. Multiplayer and account-backed cloud saves require a hosted backend and a shared authoritative simulation server; these are not enabled by the static Pages deployment.

Run \`npm test\` and \`npm run build\` before considering the branch ready for merge.
