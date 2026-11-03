# Airport Tycoon — Phase 1 playable foundation

A browser-based, single-player airport tycoon game built with Vite and Three.js.

## Run locally

1. Install Node.js 20.19+ (or 22.12+).
2. Extract the ZIP file.
3. Double-click `Start-Airport-Tycoon.bat` on Windows, or open a terminal in this folder.
4. In a terminal, run `npm install` and then `npm run dev`.
5. Open the local URL printed by Vite (normally http://localhost:5173).

For a production bundle run `npm run build`; the deployable files are written to `dist/`.

## Controls

- Left mouse drag: rotate the camera.
- Mouse wheel: zoom.
- Middle mouse drag: pan.
- `B`: open Build.
- `Esc`: cancel building placement / close a modal.
- `1`, `2`, `4`: set simulation speed.
- `Space`: pause / resume.

## Implemented in this build

- Procedural 3D airport scene with runway, taxiway, terminal, aircraft stand, control tower details, trees and apron markings.
- Orbit camera with pan, rotate and zoom.
- A scheduled aircraft that approaches, lands, taxis to its gate, turns around, taxis out and takes off along world-space paths.
- Construction catalogue with costs, unlock levels, placement previews, location validation, maintenance and XP.
- Working game clock, pause and 1× / 2× / 4× speeds.
- Flight revenue, wages, building maintenance, passive shop / parking income and financial history.
- Staff hiring and release, passenger satisfaction, missions and claimable rewards, research projects and level progression.
- Weather state changes and visual atmosphere adjustments.
- Automatic and manual local saves, load support and capped offline earnings.
- Management panels for Overview, Build, Flights, Aircraft, Employees, Passengers, Finances, Research, Missions, Statistics and Settings.

## Current scope

This is the first playable foundation, not the complete long-term feature set from the master prompt. The first flight and core economy are playable. Full multi-aircraft pathfinding, airline contract negotiations, individual passenger crowds, demolition/refunds, detailed emergency response, audio, cloud saves and later progression content remain planned expansions.

Save data is stored in browser `localStorage` for this first version. Do not clear browser site data if you want to keep the airport.
