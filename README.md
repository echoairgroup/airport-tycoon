# Airport Tycoon — Arcade Build 0.2

A browser-based, single-player airport tycoon game built with Vite and Three.js.
This update is a visual and gameplay pass over the first playable foundation.

## GitHub Pages and styling

The HTML loads both stylesheets directly from `src/` using relative paths. This supports the normal Vite production build and the repository-root Pages fallback. The source entry point and all asset paths are relative, so the project also works below the `/airport-tycoon/` project path.

## Run locally

1. Install Node.js 20.19+ (or 22.12+).
2. Open this project folder in a terminal.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the local URL printed by Vite (normally http://localhost:5173).

Run `npm test` to execute the 11 placement/collision checks, including runway-end placement rules.

On Windows, `Start-Airport-Tycoon.bat` performs the install (when needed) and starts the game. `Build-Airport-Tycoon.bat` creates the production build in `dist/`.

## Controls

- Left mouse drag: rotate the isometric camera.
- Mouse wheel: zoom.
- Right mouse drag: pan.
- Click the management icons on the left to open a management panel.
- `B`: open Build.
- `Esc`: cancel building placement / close a modal.
- `1`, `2`, `4`: set simulation speed.
- `Space`: pause / resume.
- Use the arrow button on a management panel to collapse or reopen it.

## Updated in Arcade Build 0.2

- Rebuilt the airport scene with a brighter, more colourful arcade tycoon art direction.
- Switched to an isometric orthographic camera with smoother pan, zoom and rotation.
- Rebuilt the terminal, apron, taxiways and runway markings with clearer scale and ground alignment.
- Replaced the simple tube aircraft with a detailed procedural regional turboprop: tapered fuselage, cockpit glazing, cabin windows, swept wings, tail, nacelles, spinning propellers, landing gear and navigation lights.
- Added an actual flight route: approach, descent, touchdown, landing roll, taxi to gate, turnaround, taxi out and take-off.
- Added visible walking passengers with animated limbs and a moving baggage tug with carts.
- Added a marked service yard for non-airside buildings, plus correctly positioned runway extensions that can only connect to either runway end.
- Added building footprints and rectangular collision checks. The preview turns green for valid plots and red for blocked/overlapping plots.
- Reserved the runway, taxiways, terminal, road and apron so facilities cannot be placed on top of essential airport infrastructure. Gate stands are restricted to the apron; runway extensions are restricted to the two runway ends.
- Reduced interface clutter: compact icon navigation, smaller HUD and a collapsible management panel.
- Updated the local save schema to version 2, with a basic migration path for version 1 saves.

## Still planned for later phases

This is not yet the complete game described in the master prompt. It currently supports one active aircraft at a time, a small visible pedestrian crowd, a looping baggage tug, and footprint-based construction collision checks. The next major additions are multi-aircraft traffic and pathfinding, more advanced passenger routing and terminal interiors, vehicle/aircraft collision avoidance, airline contracts, demolition and refunds, deeper emergency simulation, audio, and expanded progression.

Saves are stored locally in the browser. Clearing browser site data can remove the save.
