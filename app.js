import * as THREE from "three";
import { NODE_DATA } from "./data.js";

const canvas = document.getElementById("scene");
const loading = document.getElementById("loading");
const modeBadge = document.getElementById("modeBadge");
const zoomText = document.getElementById("zoomText");
const zoomFill = document.getElementById("zoomFill");
const zoomOutButton = document.getElementById("zoomOut");
const zoomResetButton = document.getElementById("zoomReset");
const zoomInButton = document.getElementById("zoomIn");
const intro = document.getElementById("intro");
const projectMenu = document.getElementById("projectMenu");
const menuList = document.getElementById("menuList");
const infoPanel = document.getElementById("infoPanel");
const infoKicker = document.getElementById("infoKicker");
const infoTitle = document.getElementById("infoTitle");
const infoDescription = document.getElementById("infoDescription");
const tags = document.getElementById("tags");
const actions = document.getElementById("actions");

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x01070b, 0.05);

const camera = new THREE.PerspectiveCamera(
  44,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0.3, 8.7);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x01070b);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const world = new THREE.Group();
scene.add(world);

const mainGlobe = new THREE.Group();
world.add(mainGlobe);

const universeGroup = new THREE.Group();
world.add(universeGroup);

const dataSpaceGroup = new THREE.Group();
world.add(dataSpaceGroup);

const GLOBE_RADIUS = 2.55;
const zAxis = new THREE.Vector3(0, 0, 1);

function createPointSphere(radius, count, size, opacity = 0.82) {
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const u = Math.random();
    const v = Math.random();
    const theta = Math.PI * 2 * u;
    const phi = Math.acos(2 * v - 1);

    positions[index * 3] =
      radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] =
      radius * Math.cos(phi);
    positions[index * 3 + 2] =
      radius * Math.sin(phi) * Math.sin(theta);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );

  const material = new THREE.PointsMaterial({
    color: 0x40eaff,
    size,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  return new THREE.Points(geometry, material);
}

function createOrbit(radius, opacity, rotation) {
  const points = [];

  for (let index = 0; index <= 180; index += 1) {
    const angle = (index / 180) * Math.PI * 2;

    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      )
    );
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x58f7ff,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const orbit = new THREE.LineLoop(geometry, material);
  orbit.rotation.set(...rotation);

  return orbit;
}

function createIconTexture(text) {
  const element = document.createElement("canvas");
  element.width = 256;
  element.height = 256;

  const context = element.getContext("2d");

  const gradient = context.createRadialGradient(
    128, 128, 10,
    128, 128, 128
  );

  gradient.addColorStop(0, "rgba(235,255,255,.96)");
  gradient.addColorStop(0.18, "rgba(88,247,255,.5)");
  gradient.addColorStop(0.62, "rgba(0,217,255,.08)");
  gradient.addColorStop(1, "rgba(0,217,255,0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  context.beginPath();
  context.arc(128, 128, 78, 0, Math.PI * 2);
  context.fillStyle = "rgba(3,25,37,.92)";
  context.fill();

  context.lineWidth = 5;
  context.strokeStyle = "#58f7ff";
  context.shadowColor = "#58f7ff";
  context.shadowBlur = 20;
  context.stroke();

  context.fillStyle = "#efffff";
  context.font = `900 ${text.length > 1 ? 54 : 78}px system-ui`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 128, 130);

  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function createMiniGlobe(data) {
  const node = new THREE.Group();

  const pointSphere = createPointSphere(
    0.25,
    190,
    0.018,
    0.92
  );
  node.add(pointSphere);

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.255, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0x20dcff,
      transparent: true,
      opacity: 0.045,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  node.add(shell);

  const orbit = createOrbit(
    0.34,
    0.45,
    [1.1, 0.2, 0.15]
  );
  node.add(orbit);

  const icon = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createIconTexture(data.icon),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  icon.scale.setScalar(0.42);
  icon.userData = data;
  node.add(icon);

  node.userData.pointSphere = pointSphere;
  node.userData.orbit = orbit;
  node.userData.icon = icon;

  return node;
}

function latLonToVector3(latitude, longitude, radius) {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(longitude);

  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.sin(lon)
  );
}

const mainPointGlobe = createPointSphere(
  GLOBE_RADIUS,
  window.innerWidth < 700 ? 2600 : 4800,
  window.innerWidth < 700 ? 0.028 : 0.022
);
mainGlobe.add(mainPointGlobe);

const mainGlow = new THREE.Mesh(
  new THREE.SphereGeometry(GLOBE_RADIUS * 1.02, 64, 64),
  new THREE.MeshBasicMaterial({
    color: 0x16dfff,
    transparent: true,
    opacity: 0.025,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
);
mainGlobe.add(mainGlow);

const mainOrbits = [
  createOrbit(GLOBE_RADIUS * 1.15, 0.13, [1.1, 0.1, 0.15]),
  createOrbit(GLOBE_RADIUS * 1.28, 0.11, [0.65, 1.0, -0.25]),
  createOrbit(GLOBE_RADIUS * 1.4, 0.08, [1.45, 0.3, 0.4]),
  createOrbit(GLOBE_RADIUS * 1.52, 0.06, [0.28, 0.9, -0.6])
];

mainOrbits.forEach((orbit) => mainGlobe.add(orbit));

const nodes = [];
const rayTargets = [];

NODE_DATA.forEach((data, index) => {
  const globePosition = latLonToVector3(
    data.latitude,
    data.longitude,
    GLOBE_RADIUS + 0.18
  );

  const miniGlobe = createMiniGlobe(data);
  miniGlobe.position.copy(globePosition);
  miniGlobe.scale.setScalar(data.importance || 1);
  mainGlobe.add(miniGlobe);

  const universeAngle =
    (index / NODE_DATA.length) * Math.PI * 2;

  const universeRadius =
    1.3 + (index % 3) * 0.78;

  const universePosition = new THREE.Vector3(
    Math.cos(universeAngle) * universeRadius,
    Math.sin(universeAngle) * universeRadius * 0.72,
    Math.sin(universeAngle * 1.7) * 0.35
  );

  const dataColumns = 3;
  const column = index % dataColumns;
  const row = Math.floor(index / dataColumns);

  const dataPosition = new THREE.Vector3(
    (column - 1) * 1.65,
    (0.8 - row) * 1.5,
    0.15 + (index % 2) * 0.18
  );

  nodes.push({
    data,
    miniGlobe,
    globePosition,
    universePosition,
    dataPosition,
    universeAngle,
    universeRadius
  });

  rayTargets.push(miniGlobe.userData.icon);
});

const starCount = window.innerWidth < 700 ? 750 : 1300;
const stars = createPointSphere(24, starCount, 0.035, 0.55);
scene.add(stars);

let zoom = 1;
let targetZoom = 1;

let rotationX = 0;
let rotationY = 0;
let targetRotationX = 0;
let targetRotationY = 0;

let dragging = false;
let lastX = 0;
let lastY = 0;
let moved = 0;

const pointers = new Map();
let previousPinchDistance = 0;

let focusAnimation = null;
let autoRotate = true;
let resumeAutoRotateAt = 0;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp(
    (value - edge0) / (edge1 - edge0),
    0,
    1
  );

  return t * t * (3 - 2 * t);
}

function getModeWeights() {
  const universe = 1 - smoothstep(0.45, 0.72, zoom);
  const dataSpace = smoothstep(1.22, 1.5, zoom);
  const globe = THREE.MathUtils.clamp(
    1 - universe - dataSpace,
    0,
    1
  );

  return {
    universe,
    globe,
    dataSpace
  };
}

function updateModeUI(weights) {
  const percent = Math.round(zoom * 100);
  zoomText.textContent = `${percent}%`;

  zoomFill.style.width =
    `${THREE.MathUtils.clamp((zoom - 0.35) / 1.25 * 100, 0, 100)}%`;

  if (weights.universe > 0.55) {
    modeBadge.textContent = "Universe Mode";
  } else if (weights.dataSpace > 0.55) {
    modeBadge.textContent = "Data Space Mode";
  } else {
    modeBadge.textContent = "Globe Mode";
  }

  const introOpacity =
    weights.dataSpace > 0.3
      ? THREE.MathUtils.lerp(1, 0.12, weights.dataSpace)
      : 1;

  if (!infoPanel.classList.contains("open")) {
    intro.style.opacity = String(introOpacity);
  }
}

function getPinchDistance() {
  const values = [...pointers.values()];

  if (values.length < 2) {
    return 0;
  }

  return Math.hypot(
    values[0].x - values[1].x,
    values[0].y - values[1].y
  );
}

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);

  pointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY
  });

  dragging = true;
  autoRotate = false;
  resumeAutoRotateAt = performance.now() + 1800;

  lastX = event.clientX;
  lastY = event.clientY;
  moved = 0;

  if (pointers.size === 2) {
    previousPinchDistance = getPinchDistance();
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointers.has(event.pointerId)) {
    return;
  }

  pointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY
  });

  if (pointers.size === 2) {
    const currentDistance = getPinchDistance();

    if (previousPinchDistance > 0) {
      targetZoom +=
        (currentDistance - previousPinchDistance) * 0.003;

      targetZoom = THREE.MathUtils.clamp(
        targetZoom,
        0.35,
        1.6
      );
    }

    previousPinchDistance = currentDistance;
    return;
  }

  const deltaX = event.clientX - lastX;
  const deltaY = event.clientY - lastY;

  moved += Math.abs(deltaX) + Math.abs(deltaY);

  targetRotationY += deltaX * 0.0065;
  targetRotationX += deltaY * 0.005;

  targetRotationX = THREE.MathUtils.clamp(
    targetRotationX,
    -1.4,
    1.4
  );

  lastX = event.clientX;
  lastY = event.clientY;
});

canvas.addEventListener("pointerup", (event) => {
  const isTap =
    moved < 10 &&
    pointers.size <= 1;

  pointers.delete(event.pointerId);

  if (pointers.size === 0) {
    dragging = false;
    previousPinchDistance = 0;
  }

  if (!isTap) {
    return;
  }

  pointer.x =
    (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y =
    -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const hit =
    raycaster.intersectObjects(rayTargets, false)[0];

  if (hit) {
    selectNode(hit.object.userData.id);
  }
});

canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();

    targetZoom -= event.deltaY * 0.0014;
    targetZoom = THREE.MathUtils.clamp(
      targetZoom,
      0.35,
      1.6
    );
  },
  { passive: false }
);

let touchStartDistance = 0;
let touchStartZoom = 1;

canvas.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length === 2) {
      event.preventDefault();

      touchStartDistance = Math.hypot(
        event.touches[0].clientX -
          event.touches[1].clientX,
        event.touches[0].clientY -
          event.touches[1].clientY
      );

      touchStartZoom = targetZoom;
    }
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (event) => {
    if (
      event.touches.length !== 2 ||
      touchStartDistance <= 0
    ) {
      return;
    }

    event.preventDefault();

    const currentDistance = Math.hypot(
      event.touches[0].clientX -
        event.touches[1].clientX,
      event.touches[0].clientY -
        event.touches[1].clientY
    );

    targetZoom = THREE.MathUtils.clamp(
      touchStartZoom *
        (currentDistance / touchStartDistance),
      0.35,
      1.6
    );
  },
  { passive: false }
);

zoomOutButton.addEventListener("click", () => {
  targetZoom = THREE.MathUtils.clamp(
    targetZoom - 0.12,
    0.35,
    1.6
  );
});

zoomResetButton.addEventListener("click", () => {
  targetZoom = 1;
});

zoomInButton.addEventListener("click", () => {
  targetZoom = THREE.MathUtils.clamp(
    targetZoom + 0.12,
    0.35,
    1.6
  );
});

function openInfo(data) {
  projectMenu.classList.remove("open");

  infoKicker.textContent = data.kicker;
  infoTitle.textContent = data.title;
  infoDescription.textContent = data.description;

  tags.replaceChildren(
    ...(data.tech || []).map((technology) => {
      const element = document.createElement("span");
      element.textContent = technology;
      return element;
    })
  );

  const actionElements = [];

  (data.links || []).forEach((link) => {
    const element = document.createElement("a");

    element.className = "action";
    element.href = link.href;
    element.textContent = link.label;

    if (link.external) {
      element.target = "_blank";
      element.rel = "noopener noreferrer";
    }

    actionElements.push(element);
  });

  const backButton = document.createElement("button");
  backButton.className = "action";
  backButton.textContent = "Kembali";
  backButton.addEventListener("click", closeInfo);

  actionElements.push(backButton);
  actions.replaceChildren(...actionElements);

  infoPanel.classList.add("open");
  infoPanel.setAttribute("aria-hidden", "false");
  intro.style.opacity = "0.12";
}

function closeInfo() {
  infoPanel.classList.remove("open");
  infoPanel.setAttribute("aria-hidden", "true");
}

function showMenu() {
  infoPanel.classList.remove("open");
  projectMenu.classList.add("open");
  projectMenu.setAttribute("aria-hidden", "false");
}

function focusNode(id) {
  const entry = nodes.find(
    (node) => node.data.id === id
  );

  if (!entry) {
    return;
  }

  autoRotate = false;
  resumeAutoRotateAt = performance.now() + 1100;

  const targetDirection = camera.position
    .clone()
    .sub(world.position)
    .normalize();

  const localDirection =
    entry.globePosition.clone().normalize();

  const startQuaternion =
    world.quaternion.clone();

  const endQuaternion =
    new THREE.Quaternion()
      .setFromUnitVectors(
        localDirection,
        targetDirection
      );

  focusAnimation = {
    startQuaternion,
    endQuaternion,
    startTime: performance.now(),
    duration: 900,
    data: entry.data
  };
}

function selectNode(id) {
  if (id === "menu") {
    showMenu();
    return;
  }

  focusNode(id);
}

NODE_DATA
  .filter((node) => node.type === "project")
  .forEach((data) => {
    const button = document.createElement("button");

    button.className = "menu-item";
    button.innerHTML = `
      <span>${data.title}</span>
      <span>◎</span>
    `;

    button.addEventListener("click", () => {
      projectMenu.classList.remove("open");
      focusNode(data.id);
    });

    menuList.appendChild(button);
  });

document
  .getElementById("closeMenu")
  .addEventListener("click", () => {
    projectMenu.classList.remove("open");
  });

document
  .getElementById("closeInfo")
  .addEventListener("click", closeInfo);

document
  .getElementById("resetButton")
  .addEventListener("click", () => {
    targetRotationX = 0;
    targetRotationY = 0;
    targetZoom = 1;

    focusAnimation = null;
    autoRotate = true;
    resumeAutoRotateAt = 0;

    projectMenu.classList.remove("open");
    closeInfo();
  });

function updateResponsivePosition() {
  if (window.innerWidth <= 980) {
    world.position.set(0, -0.55, 0);
  } else {
    world.position.set(1.85, 0, 0);
  }
}

updateResponsivePosition();

const clock = new THREE.Clock();

function animate(now) {
  const elapsed = clock.getElapsedTime();

  zoom += (targetZoom - zoom) * 0.08;

  const weights = getModeWeights();
  updateModeUI(weights);

  if (focusAnimation) {
    const progress = Math.min(
      1,
      (now - focusAnimation.startTime) /
        focusAnimation.duration
    );

    const eased =
      progress < 0.5
        ? 4 * progress ** 3
        : 1 - ((-2 * progress + 2) ** 3) / 2;

    world.quaternion.slerpQuaternions(
      focusAnimation.startQuaternion,
      focusAnimation.endQuaternion,
      eased
    );

    if (progress >= 1) {
      const data = focusAnimation.data;

      focusAnimation = null;
      resumeAutoRotateAt =
        performance.now() + 900;

      const euler =
        new THREE.Euler().setFromQuaternion(
          world.quaternion,
          "XYZ"
        );

      rotationX = targetRotationX = euler.x;
      rotationY = targetRotationY = euler.y;

      window.setTimeout(() => {
        openInfo(data);
      }, 130);
    }
  } else {
    if (
      !dragging &&
      pointers.size === 0 &&
      performance.now() >= resumeAutoRotateAt
    ) {
      autoRotate = true;
    }

    if (autoRotate) {
      targetRotationY += 0.00105;
    }

    rotationX +=
      (targetRotationX - rotationX) * 0.08;

    rotationY +=
      (targetRotationY - rotationY) * 0.08;

    world.rotation.set(
      rotationX,
      rotationY,
      0
    );
  }

  const visualScale =
    THREE.MathUtils.lerp(
      0.74,
      1.18,
      smoothstep(0.35, 1.6, zoom)
    );

  world.scale.setScalar(visualScale);

  mainGlobe.visible =
    weights.universe < 0.98 &&
    weights.dataSpace < 0.98;

  nodes.forEach((node, index) => {
    const universeAngle =
      node.universeAngle +
      elapsed * (0.08 + index * 0.004);

    const animatedUniversePosition =
      new THREE.Vector3(
        Math.cos(universeAngle) *
          node.universeRadius,
        Math.sin(universeAngle) *
          node.universeRadius * 0.72,
        Math.sin(universeAngle * 1.7) * 0.35
      );

    const blendedPosition =
      node.globePosition
        .clone()
        .lerp(
          animatedUniversePosition,
          weights.universe
        )
        .lerp(
          node.dataPosition,
          weights.dataSpace
        );

    node.miniGlobe.position.copy(
      blendedPosition
    );

    node.miniGlobe.userData.pointSphere.rotation.y +=
      0.008 + index * 0.0008;

    node.miniGlobe.userData.orbit.rotation.z +=
      0.006 + index * 0.0005;

    const depthScale =
      weights.dataSpace > 0.4
        ? 1.15
        : 1;

    node.miniGlobe.scale.setScalar(
      (node.data.importance || 1) *
        depthScale
    );

    node.miniGlobe.quaternion.copy(
      camera.quaternion
    );
  });

  mainOrbits.forEach((orbit, index) => {
    orbit.rotation.z +=
      0.00035 + index * 0.0001;
  });

  stars.rotation.y += 0.00005;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

window.addEventListener("resize", () => {
  camera.aspect =
    window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 1.7)
  );

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  updateResponsivePosition();
});

window.setTimeout(() => {
  loading.classList.add("hide");
}, 700);
