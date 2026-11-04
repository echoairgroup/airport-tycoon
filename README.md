# Airport Tycoon — Expanded World Update 1.1

A browser-based 3D airport management game built with Three.js and Vite. Build an airport, operate passenger and cargo services, keep the runway reliable, grow your airline network and respond to operational incidents.

## Final Release 1.0

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

This is a stable single-player browser release. One scheduled aircraft is actively routed through the airport at a time; parked aircraft provide apron traffic and visual life. The simulation is a tycoon model rather than a real-world air traffic control system. Full terminal interior navigation, true multi-aircraft ground pathfinding, multiplayer, sound design and cloud saves are not part of this release.

## GitHub Pages

The HTML loads both stylesheets with relative paths and Vite generates the production CSS asset. GitHub Actions runs the gameplay and construction tests, builds the site, verifies the stylesheet and deploys the Pages artifact on pushes to `main`.


## 2.0 implementation notes
This release uses a simplified single-runway traffic controller: only one aircraft holds the runway reservation for a landing or take-off roll at a time. Ground movements are game routes, not real-world A-SMGCS or a certified ATC model. The world map is schematic and the aircraft fleet uses shared category models; airline-specific aircraft liveries and real-world flight data are not connected.

Internet multiplayer is shown as a planned system only. The live site is static GitHub Pages with browser-local saves; online co-op requires an authenticated realtime backend and server-side authoritative game state. Audio effects are procedural browser tones, not recordings.
