import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const material = (color, roughness = 0.76, metalness = 0) => new THREE.MeshStandardMaterial({
  color, roughness, metalness, flatShading: true,
});
const shared = {
  grass: material('#79c957'), grassDark: material('#6fbd4e'), grassLight: material('#8edb69'),
  asphalt: material('#3c4654'), asphaltEdge: material('#596575'), taxi: material('#727f89'),
  concrete: material('#c9d4d8'), white: material('#fffdf5'), yellow: material('#ffdc53'),
  glass: new THREE.MeshStandardMaterial({ color: '#8ee6f4', roughness: .2, metalness: .12 }),
  blue: material('#3c9cde'), blueDark: material('#23669f'), roof: material('#f2f5ed'),
  orange: material('#ff9d42'), green: material('#63bf62'), dark: material('#27384c'),
  red: material('#e85d5d'), purple: material('#8d75d7'), silver: material('#aebdc8'),
  rubber: material('#202b35'),
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function box(parent, w, h, d, mat, x, y, z, cast = true, receive = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}
function cylinder(parent, radiusTop, radiusBottom, height, mat, x, y, z, segments = 16, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), mat);
  mesh.position.set(x, y, z);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function sphere(parent, radius, mat, x, y, z, scale = null) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 10), mat);
  mesh.position.set(x, y, z);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function tube(parent, points, color, radius = .08) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(16, points.length * 8), radius, 7, false), material(color));
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function makeTextLabel(text, color = '#ffffff', scale = [5, 1.25, 1]) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = color;
  ctx.font = '900 64px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(15,40,65,.45)';
  ctx.shadowBlur = 8;
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(...scale);
  return sprite;
}
function makeWing(parent, span, rootChord, tipChord, zCenter, mat) {
  const shape = new THREE.Shape();
  const half = span / 2;
  // Shape Y is reversed because the extrusion is rotated onto the aircraft's X/Z plane.
  shape.moveTo(-half, -(zCenter + tipChord * .42));
  shape.lineTo(-half, -(zCenter - tipChord * .58));
  shape.lineTo(-half * .72, -(zCenter - rootChord * .52));
  shape.lineTo(half * .72, -(zCenter - rootChord * .52));
  shape.lineTo(half, -(zCenter - tipChord * .58));
  shape.lineTo(half, -(zCenter + tipChord * .42));
  shape.lineTo(half * .72, -(zCenter + rootChord * .48));
  shape.lineTo(-half * .72, -(zCenter + rootChord * .48));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: .19, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .055, bevelThickness: .05, curveSegments: 3 });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}


function makeRunwaySurfaceMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#343c45';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let seed = 9137;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 5200; i++) {
    const alpha = .035 + random() * .12;
    ctx.fillStyle = random() > .52 ? `rgba(190,202,211,${alpha})` : `rgba(7,13,20,${alpha})`;
    const size = .5 + random() * 2.2;
    ctx.fillRect(random() * canvas.width, random() * canvas.height, size * 2.6, size);
  }
  for (const x of [255, 770]) {
    for (const y of [72, 111, 153, 192]) {
      ctx.strokeStyle = 'rgba(12,17,23,.32)';
      ctx.lineWidth = 10 + random() * 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 31, y + (random() - .5) * 5);
      ctx.lineTo(x + 27, y + (random() - .5) * 6);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(16,22,29,.30)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 23, y + 4);
      ctx.lineTo(x + 32, y + 2);
      ctx.stroke();
    }
  }
  for (let i = 0; i < 28; i++) {
    const x = random() * canvas.width, y = random() * canvas.height;
    const length = 12 + random() * 54;
    ctx.strokeStyle = `rgba(13,19,25,${.12 + random() * .18})`;
    ctx.lineWidth = .7 + random() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length * .45, y + (random() - .5) * 7);
    ctx.lineTo(x + length, y + (random() - .5) * 12);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: texture, color: '#e0e5e9', roughness: .96, metalness: .01 });
}

export class AirportWorld {
  constructor(container, onWorldClick, onHover) {
    this.container = container;
    this.onWorldClick = onWorldClick;
    this.onHover = onHover;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#9edcf5');
    this.scene.fog = new THREE.Fog('#9edcf5', 230, 850);

    const aspect = Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
    this.camera = new THREE.OrthographicCamera(-48 * aspect, 48 * aspect, 48, -48, .1, 2200);
    this.camera.position.set(83, 105, 105);
    this.camera.zoom = .88;
    this.camera.updateProjectionMatrix();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.domElement.className = 'airport-canvas';
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 36);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .075;
    this.controls.enablePan = true;
    this.controls.panSpeed = .72;
    this.controls.rotateSpeed = .62;
    this.controls.minPolarAngle = .34;
    this.controls.maxPolarAngle = Math.PI * .46;
    this.controls.minZoom = .22;
    this.controls.maxZoom = 2.6;
    this.controls.minDistance = 48;
    this.controls.maxDistance = 900;
    this.controls.screenSpacePanning = false;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.pointerDown = null;
    this.buildings = new Map();
    this.aircraftMesh = null;
    this.aircraftKind = null;
    this.aircraftLightTime = 0;
    this.aircraftMeshes = new Map();
    this.landMeshes = new Map();
    this.terminalRoof = null;
    this.terminalInteriorMode = false;
    this.parkedAircraft = [];
    this.trafficCars = [];
    this.trafficPath = null;
    this.weather = 'Sunny';
    this.currentGameMinutes = 8 * 60;
    this.lastLightingMinute = -1;
    this.seasonIndex = -1;
    this.preview = null;
    this.previewType = null;
    this.previewFootprint = [8, 8];
    this.passengers = [];
    this.tug = null;
    this.elapsed = 0;

    this.createLights();
    this.createTerrain();
    this.createAirfield();
    this.createTerminal();
    this.createEnvironment();
    this.createDistrict();
    this.createRegionalLandscape();
    this.createPedestrians();
    this.createServiceVehicles();
    this.createParkedAircraft();
    this.setTimeOfDay(this.currentGameMinutes);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this._onPointerDown = e => { this.pointerDown = { x: e.clientX, y: e.clientY, button: e.button }; };
    this._onPointerMove = e => this.handlePointerMove(e);
    this._onPointerUp = e => this.handlePointerUp(e);
    this._onContextMenu = e => e.preventDefault();
    this.renderer.domElement.addEventListener('pointerdown', this._onPointerDown);
    this.renderer.domElement.addEventListener('pointermove', this._onPointerMove);
    this.renderer.domElement.addEventListener('pointerup', this._onPointerUp);
    this.renderer.domElement.addEventListener('contextmenu', this._onContextMenu);
    this.resize();
  }

  createLights() {
    this.hemisphereLight = new THREE.HemisphereLight('#f3fbff', '#4c8650', 2.2);
    this.scene.add(this.hemisphereLight);
    this.sunLight = new THREE.DirectionalLight('#fff3d4', 2.55);
    this.sunLight.position.set(-52, 92, 47);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.left = -120; this.sunLight.shadow.camera.right = 120;
    this.sunLight.shadow.camera.top = 120; this.sunLight.shadow.camera.bottom = -120;
    this.sunLight.shadow.camera.near = 1; this.sunLight.shadow.camera.far = 260;
    this.sunLight.shadow.bias = -.00012;
    this.sunLight.shadow.normalBias = .025;
    this.scene.add(this.sunLight);
  }

  createTerrain() {
    // A much wider continuous landscape leaves room for the airport to grow.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 360), shared.grass);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 14);
    ground.receiveShadow = true;
    ground.name = 'ground';
    this.scene.add(ground);

    // Broad grass panels and subtle mowing lines make the airfield read as a
    // real regional site rather than a small floating diorama.
    for (let i = 0; i < 34; i++) {
      const x = -132 + i * 8;
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 188), i % 2 ? shared.grassDark : shared.grassLight);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, .012, 14);
      stripe.receiveShadow = true;
      this.scene.add(stripe);
    }

    // Expanded construction and service campus behind the passenger terminal.
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(184, 78), material('#86ca65'));
    yard.rotation.x = -Math.PI / 2;
    yard.position.set(0, .016, 72);
    yard.receiveShadow = true;
    this.scene.add(yard);
    const yardLine = material('#a5df80');
    for (let x = -90; x <= 90; x += 10) {
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(.12, 76), yardLine);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(x, .045, 72);
      this.scene.add(tile);
    }
    for (let z = 35; z <= 109; z += 8) {
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(182, .12), yardLine);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(0, .045, z);
      this.scene.add(tile);
    }

    // Wide, marked airport service road at the far edge of the build zone.
    const serviceRoad = material('#39444e', .94);
    const roadMark = material('#f5e8b8', .8);
    box(this.scene, 194, .2, 7.8, serviceRoad, 0, .025, 114, false);
    box(this.scene, 194, .12, 1.5, material('#b5beb8'), 0, .09, 119, false);
    for (let x = -90; x <= 90; x += 12) {
      box(this.scene, 4.5, .025, .14, roadMark, x, .14, 114, false);
    }

    // Four-sided airport perimeter fence, with enough space for the enlarged
    // service campus and the future apron-side expansion.
    const fence = material('#dce7e1');
    for (let x = -158; x <= 158; x += 5) {
      cylinder(this.scene, .055, .055, 1.25, fence, x, .625, -55, 6);
      cylinder(this.scene, .055, .055, 1.25, fence, x, .625, 121, 6);
    }
    for (let z = -55; z <= 121; z += 5) {
      cylinder(this.scene, .055, .055, 1.25, fence, -158, .625, z, 6);
      cylinder(this.scene, .055, .055, 1.25, fence, 158, .625, z, 6);
    }
    box(this.scene, 319, .12, .12, fence, 0, .68, -55, false);
    box(this.scene, 319, .12, .12, fence, 0, .68, 121, false);
    box(this.scene, .12, .12, 176, fence, -158, .68, 33, false);
    box(this.scene, .12, .12, 176, fence, 158, .68, 33, false);
  }

  createAirfield() {
    // Main runway: shoulders, asphalt surface, centreline, touchdown zones and edge lights.
    box(this.scene, 94, .30, 16, shared.asphaltEdge, 0, -.015, -16, false);
    box(this.scene, 90, .28, 12.2, shared.asphalt, 0, .16, -16, false);
    const runwayTexture = new THREE.Mesh(new THREE.PlaneGeometry(90, 12.2), makeRunwaySurfaceMaterial());
    runwayTexture.rotation.x = -Math.PI / 2;
    runwayTexture.position.set(0, .306, -16);
    runwayTexture.receiveShadow = true;
    this.scene.add(runwayTexture);
    box(this.scene, 88, .035, .16, shared.white, 0, .315, -16, false);
    for (let x = -36; x <= 36; x += 6) {
      box(this.scene, 2.5, .035, .18, shared.white, x, .32, -16, false);
    }
    for (const x of [-42, 42]) {
      for (let z = -21.4; z <= -10.6; z += 2.15) {
        sphere(this.scene, .16, material('#fff4b5', .28, .15), x, .42, z, [.8, .65, .8]);
      }
    }
    // Threshold bars and runway designator plates.
    for (const x of [-39, 39]) {
      for (let i = -4; i <= 4; i++) box(this.scene, .28, .035, 1.7, shared.white, x, .32, -16 + i * 1.1, false);
    }
    const rwyNumber = makeTextLabel('09', '#fffdf5', [3.4, .9, 1]);
    rwyNumber.position.set(-34.5, .36, -16); rwyNumber.rotation.y = Math.PI / 2; this.scene.add(rwyNumber);
    const rwyNumber2 = makeTextLabel('27', '#fffdf5', [3.4, .9, 1]);
    rwyNumber2.position.set(34.5, .36, -16); rwyNumber2.rotation.y = Math.PI / 2; this.scene.add(rwyNumber2);

    // High-visibility taxiway and a wide apron slab.
    box(this.scene, 72, .18, 6.6, shared.taxi, 0, .01, -3.3, false);
    box(this.scene, 6.8, .18, 18, shared.taxi, 24, .01, -12.6, false);
    box(this.scene, 58, .22, 25, shared.concrete, 0, -.005, 9.3, false);
    box(this.scene, 55, .15, 22, material('#aebcc3'), 0, .12, 9.3, false);

    tube(this.scene, [[-34, .13, -3.3], [0, .13, -3.3], [23, .13, -3.3], [24, .13, -12.8]], '#ffe071', .15);
    tube(this.scene, [[24, .13, -12.8], [24, .13, -18]], '#ffe071', .15);
    tube(this.scene, [[-22, .22, 7.5], [-8, .22, 7.5], [8, .22, 7.5], [22, .22, 7.5]], '#f7e5a2', .10);
    // Apron stand markings, stop bars and guidance lines.
    for (const x of [-16, -4, 8, 20]) this.addStandMarking(x, 8.5, x === 8 ? '01' : String(Math.round((x + 16) / 12 + 1)).padStart(2, '0'));
    for (const x of [-30, -24, -18, -12, -6, 0, 6, 12, 18, 24, 30]) {
      box(this.scene, .12, .04, .16, shared.yellow, x, .235, -3.3, false);
    }

    // Pedestrian walkway from the terminal entrance to the gate stands.
    box(this.scene, 24, .11, 3.2, material('#dce5df'), 2, .19, 13.7, false);
    for (let x = -8; x <= 12; x += 2) box(this.scene, .12, .035, 2.65, shared.white, x, .26, 13.7, false);
    // Service road on the back edge of the airport.
    box(this.scene, 118, .18, 4.8, material('#606e79'), 0, -.06, 49.2, false);
    tube(this.scene, [[-58, .06, 49.2], [58, .06, 49.2]], '#f9e28d', .07);

    // Runway approach lights beyond both ends.
    for (const side of [-1, 1]) {
      for (let i = 1; i <= 6; i++) {
        const x = side * (44 + i * 2.4);
        box(this.scene, .18, .12, .18, material('#f4ffff', .25, .2), x, .1, -16, false);
      }
    }
  }

  createTerminal() {
    const g = new THREE.Group();
    g.position.set(0, 0, 21);
    this.scene.add(g);
    // Interior shell: floor, structural side walls and a glass rear wall.
    // The centre roof is separately grouped for a player-controlled cutaway view.
    box(g, 27.4, .24, 9.8, material('#c9d4d7'), 0, .12, 0, false, true);
    box(g, .34, 5.2, 10.2, material('#e5ece9'), -13.72, 2.6, 0);
    box(g, .34, 5.2, 10.2, material('#e5ece9'), 13.72, 2.6, 0);
    box(g, 27.4, 5.2, .34, material('#e5ece9'), 0, 2.6, 5.0);
    const roof = new THREE.Group();
    this.terminalRoof = roof;
    g.add(roof);
    box(roof, 28.8, .52, 10.8, shared.blue, 0, 5.1, 0);
    box(roof, 25.2, .42, 9.2, material('#e8f1f0'), 0, 5.57, .1);
    box(g, 26.4, 3.55, .2, shared.glass, 0, 2.45, -5.31, false);
    for (let x = -12; x <= 12; x += 3) {
      box(g, .15, 3.75, .25, shared.blueDark, x, 2.4, -5.45, false);
      box(g, 1.9, .11, .22, material('#e8fbff'), x, 4.22, -5.48, false);
    }
    box(g, 4.6, 2.9, .24, shared.blueDark, 0, 1.55, -5.48, false);
    box(g, 4.0, 2.5, .12, shared.glass, 0, 1.7, -5.64, false);
    box(g, 11, .34, 2.6, shared.orange, 0, 3.85, -6.35);
    for (const x of [-4.8, 4.8]) cylinder(g, .12, .12, 3.7, shared.dark, x, 1.95, -6.85, 10);

    // Check-in and bag-drop desks with monitors and overhead information sign.
    const counterTop = material('#edf3f2', .38, .04);
    const counterFront = material('#315f7a', .45, .08);
    for (let i = 0; i < 5; i++) {
      const x = -10 + i * 4.2;
      box(g, 3.0, .9, 1.05, counterFront, x, .58, 2.5);
      box(g, 3.05, .13, 1.13, counterTop, x, 1.09, 2.5);
      box(g, .65, .62, .12, shared.dark, x + .72, 1.46, 2.12);
      box(g, .56, .42, .035, shared.glass, x + .72, 1.47, 2.04, false);
    }
    const checkSign = makeTextLabel('CHECK-IN · BAG DROP', '#ffffff', [8, 1, 1]);
    checkSign.position.set(0, 3.45, 3.0); g.add(checkSign);

    // Security screening: three metal-detector gates and X-ray conveyors.
    for (let i = 0; i < 3; i++) {
      const x = 7.1 + i * 2.2;
      box(g, .14, 2.25, .22, shared.blue, x - .8, 1.12, -.1);
      box(g, .14, 2.25, .22, shared.blue, x + .8, 1.12, -.1);
      box(g, 1.72, .16, .22, shared.blue, x, 2.2, -.1);
      box(g, 1.5, .62, 1.2, counterFront, x, .42, -1.0);
      box(g, 1.65, .12, 1.3, counterTop, x, .79, -1.0);
      box(g, .6, .7, .65, shared.dark, x + .9, .42, -1.0);
    }
    const securitySign = makeTextLabel('SECURITY CONTROL', '#ffffff', [5.4, .8, 1]);
    securitySign.position.set(9.2, 3.0, .3); g.add(securitySign);

    // Baggage reclaim carousel with a moving-belt-style oval profile and luggage.
    const carousel = new THREE.Group(); carousel.position.set(-8.3, .22, -2.45); g.add(carousel);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(2.5, .27, 8, 42), material('#354a54', .72, .12));
    belt.rotation.x = Math.PI / 2; belt.scale.set(1.38, .74, 1); belt.castShadow = true; carousel.add(belt);
    const island = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, .35, 32), material('#b8c5c4'));
    island.position.y = .03; carousel.add(island);
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7;
      box(carousel, .42, .38, .34, material(i % 2 ? '#c47b45' : '#3f6687'), Math.cos(angle) * 2.35, .55, Math.sin(angle) * 1.24);
    }
    const baggageSign = makeTextLabel('BAGGAGE RECLAIM', '#ffffff', [5.5, .8, 1]);
    baggageSign.position.set(-8.3, 2.65, -4.4); g.add(baggageSign);

    // Departure lounge, gate desks and the retail frontage.
    for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
      const x = -1 + i * 2.1, z = -3.8 + row * 1.25;
      box(g, 1.55, .16, .62, shared.blueDark, x, .56, z);
      for (const dx of [-.58, .58]) box(g, .1, .55, .58, shared.silver, x + dx, .28, z);
      box(g, .14, .52, .62, shared.dark, x, .28, z + .35);
    }
    box(g, 4.4, 1.0, 1.2, material('#6c7f83'), -10.3, .65, -.35);
    box(g, 4.5, .12, 1.3, shared.orange, -10.3, 1.22, -.35);
    const retailSign = makeTextLabel('SKY SHOP · CAFE', '#ffffff', [5.8, .8, 1]);
    retailSign.position.set(-10.3, 2.65, .0); g.add(retailSign);
    box(g, .3, 3.25, 10.0, shared.blueDark, 13.45, 1.62, 0);
    const gateSign = makeTextLabel('GATES 01—04', '#ffffff', [4.8, .8, 1]);
    gateSign.position.set(11.4, 3.35, -3.4); g.add(gateSign);

    // Roof skylights and an oversized arcade-style terminal sign.
    for (let x = -9; x <= 9; x += 4.5) {
      box(roof, 2.8, .08, 5.0, shared.glass, x, 5.83, .25, false);
    }
    box(roof, 7.1, .9, .22, shared.dark, 0, 4.55, -5.54, false);
    const sign = makeTextLabel('SKYPORT', '#fffdf5', [6.1, 1.0, 1]);
    sign.position.set(0, 4.55, -5.72); roof.add(sign);

    // Rounded terminal wings and rooftop air-conditioning pods.
    for (const side of [-1, 1]) {
      const wing = new THREE.Group(); wing.position.set(side * 13.4, 0, .2); g.add(wing);
      box(wing, 5.2, 3.4, 7.1, material('#e4ecea'), 0, 1.7, 1.1);
      box(wing, 5.45, .38, 7.3, side < 0 ? shared.orange : shared.green, 0, 3.52, 1.1);
      box(wing, 4.8, 2.25, .13, shared.glass, 0, 1.95, -2.5, false);
      box(wing, 2.8, .45, 2.6, shared.silver, 0, 3.85, 1.1);
    }
    // Front planters and benches.
    for (const x of [-16, 16]) {
      box(g, 2.4, .45, 2.4, material('#c2d8ae'), x, .22, -7.6);
      sphere(g, 1.1, material('#48a85b'), x, .9, -7.6, [1, .8, 1]);
    }
    for (let x = -7; x <= 7; x += 7) {
      box(g, 3.1, .18, .75, shared.orange, x, .5, -8.5);
      box(g, .15, .65, .7, shared.dark, x - 1.2, .25, -8.5);
      box(g, .15, .65, .7, shared.dark, x + 1.2, .25, -8.5);
    }
  }

  setTerminalInteriorMode(enabled) {
    this.terminalInteriorMode = Boolean(enabled);
    if (this.terminalRoof) this.terminalRoof.visible = !this.terminalInteriorMode;
    if (this.terminalInteriorMode) {
      this.controls.target.set(0, 1.7, 21);
      this.camera.position.set(0, 31, 59);
      this.camera.zoom = 1.55;
    } else {
      this.focusAirport();
    }
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  createEnvironment() {
    // Buildable service yard boundary and simple airport perimeter details.
    for (let x = -56; x <= 56; x += 14) {
      box(this.scene, .16, .1, 17, material('#e8f1df'), x, .06, 38.3, false);
    }
    // Hangar silhouettes beyond the fence, plus a tree line kept outside construction areas.
    for (let i = 0; i < 46; i++) {
      const x = -148 + (i * 59 % 296);
      const z = i % 2 ? 130 + (i % 4) * 2 : -76 - (i % 3) * 2;
      this.addTree(x, z, .72 + (i % 3) * .15);
    }
    // Windsock, maintenance shed and airport fire vehicles as environmental props.
    const wind = new THREE.Group(); wind.position.set(-42, 0, -6); this.scene.add(wind);
    cylinder(wind, .09, .12, 3.4, shared.silver, 0, 1.7, 0, 10);
    const sock = new THREE.Mesh(new THREE.ConeGeometry(.28, 2.1, 8), shared.orange);
    sock.rotation.z = Math.PI / 2; sock.position.set(.92, 2.85, 0); wind.add(sock);
    const shed = new THREE.Group(); shed.position.set(-38, 0, 34); this.scene.add(shed);
    box(shed, 7, 3.2, 5, material('#edf1e9'), 0, 1.6, 0);
    box(shed, 7.3, .45, 5.3, shared.red, 0, 3.25, 0);
    box(shed, 3.2, 2.0, .16, shared.dark, 0, 1.05, -2.58);
    const sign = makeTextLabel('MAINTENANCE', '#fff', [5.2, .8, 1]); sign.position.set(0, 2.6, -2.7); shed.add(sign);
  }


  createDistrict() {
    const road = material('#39434c', .94);
    const sidewalk = material('#aab5ad', .95);
    const lane = material('#f4e8bb', .8);

    // Outer ring road and connected local streets now surround the full site.
    box(this.scene, 302, .18, 8.2, road, 0, .02, -95, false);
    box(this.scene, 302, .18, 8.2, road, 0, .02, 146, false);
    box(this.scene, 8.2, .18, 241, road, -151, .02, 25.5, false);
    box(this.scene, 8.2, .18, 241, road, 151, .02, 25.5, false);
    box(this.scene, 302, .12, 2.0, sidewalk, 0, .08, -101, false);
    box(this.scene, 302, .12, 2.0, sidewalk, 0, .08, 152, false);
    box(this.scene, 2.0, .12, 241, sidewalk, -158, .08, 25.5, false);
    box(this.scene, 2.0, .12, 241, sidewalk, 158, .08, 25.5, false);

    for (let x = -140; x <= 140; x += 12) {
      box(this.scene, 4.2, .025, .12, lane, x, .125, -95, false);
      box(this.scene, 4.2, .025, .12, lane, x, .125, 146, false);
    }
    for (let z = -83; z <= 134; z += 12) {
      box(this.scene, .12, .025, 4.2, lane, -151, .125, z, false);
      box(this.scene, .12, .025, 4.2, lane, 151, .125, z, false);
    }

    // Two rows of homes and neighbourhood shops beyond the airport fence.
    for (let i = 0; i < 8; i++) {
      const x = -130 + i * 37.1;
      if (i === 1 || i === 6) this.addDistrictShop(x, -121, i);
      else this.addDistrictHouse(x, -121, i);
      this.addDistrictHouse(x, 171, i + 8);
    }
    for (const x of [-132, -88, -44, 44, 88, 132]) {
      this.addTree(x, -109, .82);
      this.addTree(x, 158, .86);
    }

    this.trafficPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-148, .12, -95), new THREE.Vector3(-74, .12, -95),
      new THREE.Vector3(0, .12, -95), new THREE.Vector3(74, .12, -95),
      new THREE.Vector3(148, .12, -95), new THREE.Vector3(151, .12, -62),
      new THREE.Vector3(151, .12, 28), new THREE.Vector3(151, .12, 111),
      new THREE.Vector3(148, .12, 146), new THREE.Vector3(74, .12, 146),
      new THREE.Vector3(0, .12, 146), new THREE.Vector3(-74, .12, 146),
      new THREE.Vector3(-148, .12, 146), new THREE.Vector3(-151, .12, 111),
      new THREE.Vector3(-151, .12, 28), new THREE.Vector3(-151, .12, -62)
    ], true, 'centripetal');

    const carPaints = ['#e85d5d', '#e8edf0', '#307fbd', '#e4a04e', '#41586d', '#5b9b70', '#c9cbd0'];
    for (let i = 0; i < 14; i++) {
      const car = new THREE.Group();
      const paint = material(carPaints[i % carPaints.length], .48, .05);
      box(car, 1.35, .62, 2.8, paint, 0, .53, 0);
      box(car, 1.12, .50, 1.42, shared.glass, 0, .99, -.08, false);
      box(car, 1.18, .12, .52, paint, 0, 1.18, .74);
      box(car, .22, .12, .16, shared.white, -.43, .63, 1.42, false);
      box(car, .22, .12, .16, shared.white, .43, .63, 1.42, false);
      box(car, .18, .12, .16, shared.red, -.43, .63, -1.42, false);
      box(car, .18, .12, .16, shared.red, .43, .63, -1.42, false);
      for (const wx of [-.64, .64]) for (const wz of [-.91, .91]) {
        cylinder(car, .25, .25, .14, shared.rubber, wx, .28, wz, 12, [0, 0, Math.PI / 2]);
        cylinder(car, .11, .11, .15, shared.silver, wx, .28, wz, 10, [0, 0, Math.PI / 2]);
      }
      this.scene.add(car);
      this.trafficCars.push({ mesh: car, progress: i / 14, speed: .011 + (i % 4) * .0011 });
    }
  }


  createRegionalLandscape() {
    // Retention pond and small green belt at the edge of the airfield.
    const waterMaterial = new THREE.MeshStandardMaterial({ color: '#72adbd', roughness: .3, metalness: .08 });
    const pond = new THREE.Mesh(new THREE.CircleGeometry(14, 40), waterMaterial);
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(-119, .035, 34);
    pond.scale.set(1.45, .82, 1);
    pond.receiveShadow = true;
    this.scene.add(pond);
    const bank = new THREE.Mesh(new THREE.TorusGeometry(17, .8, 7, 48), material('#8aab68'));
    bank.rotation.x = Math.PI / 2;
    bank.position.set(-119, .04, 34);
    bank.scale.set(1.2, .78, 1);
    this.scene.add(bank);

    // Logistics and maintenance estate: several large halls, loading bays,
    // roof equipment and marked truck courts.
    for (let i = 0; i < 4; i++) {
      const x = 112 + (i % 2) * 22;
      const z = -30 + Math.floor(i / 2) * 39;
      const hall = new THREE.Group();
      hall.position.set(x, 0, z);
      this.scene.add(hall);
      const wall = material(i % 2 ? '#c9d3d6' : '#d9e0df');
      const roof = material(i % 2 ? '#647481' : '#788993');
      box(hall, 18, .25, 15, material('#89959a'), 0, .13, 0, false);
      box(hall, 15.5, 7.2, 12.5, wall, 0, 3.75, 0);
      box(hall, 16, .65, 13, roof, 0, 7.55, 0);
      for (let door = -1; door <= 1; door++) {
        box(hall, 3.3, 3.5, .18, material('#344b5b'), door * 4.5, 1.9, -6.34, false);
        box(hall, 2.8, .12, .2, shared.orange, door * 4.5, 3.75, -6.42, false);
      }
      for (const ventX of [-5, 0, 5]) {
        box(hall, 1.1, .55, 1.0, material('#53636d'), ventX, 8.0, 1.5, false);
      }
      const label = makeTextLabel(i % 2 ? 'CARGO LOGISTICS' : 'AIRPORT SERVICES', '#ffffff', [8.5, 1.2, 1]);
      label.position.set(0, 5.4, -6.48);
      hall.add(label);

      for (let t = -1; t <= 1; t++) {
        const truck = new THREE.Group();
        truck.position.set(-5.2 + t * 5.2, .15, 10.2);
        hall.add(truck);
        box(truck, 2.0, .95, 3.4, material('#e6e9e7'), 0, .75, 0);
        box(truck, 1.85, .9, 1.15, shared.blue, 0, 1.4, .75);
        for (const wx of [-.82, .82]) for (const wz of [-1.05, 1.05]) {
          cylinder(truck, .3, .3, .18, shared.rubber, wx, .32, wz, 12, [0, 0, Math.PI / 2]);
        }
      }
    }

    // Apron-side floodlights and road lighting improve night-time scale.
    for (let x = -84; x <= 84; x += 24) {
      const pole = new THREE.Group();
      pole.position.set(x, 0, 109);
      this.scene.add(pole);
      cylinder(pole, .12, .17, 7.2, shared.silver, 0, 3.6, 0, 10);
      box(pole, 2.4, .22, .55, material('#dce7e7', .4, .2), 0, 7.15, 0, false);
      sphere(pole, .2, new THREE.MeshStandardMaterial({ color: '#fff1b5', emissive: '#ffe7a0', emissiveIntensity: .4 }), 0, 7.0, 0);
    }

    // Tree belts and two distant wind turbines establish a much wider horizon.
    for (let i = 0; i < 34; i++) {
      const x = -146 + (i * 31 % 292);
      const z = i % 2 ? -145 + (i % 5) * 3 : 184 - (i % 4) * 3;
      this.addTree(x, z, .72 + (i % 4) * .1);
    }
    for (const x of [-92, 82]) {
      const turbine = new THREE.Group();
      turbine.position.set(x, 0, -139);
      this.scene.add(turbine);
      cylinder(turbine, .28, .42, 20, material('#e6ece8'), 0, 10, 0, 10);
      sphere(turbine, .75, material('#f5f6f1'), 0, 20, 0);
      for (let blade = 0; blade < 3; blade++) {
        const arm = box(turbine, .55, 8.2, .22, material('#f3f5f0'), 0, 24.1, 0, false);
        arm.rotation.z = blade * Math.PI * 2 / 3;
      }
    }
  }

  addDistrictShop(x, z, variant = 0) {
    const shop = new THREE.Group();
    shop.position.set(x, 0, z);
    this.scene.add(shop);
    const wall = material(variant % 2 ? '#d9e1df' : '#e8dfce');
    const trim = material(variant % 2 ? '#2f7895' : '#b66c44');
    box(shop, 14, .28, 10, material('#aab5ad', .95), 0, .14, 0, false);
    box(shop, 11.5, 4.4, 8.2, wall, 0, 2.35, 0);
    box(shop, 12, .45, 8.7, trim, 0, 4.72, 0);
    box(shop, 10.8, .16, .22, shared.white, 0, 3.75, -4.18, false);
    box(shop, 8.8, 2.15, .16, shared.glass, 0, 1.95, -4.18, false);
    box(shop, .18, 2.4, .22, trim, -4.55, 1.9, -4.2, false);
    box(shop, .18, 2.4, .22, trim, 4.55, 1.9, -4.2, false);
    box(shop, 1.2, 2.2, .18, material('#76513c'), 0, 1.55, -4.24);
    box(shop, 2.8, .18, 1.5, material('#b2a38b'), -5.9, .09, .8, false);
    const sign = makeTextLabel(variant % 2 ? 'MARKET' : 'LOCAL SHOP', '#ffffff', [5.2, .9, 1]);
    sign.position.set(0, 3.95, -4.36);
    shop.add(sign);
    for (const side of [-1, 1]) {
      this.addTree(x + side * 8.2, z + 1.6, .66);
    }
  }

  addDistrictHouse(x, z, variant = 0) {
    const house = new THREE.Group();
    house.position.set(x, 0, z);
    this.scene.add(house);
    const walls = ['#e7d9c4', '#d5e1df', '#e7c6b4', '#d7d1bd', '#c8d8e5', '#e8e4d6'];
    const roofs = ['#536475', '#8d5a4f', '#66765e', '#6c6260'];
    const wall = material(walls[variant % walls.length]);
    const roofMat = material(roofs[variant % roofs.length]);
    const lot = material('#aab5ad', .95);
    box(house, 12, .28, 10, lot, 0, .14, 0, false);
    box(house, 8.7, 3.25, 7.4, wall, 0, 1.78, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.5, 2.8, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, 4.65, 0);
    roof.castShadow = true;
    house.add(roof);
    box(house, 1.18, 2.0, .16, material('#76513c'), 0, 1.12, -3.79);
    for (const wx of [-2.6, 2.6]) {
      box(house, 1.65, 1.25, .14, shared.glass, wx, 2.25, -3.82, false);
      box(house, 1.75, .12, .18, shared.white, wx, 2.25, -3.9, false);
    }
    box(house, 2.6, .16, 1.25, shared.white, 0, 3.03, -4.15);
    box(house, .62, 1.3, .62, material('#b9b0a1'), 2.6, 5.05, .8);
    box(house, 3.2, .16, 2.8, material('#b2a38b'), -5.3, .09, 0, false);
    this.addTree(x - 7.5, z + 1.4, .64 + (variant % 2) * .08);
    this.addTree(x + 7.2, z + 1.8, .62);
  }

  createParkedAircraft() {
    const parked = [
      { kind: 'jet', x: -16, z: 8.5, yaw: 0 },
      { kind: 'cargo', x: 20, z: 8.5, yaw: 0 }
    ];
    for (const item of parked) {
      const aircraft = makeAircraft(item.kind);
      aircraft.position.set(item.x, 1.28, item.z);
      aircraft.rotation.y = item.yaw;
      aircraft.userData.engineRunning = false;
      aircraft.userData.parkedLightOffset = this.parkedAircraft.length * 1.65;
      this.scene.add(aircraft);
      this.parkedAircraft.push(aircraft);
    }
  }

  addTree(x, z, scale = 1) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    this.scene.add(tree);
    cylinder(tree, .19, .26, 1.3, material('#906346'), 0, .65, 0, 7);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 1), material('#388d48'));
    crown.position.y = 1.65; crown.scale.set(1.05, 1.22, .95); crown.castShadow = true; tree.add(crown);
    sphere(tree, .58, material('#58b75b'), -.48, 1.35, .05, [1.05, 1.1, 1]);
    sphere(tree, .58, material('#4ba650'), .45, 1.5, -.12, [1.0, 1.15, 1]);
  }

  addStandMarking(x, z, number = '01', parent = null) {
    const g = new THREE.Group(); g.position.set(x, .245, z); (parent || this.scene).add(g);
    const marking = material('#fff5c5');
    box(g, .12, .025, 7.2, marking, -5.0, 0, 0, false);
    box(g, .12, .025, 7.2, marking, 5.0, 0, 0, false);
    box(g, 10.1, .025, .12, marking, 0, 0, -3.55, false);
    box(g, 10.1, .025, .12, marking, 0, 0, 3.55, false);
    const noseLine = box(g, .14, .027, 3.4, shared.yellow, 0, .008, -1.2, false);
    noseLine.rotation.y = .0;
    const label = makeTextLabel(number, '#fff5cb', [1.5, .5, 1]); label.position.set(0, .03, 4.1); g.add(label);
  }

  createBuilding(type, x, z, id, existing = false) {
    const root = new THREE.Group();
    root.position.set(x, 0, z);
    root.userData = { id, type, collision: true };
    this.scene.add(root);

    if (type === 'gate') {
      const gateNumber = 1 + [...this.buildings.values()].filter(entry => entry.userData?.type === 'gate').length;
      this.addStandMarking(x, z, `G${String(gateNumber).padStart(2, '0')}`, root);
      // Glass passenger bridge, telescopic section, support legs and docking head.
      box(root, 2.1, 1.25, 5.2, shared.blue, 0, 2.0, 4.4);
      box(root, 1.55, .95, 3.4, shared.glass, 0, 2.15, 4.25);
      box(root, 2.0, .2, 5.5, shared.white, 0, 2.75, 4.35);
      box(root, 2.5, 1.55, 1.7, shared.blueDark, 0, 2.0, 7.1);
      for (const x0 of [-.68, .68]) cylinder(root, .1, .12, 1.55, shared.dark, x0, .78, 3.2, 8);
      box(root, 2.8, .22, .24, shared.yellow, 0, 2.9, 7.0);
      const sign = makeTextLabel(`GATE ${String(gateNumber).padStart(2, '0')}`, '#ffffff', [3.6, .75, 1]);
      sign.position.set(0, 3.65, 5.0); root.add(sign);
      // Ground power unit and baggage cart parked beside the stand.
      box(root, 1.05, .65, 1.2, shared.orange, -6.0, .38, 1.2);
      cylinder(root, .22, .22, .14, shared.rubber, -6.0, .18, .75, 12, [0, 0, Math.PI / 2]);
      cylinder(root, .22, .22, .14, shared.rubber, -6.0, .18, 1.65, 12, [0, 0, Math.PI / 2]);
    } else if (type === 'cafe' || type === 'shop') {
      const base = type === 'cafe' ? material('#fff0d7') : material('#e7f4ff');
      const accent = type === 'cafe' ? shared.orange : shared.blue;
      box(root, 7.5, 3.6, 6.4, base, 0, 1.8, 0);
      box(root, 7.9, .42, 6.8, accent, 0, 3.7, 0);
      box(root, 5.0, 1.8, .14, shared.glass, 0, 2.0, -3.25, false);
      box(root, 1.7, 1.7, .18, shared.dark, 0, .85, -3.34);
      box(root, 2.5, .28, .24, shared.white, 0, 3.15, -3.48, false);
      const label = makeTextLabel(type === 'cafe' ? 'CAFE & CO' : 'SKY SHOP', '#fff', [4.2, .8, 1]);
      label.position.set(0, 3.12, -3.5); root.add(label);
      for (const px of [-2.3, 2.3]) {
        cylinder(root, .12, .12, 1.0, shared.dark, px, .5, 4.0, 8);
        const umbrella = new THREE.Mesh(new THREE.ConeGeometry(.95, .34, 12), type === 'cafe' ? shared.orange : shared.blue);
        umbrella.position.set(px, 1.08, 4.0); umbrella.rotation.x = Math.PI; umbrella.castShadow = true; root.add(umbrella);
        cylinder(root, .42, .42, .12, shared.orange, px, .12, 4.0, 12);
      }
    } else if (type === 'parking') {
      box(root, 13, .34, 9.5, material('#7f8b94'), 0, .16, 0);
      box(root, 13.3, 1.55, .3, shared.blueDark, 0, .8, -4.8);
      for (let i = 0; i < 7; i++) box(root, .11, .035, 3.8, shared.white, -5.2 + i * 1.72, .35, .2, false);
      const carColors = [shared.red, shared.blue, shared.orange, shared.white];
      for (let i = 0; i < 4; i++) {
        const car = new THREE.Group(); car.position.set(-4.5 + i * 3, .26, 1.7); root.add(car);
        box(car, 1.45, .62, 2.65, carColors[i], 0, .4, 0);
        box(car, 1.1, .48, 1.25, shared.glass, 0, .88, -.18);
        for (const wx of [-.65, .65]) for (const wz of [-.82, .82]) cylinder(car, .22, .22, .13, shared.rubber, wx, .22, wz, 10, [0, 0, Math.PI / 2]);
      }
      const sign = makeTextLabel('PARKING', '#fff', [4.2, .8, 1]); sign.position.set(0, 2.1, -5.0); root.add(sign);
    } else if (type === 'tower') {
      box(root, 2.8, 7.7, 2.8, material('#e9f0ec'), 0, 3.85, 0);
      box(root, 4.7, 1.5, 4.7, shared.blueDark, 0, 8.3, 0);
      box(root, 4.35, 1.0, 4.35, shared.glass, 0, 8.35, 0);
      box(root, 5.1, .36, 5.1, shared.orange, 0, 9.12, 0);
      box(root, 1.45, .7, 1.45, shared.dark, 0, 9.55, 0);
      cylinder(root, .09, .09, 1.7, shared.silver, 0, 10.8, 0, 10);
      sphere(root, .24, shared.red, 0, 11.75, 0);
    } else if (type === 'fire') {
      box(root, 11, 4.1, 8.2, material('#fff0e8'), 0, 2.05, 0);
      box(root, 11.35, .48, 8.5, shared.red, 0, 4.23, 0);
      for (const x0 of [-3.3, 0, 3.3]) {
        box(root, 2.5, 2.4, .18, shared.dark, x0, 1.45, -4.18);
        box(root, 2.0, 1.5, .13, shared.red, x0, 1.3, -4.32);
      }
      const label = makeTextLabel('FIRE & RESCUE', '#fff', [5.5, .8, 1]); label.position.set(0, 3.6, -4.4); root.add(label);
      // Small fire engine parked by the garage.
      const truck = new THREE.Group(); truck.position.set(3.2, .26, 3.0); root.add(truck);
      box(truck, 2.0, .9, 3.4, shared.red, 0, .55, 0);
      box(truck, 1.8, .9, 1.2, shared.glass, 0, 1.3, .9);
      box(truck, 1.8, .18, .25, shared.white, 0, 1.85, -.2);
      for (const wx of [-.9, .9]) for (const wz of [-1.05, 1.05]) cylinder(truck, .32, .32, .2, shared.rubber, wx, .32, wz, 12, [0, 0, Math.PI / 2]);
    } else if (type === 'hangar') {
      box(root, 14, 5.8, 11, material('#e2edf0'), 0, 2.9, 0);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(9, 2.6, 4), shared.blue);
      roof.rotation.y = Math.PI / 4; roof.scale.set(1, .68, .88); roof.position.set(0, 6.1, 0); roof.castShadow = true; root.add(roof);
      box(root, 8.4, 4.2, .18, shared.dark, 0, 2.1, -5.58);
      box(root, 8.0, 3.8, .12, material('#a1bac8'), 0, 2.0, -5.7);
      for (const x0 of [-4.2, 4.2]) box(root, .2, 4.5, .22, shared.orange, x0, 2.25, -5.75);
    } else if (type === 'terminal') {
      box(root, 16, 4.9, 9.5, material('#f0f5ef'), 0, 2.45, 0);
      box(root, 16.3, .5, 9.8, shared.green, 0, 5.0, 0);
      for (let x = -6; x <= 6; x += 3) box(root, 1.8, 2.9, .14, shared.glass, x, 2.3, -4.82, false);
      box(root, 5.2, .3, 1.6, shared.orange, 0, 3.75, -5.1);
    } else if (type === 'runway') {
      // The 48 m segment overlaps the original runway shoulder slightly so
      // the new concrete/asphalt joins visually without a gap. Its outer end
      // receives the threshold bars; the inner end stays clear for continuity.
      box(root, 48, .30, 14, shared.asphaltEdge, 0, -.015, 0, false);
      box(root, 45, .28, 11, shared.asphalt, 0, .16, 0, false);
      for (let x = -19; x <= 19; x += 5) box(root, 2.1, .035, .18, shared.white, x, .32, 0, false);
      const endDirection = root.position.x < 0 ? -1 : 1;
      const outerEnd = endDirection * 22.6;
      for (let z = -3.8; z <= 3.8; z += 1.9) {
        box(root, .25, .035, 1.2, shared.white, outerEnd, .32, z, false);
        sphere(root, .13, shared.white, outerEnd - endDirection * .8, .39, z, [.8, .65, .8]);
      }
    } else if (type === 'cargo-terminal') {
      box(root, 16, 5.2, 10.5, material('#dce5e4'), 0, 2.6, 0);
      box(root, 16.4, .52, 10.8, shared.orange, 0, 5.25, 0);
      box(root, 8.8, 3.4, .18, shared.dark, 0, 1.85, -5.34);
      box(root, 8.1, 2.8, .12, material('#93a9b3'), 0, 1.8, -5.46);
      for (const x0 of [-5.2, 5.2]) {
        box(root, 3.2, .7, 1.5, shared.yellow, x0, .36, 4.5);
        box(root, 2.2, .55, 2.2, shared.orange, x0, .28, 2.5);
      }
      const cargoSign = makeTextLabel('CARGO & LOGISTICS', '#fff', [8.5, .9, 1]);
      cargoSign.position.set(0, 4.25, -5.52); root.add(cargoSign);
      for (let x0 = -5; x0 <= 5; x0 += 5) {
        box(root, 1.45, .55, 1.25, shared.orange, x0, .32, 2.7);
        box(root, 1.5, .08, 1.28, shared.yellow, x0, .64, 2.7);
      }
    } else if (type === 'hotel') {
      box(root, 13, 7.3, 10.5, material('#e9eee9'), 0, 3.65, 0);
      box(root, 13.4, .48, 10.8, shared.blueDark, 0, 7.45, 0);
      for (let floor = 0; floor < 3; floor++) {
        for (let x0 = -5; x0 <= 5; x0 += 2.5) {
          box(root, 1.45, 1.35, .14, shared.glass, x0, 1.65 + floor * 2.1, -5.32, false);
          box(root, 1.52, .09, .18, shared.white, x0, 1.65 + floor * 2.1, -5.43, false);
        }
      }
      box(root, 4.3, 1.2, .2, shared.orange, 0, 6.1, -5.42, false);
      const hotelSign = makeTextLabel('SKYPORT HOTEL', '#fff', [5.8, .85, 1]);
      hotelSign.position.set(0, 6.2, -5.57); root.add(hotelSign);
      box(root, 3.6, .2, 2.1, material('#aeb6a8'), 0, .11, 6.0, false);
    } else if (type === 'maintenance') {
      box(root, 13.2, 5.3, 10.5, material('#e1e9e8'), 0, 2.65, 0);
      box(root, 13.5, .48, 10.8, shared.green, 0, 5.35, 0);
      box(root, 8.8, 4.0, .18, shared.dark, 0, 2.05, -5.35);
      box(root, 8.1, 3.5, .12, material('#9fb2bd'), 0, 1.95, -5.48);
      for (const x0 of [-5.1, 5.1]) {
        box(root, .22, 4.1, .28, shared.orange, x0, 2.05, -5.5);
      }
      const depotSign = makeTextLabel('ENGINEERING', '#fff', [5.4, .8, 1]);
      depotSign.position.set(0, 4.0, -5.56); root.add(depotSign);
      box(root, 2.4, .7, 2.0, shared.yellow, 0, .38, 3.2);
    } else if (type === 'fuel') {
      cylinder(root, 2.5, 2.5, 4.8, shared.white, 0, 2.4, 0, 24);
      cylinder(root, 2.58, 2.58, .42, shared.blue, 0, 4.82, 0, 24);
      cylinder(root, .3, .3, .6, shared.dark, 0, 5.25, 0, 12);
      const label = makeTextLabel('JET A-1', '#fff', [3.6, .75, 1]); label.position.set(0, 2.55, -2.55); root.add(label);
      box(root, 2.5, .35, 2.5, shared.orange, 0, .18, 3.5);
    }

    this.buildings.set(id, root);
    return root;
  }

  removeBuilding(id) {
    const root = this.buildings.get(id);
    if (!root) return false;
    this.scene.remove(root);
    root.traverse(object => {
      if (object.geometry) object.geometry.dispose();
    });
    this.buildings.delete(id);
    return true;
  }

  addLandParcel(parcel) {
    if (!parcel?.id || this.landMeshes.has(parcel.id)) return this.landMeshes.get(parcel?.id) || null;
    const root = new THREE.Group();
    root.position.set(parcel.x, 0, parcel.z);
    root.userData = { id: parcel.id, type: 'land-parcel' };
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(parcel.w, parcel.d), material('#86ca65'));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = .018;
    ground.receiveShadow = true;
    root.add(ground);
    const grid = material('#a5df80');
    for (let x = -parcel.w / 2 + 5; x < parcel.w / 2; x += 10) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(.12, parcel.d - .8), grid);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, .045, 0);
      root.add(line);
    }
    for (let z = -parcel.d / 2 + 5; z < parcel.d / 2; z += 10) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(parcel.w - .8, .12), grid);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, .045, z);
      root.add(line);
    }
    const edge = material('#dce7e1');
    box(root, parcel.w, .08, .14, edge, 0, .16, -parcel.d / 2);
    box(root, parcel.w, .08, .14, edge, 0, .16, parcel.d / 2);
    box(root, .14, .08, parcel.d, edge, -parcel.w / 2, .16, 0);
    box(root, .14, .08, parcel.d, edge, parcel.w / 2, .16, 0);
    const label = makeTextLabel('AIRPORT EXPANSION · ' + parcel.side.toUpperCase(), '#ffffff', [Math.min(22, parcel.w * .22), 1, 1]);
    label.position.set(0, .2, -parcel.d / 2 + 2.5);
    root.add(label);
    this.scene.add(root);
    this.landMeshes.set(parcel.id, root);
    return root;
  }

  focusOn(x, z) {
    const dx = x - this.controls.target.x;
    const dz = z - this.controls.target.z;
    this.controls.target.x = x;
    this.controls.target.z = z;
    this.camera.position.x += dx;
    this.camera.position.z += dz;
    this.controls.update();
  }

  addBuilding(building) {
    return this.createBuilding(building.type, building.x, building.z, building.id);
  }

  addInitialGate() {
    this.createBuilding('gate', 8, 8.5, 'initial-gate', true);
  }

  setPlacement(type, footprint = [8, 8]) {
    this.clearPlacement();
    this.previewType = type;
    this.previewFootprint = footprint;
    const ghost = new THREE.Group();
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(footprint[0], footprint[1]),
      new THREE.MeshBasicMaterial({ color: '#57e69a', transparent: true, opacity: .32, depthWrite: false, side: THREE.DoubleSide })
    );
    plane.rotation.x = -Math.PI / 2; plane.position.y = .035; ghost.add(plane);
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(footprint[0], .08, footprint[1])),
      new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: .95 })
    );
    outline.position.y = .1; ghost.add(outline);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .35, 12), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    post.position.y = .2; ghost.add(post);
    this.scene.add(ghost); this.preview = ghost;
    this.preview.userData.plane = plane;
    this.preview.userData.outline = outline;
  }
  clearPlacement() {
    if (this.preview) {
      this.preview.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material.dispose(); } });
      this.scene.remove(this.preview);
    }
    this.preview = null; this.previewType = null;
  }
  updatePreview(valid) {
    if (!this.preview) return;
    this.preview.userData.plane.material.color.set(valid ? '#58ee9e' : '#ff5e62');
    this.preview.userData.outline.material.color.set(valid ? '#f7fff9' : '#ffdddd');
  }

  handlePointerMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlane, hit)) {
      const snappedX = Math.round(hit.x / 2) * 2;
      const snappedZ = Math.round(hit.z / 2) * 2;
      if (this.preview) this.preview.position.set(snappedX, 0, snappedZ);
      this.onHover?.({ x: snappedX, z: snappedZ });
    }
  }
  handlePointerUp(event) {
    if (!this.preview || event.button !== 0) return;
    const down = this.pointerDown; this.pointerDown = null;
    if (down && (down.button !== 0 || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 7)) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const p = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(p, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) return;
    this.onWorldClick?.({ x: Math.round(hit.x / 2) * 2, z: Math.round(hit.z / 2) * 2, originalEvent: event });
  }

  syncFlight(flight) {
    this.syncFlights(flight ? [flight] : []);
  }

  syncFlights(flights = []) {
    const list = Array.isArray(flights) ? flights.filter(Boolean) : (flights ? [flights] : []);
    const visibleIds = new Set();
    list.forEach((flight, index) => {
      const id = String(flight.id || 'traffic-' + index);
      visibleIds.add(id);
      const kind = flight.kind || 'regional';
      let entry = this.aircraftMeshes.get(id);
      if (!entry || entry.kind !== kind) {
        if (entry) this.scene.remove(entry.mesh);
        entry = { id, kind, mesh: makeAircraft(kind), lightTime: 0 };
        this.aircraftMeshes.set(id, entry);
        this.scene.add(entry.mesh);
      }
      const p = flight.position || { x: -58, y: 8, z: -16 };
      const wheelClearance = kind === 'cargo' ? .196 : kind === 'jet' ? .169 : .088;
      entry.mesh.position.set(p.x, p.y + wheelClearance, p.z);
      entry.mesh.rotation.y = Number.isFinite(flight.yaw) ? flight.yaw : Math.PI / 2;
      const airborne = ['approach', 'holding', 'takeoff'].includes(flight.phase) && p.y > 2.2;
      entry.mesh.userData.wheels.forEach(wheel => { wheel.visible = !airborne; });
      entry.mesh.userData.gear.forEach(gear => { gear.visible = !airborne; });
      entry.mesh.userData.engineRunning = flight.phase !== 'parked';
      entry.mesh.userData.phase = flight.phase;
    });
    for (const [id, entry] of this.aircraftMeshes) {
      if (visibleIds.has(id)) continue;
      this.scene.remove(entry.mesh);
      this.aircraftMeshes.delete(id);
    }
    const first = this.aircraftMeshes.values().next().value;
    this.aircraftMesh = first?.mesh || null;
    this.aircraftKind = first?.kind || null;
  }

  setWeather(weather) {
    this.weather = weather;
    this.lastLightingMinute = -1;
    this.setTimeOfDay(this.currentGameMinutes);
  }

  setTimeOfDay(gameMinutes = 8 * 60) {
    this.currentGameMinutes = gameMinutes;
    const minuteKey = Math.floor(gameMinutes);
    if (minuteKey === this.lastLightingMinute) return;
    this.lastLightingMinute = minuteKey;
    const minuteOfDay = ((gameMinutes % 1440) + 1440) % 1440;
    const hour = minuteOfDay / 60;
    const daylight = clamp(Math.sin(((hour - 6) / 13) * Math.PI), 0, 1);
    const dayColors = {
      Sunny: '#9edcf5', Cloudy: '#aebfcb', Rain: '#8297aa',
      Fog: '#aebdc0', Snow: '#dceaf1', Thunderstorm: '#687b91'
    };
    const sky = new THREE.Color('#122238').lerp(
      new THREE.Color(dayColors[this.weather] || dayColors.Sunny),
      .24 + daylight * .76
    );
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
    this.scene.fog.near = this.weather === 'Fog' ? 32 : 120 + daylight * 30;
    this.scene.fog.far = this.weather === 'Fog' ? 130 : 265 + daylight * 65;
    if (this.sunLight) {
      this.sunLight.intensity = .18 + daylight * 2.42;
      this.sunLight.color.set(daylight < .12 ? '#9eb8e8' : '#fff0d2');
      this.sunLight.position.set(-52 + Math.cos(hour / 24 * Math.PI * 2) * 22, 18 + daylight * 78, 47);
    }
    if (this.hemisphereLight) this.hemisphereLight.intensity = .42 + daylight * 1.78;
    const seasonIndex = Math.floor(gameMinutes / (1440 * 3)) % 4;
    if (seasonIndex !== this.seasonIndex) {
      this.seasonIndex = seasonIndex;
      const seasons = [
        ['#8acb70', '#71b65a', '#a2df7d'],
        ['#79c957', '#6fbd4e', '#8edb69'],
        ['#b59a5e', '#95824e', '#c7b477'],
        ['#aeb9b7', '#8f9d9b', '#c9d1cc']
      ];
      shared.grass.color.set(seasons[seasonIndex][0]);
      shared.grassDark.color.set(seasons[seasonIndex][1]);
      shared.grassLight.color.set(seasons[seasonIndex][2]);
    }
  }

  createPedestrians() {
    this.pedestrianPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-5.4, 0, 13.3), new THREE.Vector3(-2.0, 0, 13.1),
      new THREE.Vector3(1.0, 0, 12.1), new THREE.Vector3(4.8, 0, 10.8),
      new THREE.Vector3(8.0, 0, 9.2), new THREE.Vector3(9.2, 0, 7.6),
    ]);
    const clothes = ['#e85d5d', '#3c86d4', '#f0a43b', '#7b68c9', '#37a984', '#e8edf2', '#dc78a8'];
    for (let i = 0; i < 18; i++) {
      const person = makePassenger(clothes[i % clothes.length], i);
      person.userData.t = i / 18;
      person.userData.speed = .012 + (i % 4) * .0018;
      person.userData.phase = i * .9;
      this.scene.add(person);
      const start = this.pedestrianPath.getPointAt(person.userData.t);
      person.position.set(start.x, 0, start.z);
      this.passengers.push(person);
    }
  }

  createServiceVehicles() {
    const tug = new THREE.Group();
    this.scene.add(tug);
    box(tug, 1.35, .65, 1.7, shared.orange, 0, .78, 0);
    box(tug, 1.15, .95, .85, shared.glass, 0, 1.45, .25);
    box(tug, 1.4, .16, 1.9, shared.yellow, 0, 1.1, -.08);
    for (const x of [-.65, .65]) for (const z of [-.55, .55]) cylinder(tug, .28, .28, .15, shared.rubber, x, .32, z, 12, [0, 0, Math.PI / 2]);
    for (let i = 0; i < 2; i++) {
      const cart = new THREE.Group(); cart.position.set(0, 0, -1.75 - i * 1.5); tug.add(cart);
      box(cart, 1.45, .5, 1.15, material('#dce5e8'), 0, .55, 0);
      for (const x of [-.58, .58]) for (const z of [-.4, .4]) cylinder(cart, .2, .2, .13, shared.rubber, x, .22, z, 10, [0, 0, Math.PI / 2]);
    }
    this.tug = tug;
    this.tug.position.set(-23.5, 0, 11);
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth), h = Math.max(1, this.container.clientHeight);
    const aspect = w / h;
    const viewHeight = 108;
    this.camera.left = -viewHeight * aspect / 2;
    this.camera.right = viewHeight * aspect / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  update(delta = 0, simulationRunning = true) {
    this.controls.update();
    const dt = clamp(delta || 0, 0, .05);
    if (dt > 0) {
      this.elapsed += dt;
      if (this.trafficPath) {
        for (const traffic of this.trafficCars) {
          traffic.progress = (traffic.progress + traffic.speed * dt) % 1;
          const point = this.trafficPath.getPointAt(traffic.progress);
          const tangent = this.trafficPath.getTangentAt(traffic.progress);
          traffic.mesh.position.set(point.x, point.y, point.z);
          traffic.mesh.rotation.y = Math.atan2(tangent.x, tangent.z);
        }
      }
    }
    if (simulationRunning && dt > 0) {
      for (const p of this.passengers) {
        const u = (p.userData.t + p.userData.speed * dt) % 1;
        p.userData.t = u;
        const point = this.pedestrianPath.getPointAt(u);
        const tangent = this.pedestrianPath.getTangentAt(u);
        p.position.set(point.x + Math.sin(p.userData.phase) * .42, 0, point.z + Math.cos(p.userData.phase) * .34);
        p.rotation.y = Math.atan2(tangent.x, tangent.z);
        const swing = Math.sin(this.elapsed * 8 + p.userData.phase) * .36;
        p.userData.leftLeg.rotation.x = swing;
        p.userData.rightLeg.rotation.x = -swing;
        p.userData.leftArm.rotation.x = -swing * .72;
        p.userData.rightArm.rotation.x = swing * .72;
      }
      if (this.tug) {
        const angle = this.elapsed * .09;
        this.tug.position.set(-19 + Math.cos(angle) * 4.5, 0, 10.8 + Math.sin(angle) * 2.0);
        this.tug.rotation.y = -angle;
      }
    }
    for (const entry of this.aircraftMeshes.values()) {
      const aircraft = entry.mesh;
      if (aircraft.userData.engineRunning && dt > 0) aircraft.userData.propellers.forEach(propeller => { propeller.rotation.z += dt * 34; });
      entry.lightTime += dt;
      const blink = Math.sin(entry.lightTime * 8) > .15;
      aircraft.userData.beacon.visible = blink;
      aircraft.userData.navRed.visible = blink;
      aircraft.userData.navGreen.visible = blink;
    }
    for (const aircraft of this.parkedAircraft) {
      const blink = Math.sin(this.elapsed * 4 + aircraft.userData.parkedLightOffset) > .5;
      aircraft.userData.beacon.visible = blink;
      aircraft.userData.navRed.visible = blink;
      aircraft.userData.navGreen.visible = blink;
    }
    this.renderer.render(this.scene, this.camera);
  }

  focusAirport() {
    this.controls.target.set(0, 0, 36);
    this.camera.position.set(83, 105, 105);
    this.camera.zoom = .88;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  dispose() {
    this.resizeObserver?.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this._onPointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this._onPointerUp);
    this.renderer.domElement.removeEventListener('contextmenu', this._onContextMenu);
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

function makePassenger(shirtColor, index) {
  const person = new THREE.Group();
  const skin = material(index % 3 === 0 ? '#a96d4a' : index % 3 === 1 ? '#e0b18b' : '#c88e67');
  const shirt = material(shirtColor);
  const trousers = material(index % 2 ? '#34485e' : '#526276');
  const head = sphere(person, .19, skin, 0, 1.28, 0, [.85, 1.05, .9]);
  const hair = sphere(person, .17, material(index % 2 ? '#49382d' : '#7b5940'), 0, 1.4, -.015, [1, .6, 1]);
  box(person, .42, .54, .24, shirt, 0, .82, 0);
  const leftArm = new THREE.Group(); leftArm.position.set(-.29, 1.02, 0); person.add(leftArm);
  const rightArm = new THREE.Group(); rightArm.position.set(.29, 1.02, 0); person.add(rightArm);
  cylinder(leftArm, .075, .08, .48, skin, 0, -.22, 0, 7);
  cylinder(rightArm, .075, .08, .48, skin, 0, -.22, 0, 7);
  const leftLeg = new THREE.Group(); leftLeg.position.set(-.12, .57, 0); person.add(leftLeg);
  const rightLeg = new THREE.Group(); rightLeg.position.set(.12, .57, 0); person.add(rightLeg);
  cylinder(leftLeg, .09, .1, .55, trousers, 0, -.27, 0, 7);
  cylinder(rightLeg, .09, .1, .55, trousers, 0, -.27, 0, 7);
  box(leftLeg, .18, .12, .32, shared.dark, 0, -.55, .07);
  box(rightLeg, .18, .12, .32, shared.dark, 0, -.55, .07);
  // Small carry-on bag helps the crowd read as airport passengers.
  if (index % 3 === 0) {
    const bag = box(person, .27, .32, .18, material('#825e43'), .34, .55, -.05);
    bag.rotation.z = -.12;
  }
  person.userData = { leftLeg, rightLeg, leftArm, rightArm };
  person.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return person;
}

function makeAircraft(kind = 'regional') {
  const g = new THREE.Group();
  const isCargo = kind === 'cargo';
  const isJet = kind === 'jet' || isCargo;
  const fuselageMat = material(isCargo ? '#eef1ed' : '#f7fbfc', .34, .08);
  const bellyMat = material('#cbd8e1', .5, .1);
  const airlineBlue = material(isCargo ? '#df8a37' : kind === 'jet' ? '#196fae' : '#217bc0', .36, .06);
  const stripe = material(isCargo ? '#f3c86b' : '#ffbd47', .42, .02);
  const darkGlass = new THREE.MeshStandardMaterial({ color: '#24465d', roughness: .16, metalness: .28 });
  const engineMat = material('#8998a4', .31, .35);

  // Smooth tapered fuselage, with rounded nose and tail cone.
  const profile = [
    new THREE.Vector2(.03, -5.55), new THREE.Vector2(.22, -5.35), new THREE.Vector2(.37, -4.9),
    new THREE.Vector2(.46, -4.2), new THREE.Vector2(.50, -3.0), new THREE.Vector2(.53, -1.2),
    new THREE.Vector2(.53, 1.3), new THREE.Vector2(.51, 3.2), new THREE.Vector2(.43, 4.15),
    new THREE.Vector2(.28, 4.8), new THREE.Vector2(.09, 5.25), new THREE.Vector2(.015, 5.42),
  ];
  const fuselage = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), fuselageMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.y = .02;
  fuselage.castShadow = true; fuselage.receiveShadow = true; g.add(fuselage);
  box(g, .58, .12, 6.2, bellyMat, 0, -.45, -.1, true, true);

  // Cabin windows follow the fuselage curvature on both sides.
  for (const side of [-1, 1]) {
    if (!isCargo) {
      for (let z = -3.6; z <= 3.1; z += .48) {
        const radius = .52 * Math.sqrt(Math.max(.45, 1 - Math.pow(z / 6.0, 2)));
        sphere(g, .105, darkGlass, side * (radius + .015), .27, z, [.22, .72, .72]);
      }
      box(g, .035, .8, .48, airlineBlue, side * .48, .12, 3.65);
    } else {
      box(g, .045, 1.18, 1.55, stripe, side * .51, .03, -.25, false);
      box(g, .05, .07, 1.42, bellyMat, side * .53, .64, -.25, false);
    }
    const cockpit = box(g, .055, .27, .76, darkGlass, side * .34, .30, 4.65);
    cockpit.rotation.x = -.08;
  }
  // Cockpit windscreen across the nose.
  const windshield = new THREE.Mesh(new THREE.SphereGeometry(.4, 16, 10), darkGlass);
  windshield.scale.set(1.0, .48, .18); windshield.position.set(0, .43, 4.58); g.add(windshield);

  // Swept low wing and rear stabilisers.
  makeWing(g, 15.2, 2.9, 1.15, -.5, fuselageMat);
  makeWing(g, 4.7, 1.45, .7, -4.05, airlineBlue);
  // Blue wing tips and flap lines.
  for (const side of [-1, 1]) {
    const tip = box(g, .34, .3, 1.15, airlineBlue, side * 7.4, .02, -.55);
    tip.rotation.y = side * -.12;
    box(g, 6.5, .035, .06, stripe, side * 3.6, -.07, -1.0, false);
  }
  // Vertical tail fin with a swept shape.
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0); finShape.lineTo(1.35, 0); finShape.lineTo(.6, 2.45); finShape.lineTo(.12, 2.55); finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: .18, bevelEnabled: true, bevelSegments: 1, bevelSize: .05, bevelThickness: .04 });
  finGeo.translate(-.68, 0, -.1);
  const fin = new THREE.Mesh(finGeo, airlineBlue); fin.position.set(0, .42, -4.55); fin.castShadow = true; g.add(fin);
  box(g, .34, .08, .95, stripe, 0, 1.55, -4.45);

  // Under-wing turboprop nacelles with visible propeller spinners and blades.
  const propellers = [];
  for (const side of [-1, 1]) {
    const engine = new THREE.Group(); engine.position.set(side * 3.1, -.52, -.35); g.add(engine);
    const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(.36, .43, 1.75, 16, 1), engineMat);
    nacelle.rotation.x = Math.PI / 2; nacelle.position.z = -.05; nacelle.castShadow = true; engine.add(nacelle);
    const intake = new THREE.Mesh(new THREE.CircleGeometry(.32, 18), material('#172c3c', .4, .2));
    intake.position.z = .84; engine.add(intake);
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(.19, .45, 16), material('#dce6eb', .3, .18));
    spinner.rotation.x = Math.PI / 2; spinner.position.z = 1.02; engine.add(spinner);
    const prop = new THREE.Group(); prop.position.z = .88; engine.add(prop);
    if (isJet) { intake.visible = false; spinner.visible = false; }
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(.10, .65, .045), airlineBlue);
      blade.position.y = .36; blade.rotation.z = i * Math.PI / 2 + .28; prop.add(blade);
    }
    prop.visible = !isJet;
    propellers.push(prop);
  }

  // Detailed landing gear: tyres, struts, wheel hubs and doors.
  const wheels = [], gear = [];
  for (const side of [-1, 1]) {
    const strut = cylinder(g, .055, .065, .68, shared.silver, side * 2.45, -.82, -1.45, 8);
    gear.push(strut);
    const wheel = cylinder(g, .22, .22, .18, shared.rubber, side * 2.45, -1.13, -1.45, 16, [0, 0, Math.PI / 2]);
    const hub = cylinder(g, .105, .105, .195, shared.silver, side * 2.45, -1.13, -1.45, 12, [0, 0, Math.PI / 2]);
    wheels.push(wheel, hub);
  }
  const noseStrut = cylinder(g, .045, .055, .58, shared.silver, 0, -.78, 3.65, 8);
  const noseWheel = cylinder(g, .16, .16, .13, shared.rubber, 0, -1.08, 3.65, 14, [0, 0, Math.PI / 2]);
  const noseHub = cylinder(g, .075, .075, .145, shared.silver, 0, -1.08, 3.65, 10, [0, 0, Math.PI / 2]);
  wheels.push(noseWheel, noseHub); gear.push(noseStrut);
  for (const side of [-1, 1]) {
    const door = box(g, .42, .08, .7, bellyMat, side * 2.45, -.48, -1.45);
    gear.push(door);
  }

  // Recognition details: antennae, doors, service panels and navigation lights.
  cylinder(g, .045, .045, .42, shared.silver, 0, .57, -3.2, 8);
  const beacon = sphere(g, .11, shared.red, 0, .63, -.65);
  const navRed = sphere(g, .12, shared.red, -7.55, .08, -.6);
  const navGreen = sphere(g, .12, shared.green, 7.55, .08, -.6);
  box(g, 1.5, .05, .08, stripe, 0, -.18, 4.0, false);

  g.userData.wheels = wheels;
  g.userData.gear = gear;
  g.userData.beacon = beacon;
  g.userData.navRed = navRed;
  g.userData.navGreen = navGreen;
  g.userData.propellers = propellers;
  g.userData.kind = kind;
  g.scale.setScalar(isCargo ? .80 : isJet ? .78 : .72);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
