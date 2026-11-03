# Airport Tycoon — Final Release 1.0

A browser-based 3D airport management game built with Three.js and Vite. Build an airport, operate passenger and cargo services, keep the runway reliable, grow your airline network and respond to operational incidents.

## Final Release 1.0

### Airport world
- Isometric 3D airport with a terminal, apron, runway 09/27, taxiways, stand markings, approach lighting and textured asphalt.
- Procedural passenger aircraft, passenger jets and cargo freighters.
- Scheduled flight lifecycle: approach, landing, rollout, taxi-in, turnaround, taxi-out and take-off.
- Two visible parked aircraft, animated passengers, baggage tug and carts.
- Surrounding town with houses, shops and continuously moving road traffic.
- Day/night lighting, changing weather and four seasonal landscape palettes.

### Management and progression
- Airport building catalogue with 13 facility types, unlock levels, costs, upkeep and footprint validation.
- Specialist facilities: Cargo Terminal, Airport Hotel and Engineering Depot.
- Employee roles for security, handling, cleaning, maintenance and cargo.
- Airline contracts with progress tracking, cash rewards, XP and facility requirements.
- Operational incidents: baggage backlogs, medical assistance, runway debris and freight delays. Dispatch qualified staff or hire an external response before the timer expires.
- Runway wear, paid repairs, passive income, flight revenue, expenses, research, missions and airport statistics.
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

Saves remain local to the browser. Final Release 1.0 upgrades existing version 1 and version 2 saves to version 3, preserving buildings, staff, finance history and progression while adding contract and incident fields. Saves are not shared between browsers or devices; cloud synchronisation and save export are not included.

## Scope notes

This is a stable single-player browser release. One scheduled aircraft is actively routed through the airport at a time; parked aircraft provide apron traffic and visual life. The simulation is a tycoon model rather than a real-world air traffic control system. Full terminal interior navigation, true multi-aircraft ground pathfinding, multiplayer, sound design and cloud saves are not part of this release.

## GitHub Pages

The HTML loads both stylesheets with relative paths and Vite generates the production CSS asset. GitHub Actions runs tests, builds the site, verifies the stylesheet and deploys the Pages artifact on pushes to `main`.
