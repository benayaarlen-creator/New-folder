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
camera.position.set(0, 0.25, 8.7);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x01070b);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const systemRoot = new THREE.Group();
scene.add(systemRoot);

const globeBody = new THREE.Group();
systemRoot.add(globeBody);

const nodeLayer = new THREE.Group();
systemRoot.add(nodeLayer);

const GLOBE_RADIUS = 2.55;
const FORWARD = new THREE.Vector3(0, 0, 1);

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
  const group = new THREE.Group();

  const pointSphere = createPointSphere(
    0.25,
    210,
    0.018,
    0.95
  );
  group.add(pointSphere);

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.255, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0x20dcff,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  group.add(shell);

  const ringA = createOrbit(
    0.34,
    0.46,
    [1.08, 0.2, 0.14]
  );
  group.add(ringA);

  const ringB = createOrbit(
    0.3,
    0.24,
    [0.38, 1.08, -0.24]
  );
  group.add(ringB);

  const icon = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createIconTexture(data.icon),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  icon.scale.setScalar(0.43);
  icon.userData = data;
  group.add(icon);

  const hitArea = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 16, 16),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false
    })
  );
  hitArea.userData = data;
  group.add(hitArea);

  group.userData.pointSphere = pointSphere;
  group.userData.ringA = ringA;
  group.userData.ringB = ringB;
  group.userData.icon = icon;
  group.userData.hitArea = hitArea;

  return group;
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
  window.innerWidth < 700 ? 2800 : 5200,
  window.innerWidth < 700 ? 0.027 : 0.021
);
globeBody.add(mainPointGlobe);

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
globeBody.add(mainGlow);

const mainOrbits = [
  createOrbit(GLOBE_RADIUS * 1.12, 0.14, [1.12, 0.05, 0.12]),
  createOrbit(GLOBE_RADIUS * 1.24, 0.11, [0.62, 1.0, -0.24]),
  createOrbit(GLOBE_RADIUS * 1.36, 0.09, [1.42, 0.28, 0.38]),
  createOrbit(GLOBE_RADIUS * 1.48, 0.07, [0.28, 0.88, -0.58]),
  createOrbit(GLOBE_RADIUS * 1.58, 0.05, [0.9, 1.35, 0.12])
];

mainOrbits.forEach((orbit) => globeBody.add(orbit));

const nodes = [];
const rayTargets = [];

/*
  Layout stabil berdasarkan ID.
*/
const UNIVERSE_LAYOUT = {
  about:     new THREE.Vector3(0, 0, 0.18),
  menu:      new THREE.Vector3(0, 1.55, 0.08),
  emotion:   new THREE.Vector3(1.65, 0.7, 0.02),
  chatbot:   new THREE.Vector3(-1.65, 0.7, 0.02),
  onda:      new THREE.Vector3(1.55, -0.9, 0.02),
  portfolio: new THREE.Vector3(-1.55, -0.9, 0.02),
  contact:   new THREE.Vector3(0, -1.65, 0.08)
};

const DATA_SPACE_LAYOUT = {
  menu:      new THREE.Vector3(-1.7, 1.12, 0.08),
  about:     new THREE.Vector3(0, 1.12, 0.12),
  contact:   new THREE.Vector3(1.7, 1.12, 0.08),
  emotion:   new THREE.Vector3(-1.7, -0.25, 0.08),
  chatbot:   new THREE.Vector3(0, -0.25, 0.12),
  onda:      new THREE.Vector3(1.7, -0.25, 0.08),
  portfolio: new THREE.Vector3(0, -1.58, 0.12)
};

NODE_DATA.forEach((data, index) => {
  const globePosition = latLonToVector3(
    data.latitude,
    data.longitude,
    GLOBE_RADIUS + 0.18
  );

  const miniGlobe = createMiniGlobe(data);
  miniGlobe.scale.setScalar(data.importance || 1);
  nodeLayer.add(miniGlobe);

  nodes.push({
    data,
    miniGlobe,
    globePosition,
    universePosition:
      (UNIVERSE_LAYOUT[data.id] || new THREE.Vector3()).clone(),
    dataSpacePosition:
      (DATA_SPACE_LAYOUT[data.id] || new THREE.Vector3()).clone()
  });

  rayTargets.push(miniGlobe.userData.hitArea);
});

const stars = createPointSphere(
  24,
  window.innerWidth < 700 ? 800 : 1400,
  0.035,
  0.55
);
scene.add(stars);

let zoom = 1;
let targetZoom = 1;

let rotationX = 0;
let rotationY = 0;
let targetRotationX = 0;
let targetRotationY = 0;

const globeQuaternion = new THREE.Quaternion();

let dragging = false;
let lastX = 0;
let lastY = 0;
let moved = 0;

const pointers = new Map();
let previousPinchDistance = 0;

let focusAnimation = null;
let selectedNodeId = null;
let focusLocked = false;

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
  const universe = 1 - smoothstep(0.5, 0.75, zoom);
  const dataSpace = smoothstep(1.22, 1.5, zoom);

  return {
    universe,
    globe: THREE.MathUtils.clamp(
      1 - universe - dataSpace,
      0,
      1
    ),
    dataSpace
  };
}

function updateModeUI(weights) {
  const percent = Math.round(zoom * 100);

  zoomText.textContent = `${percent}%`;

  zoomFill.style.width =
    `${THREE.MathUtils.clamp(
      (zoom - 0.35) / 1.25 * 100,
      0,
      100
    )}%`;

  if (weights.universe > 0.55) {
    modeBadge.textContent = "Universe Mode";
  } else if (weights.dataSpace > 0.55) {
    modeBadge.textContent = "Data Space Mode";
  } else {
    modeBadge.textContent = "Globe Mode";
  }

  if (!infoPanel.classList.contains("open")) {
    intro.style.opacity = String(
      THREE.MathUtils.lerp(
        1,
        0.48,
        weights.dataSpace
      )
    );
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
  if (infoPanel.classList.contains("open")) {
    return;
  }

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
    -1.35,
    1.35
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
  selectedNodeId = data.id;
  focusLocked = true;
  autoRotate = false;
  resumeAutoRotateAt = Number.POSITIVE_INFINITY;

  projectMenu.classList.remove("open");
  projectMenu.setAttribute("aria-hidden", "true");

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

  focusLocked = false;
  selectedNodeId = null;
  autoRotate = false;
  resumeAutoRotateAt = performance.now() + 900;
}

function showMenu() {
  closeInfo();

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

  const weights = getModeWeights();

  if (weights.globe < 0.55) {
    openInfo(entry.data);
    return;
  }

  selectedNodeId = entry.data.id;
  focusLocked = true;
  autoRotate = false;
  resumeAutoRotateAt = Number.POSITIVE_INFINITY;

  const systemCenter = new THREE.Vector3();
  systemRoot.getWorldPosition(systemCenter);

  const cameraDirection = camera.position
    .clone()
    .sub(systemCenter)
    .normalize();

  const currentNodeDirection = entry.globePosition
    .clone()
    .applyQuaternion(globeQuaternion)
    .normalize();

  const deltaQuaternion =
    new THREE.Quaternion().setFromUnitVectors(
      currentNodeDirection,
      cameraDirection
    );

  const startQuaternion = globeQuaternion.clone();
  const endQuaternion = deltaQuaternion
    .multiply(startQuaternion)
    .normalize();

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
    projectMenu.setAttribute("aria-hidden", "true");
  });

document
  .getElementById("closeInfo")
  .addEventListener("click", closeInfo);

document
  .getElementById("resetButton")
  .addEventListener("click", () => {
    targetZoom = 1;
    targetRotationX = 0;
    targetRotationY = 0;

    focusAnimation = null;
    selectedNodeId = null;
    focusLocked = false;
    globeQuaternion.identity();

    autoRotate = true;
    resumeAutoRotateAt = 0;

    projectMenu.classList.remove("open");
    closeInfo();
  });

function updateResponsivePosition() {
  const aspect = window.innerWidth / window.innerHeight;
  const isPortrait = aspect < 0.82;
  const isTablet = window.innerWidth <= 1100;

  if (isPortrait) {
    systemRoot.position.set(0, -0.48, 0);
  } else if (isTablet) {
    systemRoot.position.set(0.65, -0.3, 0);
  } else {
    systemRoot.position.set(1.85, 0, 0);
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

    globeQuaternion.slerpQuaternions(
      focusAnimation.startQuaternion,
      focusAnimation.endQuaternion,
      eased
    );

    if (progress >= 1) {
      const data = focusAnimation.data;

      /*
        Simpan rotasi akhir hasil quaternion ke rotationX/rotationY.
        Tanpa ini, frame berikutnya akan memakai rotasi lama dan globe
        meloncat kembali sehingga node keluar dari tengah.
      */
      const finalEuler = new THREE.Euler().setFromQuaternion(
        globeQuaternion,
        "XYZ"
      );

      rotationX = finalEuler.x;
      rotationY = finalEuler.y;
      targetRotationX = rotationX;
      targetRotationY = rotationY;

      focusAnimation = null;
      focusLocked = true;
      autoRotate = false;
      resumeAutoRotateAt = Number.POSITIVE_INFINITY;

      window.setTimeout(() => {
        openInfo(data);
      }, 140);
    }
  } else {
    if (
      !focusLocked &&
      !infoPanel.classList.contains("open") &&
      !dragging &&
      pointers.size === 0 &&
      performance.now() >= resumeAutoRotateAt
    ) {
      autoRotate = true;
    }

    if (
      autoRotate &&
      !focusLocked &&
      !infoPanel.classList.contains("open") &&
      weights.globe > 0.35
    ) {
      targetRotationY += 0.00105;
    }

    rotationX +=
      (targetRotationX - rotationX) * 0.08;

    rotationY +=
      (targetRotationY - rotationY) * 0.08;

    globeQuaternion.setFromEuler(
      new THREE.Euler(
        rotationX,
        rotationY,
        0,
        "XYZ"
      )
    );
  }

  globeBody.quaternion.copy(globeQuaternion);

  const bodyOpacity =
    0.82 *
    THREE.MathUtils.clamp(
      1 -
        weights.universe * 0.82 -
        weights.dataSpace * 0.9,
      0.12,
      1
    );

  mainPointGlobe.material.opacity = bodyOpacity;
  mainGlow.material.opacity =
    0.025 *
    THREE.MathUtils.clamp(
      1 -
        weights.universe * 0.8 -
        weights.dataSpace * 0.92,
      0.05,
      1
    );

  mainOrbits.forEach((orbit, index) => {
    orbit.material.opacity =
      (0.14 - index * 0.02) *
      THREE.MathUtils.clamp(
        1 - weights.dataSpace * 0.75,
        0.18,
        1
      );

    orbit.rotation.z +=
      0.00035 + index * 0.00009;
  });

  nodes.forEach((node, index) => {
    const globePosition = node.globePosition
      .clone()
      .applyQuaternion(globeQuaternion);

    const floatAmount =
      node.data.id === "about"
        ? 0.018
        : 0.035;

    const universeFloat =
      new THREE.Vector3(
        Math.sin(elapsed * 0.42 + index) * floatAmount,
        Math.cos(elapsed * 0.38 + index) * floatAmount,
        Math.sin(elapsed * 0.31 + index) * 0.018
      );

    const universePosition = node.universePosition
      .clone()
      .add(universeFloat);

    const dataPosition = node.dataSpacePosition.clone();

    const blended = globePosition
      .clone()
      .lerp(universePosition, weights.universe)
      .lerp(dataPosition, weights.dataSpace);

    node.miniGlobe.position.copy(blended);

    const portraitFactor =
      window.innerWidth / window.innerHeight < 0.82
        ? 0.76
        : 1;

    const universeBoost =
      node.data.id === "about"
        ? 0.34
        : 0.12;

    const modeScale =
      1 +
      weights.universe * universeBoost +
      weights.dataSpace * 0.2;

    const selectedBoost =
      node.data.id === selectedNodeId
        ? 1.34
        : 1;

    node.miniGlobe.scale.setScalar(
      (node.data.importance || 1) *
      modeScale *
      portraitFactor *
      selectedBoost
    );

    const selectedOpacity =
      node.data.id === selectedNodeId
        ? 1
        : 0.86;

    node.miniGlobe.userData.pointSphere.material.opacity =
      selectedOpacity;

    node.miniGlobe.userData.icon.material.opacity =
      node.data.id === selectedNodeId
        ? 1
        : 0.9;

    node.miniGlobe.userData.ringA.material.opacity =
      node.data.id === selectedNodeId
        ? 0.78
        : 0.46;

    node.miniGlobe.userData.ringB.material.opacity =
      node.data.id === selectedNodeId
        ? 0.5
        : 0.24;

    node.miniGlobe.userData.pointSphere.rotation.y +=
      0.007 + index * 0.0007;

    node.miniGlobe.userData.ringA.rotation.z +=
      0.005 + index * 0.0004;

    node.miniGlobe.userData.ringB.rotation.y -=
      0.0035 + index * 0.0003;

    node.miniGlobe.quaternion.copy(camera.quaternion);
    node.miniGlobe.visible = true;
  });

  const aspect = window.innerWidth / window.innerHeight;

  const portraitBase =
    aspect < 0.82
      ? 0.7
      : aspect < 1.15
        ? 0.84
        : 1;

  const zoomScale =
    THREE.MathUtils.lerp(
      0.86,
      1.06,
      smoothstep(0.35, 1.6, zoom)
    );

  systemRoot.scale.setScalar(
    portraitBase * zoomScale
  );

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
