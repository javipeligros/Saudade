
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";



const $ = (id) => document.getElementById(id);

const birthInput = $("birthYear");
const birthFeedback = $("birthFeedback");
const memoryForm = $("memoryForm");
const nameInput = $("momentName");
const yearInput = $("momentYear");
const ageOutput = $("calculatedAge") || $("momentAge");
const intensityInput = $("momentIntensity");
const intensityOutput = $("intensityOutput");

const waveContainer = $("waveContainer");
const emptyState = $("emptyState");
const waveStatus = $("waveStatus");
const yearRange = $("yearRange");

const memoryCounter = $("memoryCounter");
const recordCount = $("recordCount");
const recordsTotal = $("recordsTotal");
const recordsList = $("recordsList");

const exportBtn = $("exportBtn");
const resetBtn = $("resetBtn");

const currentYear = new Date().getFullYear();

const COLORS = {
  lugar: "#E6A15A",
  tiempo: "#A88BFF",
  vinculo: "#8BC9A8"
};

const LABELS = {
  lugar: "Lugar",
  tiempo: "Tiempo",
  vinculo: "Vínculo"
};

let birthYear = null;
let memories = [];
let toastTimer = null;

let scene;
let camera;
let renderer;
let waveGroup;
let markerGroup;
let inkGeometry;
let inkMesh;
let highlightLine;

const clock = new THREE.Clock();

const timelineWidth = 9.6;
const segmentCount = 420;
const inkRows = 24;
const strandCount = 49;



function normalizeType(value) {
  const types = {
    lugar: "lugar",
    place: "lugar",
    tiempo: "tiempo",
    time: "tiempo",
    vinculo: "vinculo",
    vínculo: "vinculo",
    bond: "vinculo"
  };

  return types[value] || "lugar";
}

function selectedType() {
  const radio = document.querySelector(
    'input[name="momentType"]:checked'
  );

  return normalizeType(radio?.value);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showToast(message) {
  const toast = $("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function timelineStart() {
  return birthYear ?? currentYear - 80;
}

function yearToX(year) {
  const start = timelineStart();
  const range = currentYear - start;

  if (range <= 0) return 0;

  const progress = THREE.MathUtils.clamp(
    (year - start) / range,
    0,
    1
  );

  return -timelineWidth / 2 + progress * timelineWidth;
}



function updateAge() {
  if (!ageOutput) return;

  const birth = Number(birthInput?.value);
  const year = Number(yearInput?.value);

  if (
    Number.isInteger(birth) &&
    Number.isInteger(year) &&
    birth >= 1900 &&
    year >= birth &&
    year <= currentYear
  ) {
    ageOutput.textContent = `${year - birth} años`;
  } else {
    ageOutput.textContent = "— años";
  }
}

function updateBirthYear() {
  const value = Number(birthInput?.value);

  if (
    !Number.isInteger(value) ||
    value < 1900 ||
    value > currentYear
  ) {
    birthYear = null;

    if (birthFeedback) {
      birthFeedback.textContent =
        `Introduce un año entre 1900 y ${currentYear}.`;
    }

    updateAge();
    updateInterface();
    updateVisualization();
    return;
  }

  birthYear = value;

  memories = memories.filter(
    (memory) => memory.year >= birthYear
  );

  if (birthFeedback) {
    birthFeedback.textContent =
      `Tu línea temporal comienza en ${birthYear}.`;
  }

  updateAge();
  updateInterface();
  updateVisualization();
}

birthInput?.addEventListener("input", updateBirthYear);
birthInput?.addEventListener("change", updateBirthYear);

yearInput?.addEventListener("input", updateAge);
yearInput?.addEventListener("change", updateAge);



function updateIntensity() {
  if (!intensityInput || !intensityOutput) return;

  const value = Number(intensityInput.value);

  intensityOutput.textContent =
    value <= -75 ? "Muy negativo" :
    value <= -25 ? "Negativo" :
    value < 25 ? "Neutro" :
    value < 75 ? "Positivo" :
    "Muy positivo";
}

intensityInput?.addEventListener(
  "input",
  updateIntensity
);



memoryForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!birthYear) {
    showToast("Introduce primero tu año de nacimiento.");
    birthInput?.focus();
    return;
  }

  const name = nameInput?.value.trim();
  const year = Number(yearInput?.value);
  const intensity = Number(intensityInput?.value ?? 0);
  const type = selectedType();

  if (!name) {
    showToast("Escribe un nombre para el recuerdo.");
    nameInput?.focus();
    return;
  }

  if (
    !Number.isInteger(year) ||
    year < birthYear ||
    year > currentYear
  ) {
    showToast(
      `El año debe estar entre ${birthYear} y ${currentYear}.`
    );
    return;
  }

  memories.push({
    id: window.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random()}`,
    name,
    year,
    intensity,
    type
  });

  memories.sort((a, b) => a.year - b.year);

  memoryForm.reset();

  if (intensityInput) {
    intensityInput.value = 0;
  }

  updateIntensity();
  updateAge();
  updateInterface();
  updateVisualization();

  showToast("Recuerdo incorporado a la línea temporal.");
});

function deleteMemory(id) {
  memories = memories.filter(
    (memory) => memory.id !== id
  );

  updateInterface();
  updateVisualization();

  showToast("Recuerdo eliminado.");
}



function renderMemoryList() {
  if (!recordsList) return;

  recordsList.innerHTML = "";

  if (!memories.length) {
    recordsList.innerHTML =
      '<p class="records-empty">Todavía no hay recuerdos registrados.</p>';
    return;
  }

  memories.forEach((memory) => {
    const item = document.createElement("article");

    const age = birthYear
      ? memory.year - birthYear
      : "—";

    item.className = "record-item";
    item.dataset.type = memory.type;

    item.innerHTML = `
      <span class="record-year">
        ${memory.year}
      </span>

      <div>
        <div class="record-name">
          ${escapeHTML(memory.name)}
        </div>

        <div class="record-meta">
          ${age} años · ${LABELS[memory.type]}
        </div>
      </div>

      <span
        class="record-type"
        style="--record-color:${COLORS[memory.type]}"
      >
        ${LABELS[memory.type]}
      </span>

      <span class="record-intensity">
        ${memory.intensity > 0 ? "+" : ""}${memory.intensity}
      </span>

      <button
        class="delete-record"
        type="button"
        aria-label="Eliminar recuerdo"
      >
        ×
      </button>
    `;

    item.querySelector(".delete-record")
      .addEventListener("click", () => {
        deleteMemory(memory.id);
      });

    recordsList.appendChild(item);
  });
}

function updateInterface() {
  const total = memories.length;

  if (memoryCounter) {
    memoryCounter.textContent =
      String(total).padStart(2, "0");
  }

  if (recordCount) {
    recordCount.textContent =
      String(total).padStart(2, "0");
  }

  if (recordsTotal) {
    recordsTotal.textContent =
      `${total} REGISTROS`;
  }

  if (emptyState) {
    emptyState.style.display =
      total === 0 ? "flex" : "none";
  }

  if (waveStatus) {
    waveStatus.textContent = total
      ? `${total} recuerdos registrados`
      : "A la espera de recuerdos";
  }

  if (yearRange) {
    yearRange.textContent =
      `${timelineStart()} — ${currentYear}`;
  }

  renderMemoryList();
}



function initVisualization() {
  if (!waveContainer || renderer) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color("#FFFFFF");

  waveContainer.style.background = "#FFFFFF";

  camera = new THREE.PerspectiveCamera(
    42,
    1,
    0.1,
    100
  );

  camera.position.set(0, 0, 10.8);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor("#FFFFFF", 1);

  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  waveContainer.appendChild(renderer.domElement);

  waveGroup = new THREE.Group();
  markerGroup = new THREE.Group();

  waveGroup.scale.y = 1.42;

  scene.add(waveGroup);
  scene.add(markerGroup);

  scene.add(
    new THREE.AmbientLight("#FFFFFF", 1.15)
  );

  const light1 = new THREE.DirectionalLight(
    "#FFFFFF",
    2.2
  );

  light1.position.set(-3, 5, 7);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(
    "#FFFFFF",
    1.1
  );

  light2.position.set(4, -2, 5);
  scene.add(light2);

  const reflection = new THREE.PointLight(
    "#FFFFFF",
    1.5,
    12
  );

  reflection.position.set(0, 2, 4);
  scene.add(reflection);

  buildWave();
  buildMarkers();
  resizeVisualization();
  animate();
}



function typeDeformation(
  memory,
  distance,
  influence,
  amplitude,
  slowTime,
  index
) {
  const type = normalizeType(memory.type);

  if (type === "lugar") {
    const sigma = 0.42;

    const broad = Math.exp(
      -(distance * distance) /
      (2 * sigma * sigma)
    );

    const shape =
      0.78 +
      Math.cos(distance * 4.2 + index * 0.3) * 0.22;

    return amplitude * broad * shape;
  }

  if (type === "tiempo") {
    const fold = Math.sin(
      distance * 12.5 -
      slowTime * 0.45 +
      index * 0.65
    );

    const inner =
      Math.cos(distance * 6.5 + index) * 0.25;

    return amplitude * influence *
      (0.88 + fold * 0.20 + inner);
  }

  if (type === "vinculo") {
    const offset = 0.19;

    const left = Math.exp(
      -((distance + offset) ** 2) /
      (2 * 0.15 ** 2)
    );

    const right = Math.exp(
      -((distance - offset) ** 2) /
      (2 * 0.15 ** 2)
    );

    const center = Math.exp(
      -(distance ** 2) /
      (2 * 0.09 ** 2)
    );

    return amplitude *
      ((left + right) * 0.55 - center * 0.30) *
      (0.85 + Math.abs(amplitude) * 0.08);
  }

  return amplitude * influence;
}

function getWaveHeight(x, time = 0, strand = 24) {
  const t = time * 0.22;

  const centered =
    strand / (strandCount - 1) - 0.5;

  const outer = Math.abs(centered);

  const broad =
    Math.sin(
      x * 0.82 - t * 0.38 + centered * 2.2
    ) * 0.32;

  const flowing =
    Math.sin(
      x * 1.55 + t * 0.48 + centered * 3.8
    ) * 0.18;

  const small =
    Math.sin(
      x * 3.1 - t * 0.82 + strand * 0.16
    ) * 0.075;

  const micro =
    Math.sin(
      x * 6.2 + t * 1.1 + strand * 0.31
    ) * 0.035;

  const slow =
    Math.sin(
      x * 0.42 + t * 0.22 + centered * 1.6
    ) * 0.22;

  const background =
    broad + flowing + small + micro + slow;

  let deformation = 0;
  let envelope = 0;

  memories.forEach((memory, index) => {
    const distance =
      x - yearToX(memory.year);

    const intensity = THREE.MathUtils.clamp(
      (memory.intensity + 100) / 2,
      0,
      100
    );

    const sigma = intensity < 50
      ? 0.13 + intensity / 100 * 0.12
      : 0.18 + intensity / 100 * 0.14;

    const influence = Math.exp(
      -(distance ** 2) /
      (2 * sigma ** 2)
    );

    envelope = Math.max(
      envelope,
      influence
    );

    let amplitude = 0;

    if (intensity < 50) {
      amplitude =
        -0.48 -
        (50 - intensity) / 50 * 1.05;
    } else if (intensity > 50) {
      amplitude =
        0.38 +
        (intensity - 50) / 50 * 0.82;
    }

    deformation += typeDeformation(
      memory,
      distance,
      influence,
      amplitude,
      t,
      index
    );

    deformation +=
      Math.sin(
        distance * 17 -
        t * 1.3 +
        index * 0.7
      ) *
      influence *
      Math.abs(amplitude) *
      0.075;
  });

  const vibration =
    Math.sin(
      x * 4.4 -
      t * 1.45 +
      strand * 0.24
    ) *
    envelope *
    0.025;

  const movement =
    Math.sin(
      x * 1.8 -
      t * 0.63 +
      strand * 0.52
    ) * 0.03;

  const drift =
    Math.cos(
      x * 0.72 +
      t * 0.32 +
      strand * 0.35
    ) *
    outer *
    0.045;

  return (
    background * 0.42 +
    deformation * (1 + centered * 0.20) +
    vibration +
    movement +
    drift
  );
}



function inkThickness(x, time) {
  const t = time * 0.22;

  let thickness =
    0.34 +
    Math.sin(x * 1.25 + t * 0.31) * 0.035 +
    Math.sin(x * 2.7 - t * 0.48) * 0.021 +
    Math.cos(x * 4.2 + t * 0.22) * 0.012;

  memories.forEach((memory) => {
    const distance =
      x - yearToX(memory.year);

    const intensity = THREE.MathUtils.clamp(
      (memory.intensity + 100) / 2,
      0,
      100
    );

    const sigma =
      0.16 + intensity * 0.002;

    const influence = Math.exp(
      -(distance ** 2) /
      (2 * sigma ** 2)
    );

    thickness += influence *
      (0.06 + intensity * 0.0012);
  });

  return THREE.MathUtils.clamp(
    thickness,
    0.19,
    0.68
  );
}

function edgeDistortion(x, time, side) {
  const t = time * 0.22;

  return (
    Math.sin(x * 2.1 + t * 0.34) * 0.025 +
    Math.sin(x * 4.8 - t * 0.24) * 0.013 +
    Math.cos(x * 8.1 + t * 0.19) * 0.006
  ) * side;
}

function surfaceZ(x, cross, time) {
  const t = time * 0.22;

  return (
    0.12 +
    Math.sin(x * 1.35 - t * 0.3) *
      Math.cos(cross * 2.2) * 0.045 +
    Math.sin(
      x * 3.2 +
      cross * 4.5 +
      t * 0.18
    ) * 0.015 +
    Math.exp(-cross * cross * 5) * 0.075
  );
}



function buildWave() {
  if (!waveGroup) return;

  waveGroup.clear();

  const vertexCount =
    (segmentCount + 1) *
    (inkRows + 1);

  const positions = new Float32Array(
    vertexCount * 3
  );

  const indices = [];

  for (let i = 0; i < segmentCount; i++) {
    for (let row = 0; row < inkRows; row++) {
      const a =
        i * (inkRows + 1) + row;

      const b =
        a + inkRows + 1;

      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  inkGeometry = new THREE.BufferGeometry();

  inkGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      positions,
      3
    )
  );

  inkGeometry.setIndex(indices);

  const material = new THREE.MeshPhysicalMaterial({
    color: "#050505",
    roughness: 0.22,
    metalness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    reflectivity: 0.9,
    side: THREE.DoubleSide,
    toneMapped: false
  });

  inkMesh = new THREE.Mesh(
    inkGeometry,
    material
  );

  inkMesh.frustumCulled = false;

  waveGroup.add(inkMesh);

  const highlightGeometry =
    new THREE.BufferGeometry();

  highlightGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array(
        (segmentCount + 1) * 3
      ),
      3
    )
  );

  highlightLine = new THREE.Line(
    highlightGeometry,
    new THREE.LineBasicMaterial({
      color: "#FFFFFF",
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      toneMapped: false
    })
  );

  waveGroup.add(highlightLine);
}



function updateWave(time) {
  if (!inkGeometry) return;

  const positions =
    inkGeometry.attributes.position;

  const highlights =
    highlightLine.geometry.attributes.position;

  for (let i = 0; i <= segmentCount; i++) {
    const progress =
      i / segmentCount;

    const x =
      -timelineWidth / 2 +
      progress * timelineWidth;

    const center = getWaveHeight(
      x,
      time,
      Math.floor(strandCount / 2)
    );

    const thickness =
      inkThickness(x, time);

    for (let row = 0; row <= inkRows; row++) {
      const cross =
        row / inkRows * 2 - 1;

      const distortion =
        edgeDistortion(
          x,
          time,
          cross
        ) *
        Math.pow(
          Math.abs(cross),
          2.3
        );

      const y =
        center +
        cross *
        (thickness + distortion);

      const z =
        surfaceZ(x, cross, time);

      positions.setXYZ(
        i * (inkRows + 1) + row,
        x,
        y,
        z
      );
    }

    const highlightCross =
      0.43 +
      Math.sin(
        x * 1.4 + time * 0.055
      ) * 0.08;

    highlights.setXYZ(
      i,
      x,
      center +
        highlightCross * thickness,
      surfaceZ(
        x,
        highlightCross,
        time
      ) + 0.018
    );
  }

  positions.needsUpdate = true;
  highlights.needsUpdate = true;

  inkGeometry.computeVertexNormals();
  inkGeometry.computeBoundingSphere();
  highlightLine.geometry.computeBoundingSphere();
}



function makeGlowTexture() {
  const canvas =
    document.createElement("canvas");

  canvas.width = 128;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(
    64, 64, 0,
    64, 64, 64
  );

  gradient.addColorStop(
    0,
    "rgba(255,255,255,1)"
  );

  gradient.addColorStop(
    0.1,
    "rgba(255,255,255,.78)"
  );

  gradient.addColorStop(
    0.25,
    "rgba(255,255,255,.28)"
  );

  gradient.addColorStop(
    0.55,
    "rgba(255,255,255,.08)"
  );

  gradient.addColorStop(
    1,
    "rgba(255,255,255,0)"
  );

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  return new THREE.CanvasTexture(canvas);
}

const glowTexture = makeGlowTexture();

function textSprite(value, color) {
  const canvas =
    document.createElement("canvas");

  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, 512, 128);

  ctx.font = "500 27px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(
    String(value),
    256,
    64
  );

  const texture =
    new THREE.CanvasTexture(canvas);

  texture.colorSpace =
    THREE.SRGBColorSpace;

  return new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false
    })
  );
}



function buildMarkers() {
  if (!markerGroup) return;

  markerGroup.clear();

  memories.forEach((memory, index) => {
    const color =
      COLORS[memory.type];

    const marker =
      new THREE.Group();

    marker.userData.id =
      memory.id;

    marker.userData.index =
      index;

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      })
    );

    glow.scale.set(
      1.35,
      1.35,
      1
    );

    marker.add(glow);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.065 +
          (memory.intensity + 100) /
          200 * 0.035,
        24,
        24
      ),
      new THREE.MeshBasicMaterial({
        color,
        toneMapped: false
      })
    );

    marker.add(sphere);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(
        0.11,
        0.125,
        64
      ),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
        toneMapped: false
      })
    );

    marker.add(ring);

    const label =
      textSprite(memory.name, color);

    label.position.set(
      0,
      0.42,
      0
    );

    label.scale.set(
      Math.max(
        0.8,
        Math.min(
          2,
          memory.name.length * 0.065
        )
      ),
      0.22,
      1
    );

    marker.add(label);

    const yearLabel = textSprite(
      String(memory.year),
      "#333333"
    );

    yearLabel.position.set(
      0,
      -0.36,
      0
    );

    yearLabel.scale.set(
      0.7,
      0.16,
      1
    );

    marker.add(yearLabel);

    const stem = new THREE.Line(
      new THREE.BufferGeometry()
        .setFromPoints([
          new THREE.Vector3(
            0,
            -0.08,
            0
          ),
          new THREE.Vector3(
            0,
            -0.24,
            0
          )
        ]),
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.65,
        toneMapped: false
      })
    );

    marker.add(stem);
    markerGroup.add(marker);
  });
}



function updateMarkers(time) {
  if (!markerGroup) return;

  markerGroup.children.forEach((marker) => {
    const memory = memories.find(
      (item) =>
        item.id === marker.userData.id
    );

    if (!memory) return;

    const x =
      yearToX(memory.year);

    const y =
      getWaveHeight(x, time, 24);

    marker.position.set(
      x,
      y * waveGroup.scale.y,
      0.55
    );

    const pulse =
      1 +
      Math.sin(
        time * 0.65 +
        marker.userData.index
      ) * 0.045;

    const glow =
      marker.children[0];

    const ring =
      marker.children[2];

    glow.scale.set(
      1.35 * pulse,
      1.35 * pulse,
      1
    );

    glow.material.opacity =
      0.82 +
      Math.sin(
        time * 0.65 +
        marker.userData.index
      ) * 0.08;

    ring.rotation.z =
      time * 0.06;
  });
}



function updateVisualization() {
  if (!renderer) return;

  buildWave();
  buildMarkers();

  const time =
    clock.getElapsedTime();

  updateWave(time);
  updateMarkers(time);

  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);

  if (!renderer) return;

  const time =
    clock.getElapsedTime();

  updateWave(time);
  updateMarkers(time);

  renderer.render(scene, camera);
}



function resizeVisualization() {
  if (!renderer || !waveContainer) return;

  const width =
    waveContainer.clientWidth;

  const height =
    waveContainer.clientHeight;

  if (!width || !height) return;

  camera.aspect =
    width / height;

  const fov =
    THREE.MathUtils.degToRad(
      camera.fov
    );

  const distance =
    timelineWidth /
    (
      2 *
      Math.tan(fov / 2) *
      camera.aspect
    );

  camera.position.set(
    0,
    0,
    Math.max(
      6.2,
      distance * 1.1
    )
  );

  camera.updateProjectionMatrix();

  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      2
    )
  );

  renderer.setSize(
    width,
    height
  );
}

window.addEventListener(
  "resize",
  resizeVisualization
);



function capturePosterWave() {
  const captureWidth = 2200;

  const time = clock.getElapsedTime();

  updateWave(time);
  updateMarkers(time);

  const positions =
    inkGeometry.attributes.position;

  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < positions.count; i++) {
    const y =
      positions.getY(i) * waveGroup.scale.y;

    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  markerGroup.children.forEach((marker) => {
    minY = Math.min(
      minY,
      marker.position.y - 0.55
    );

    maxY = Math.max(
      maxY,
      marker.position.y + 0.65
    );
  });

  const centerY =
    (minY + maxY) / 2;

  const visibleWidth =
    timelineWidth + 0.35;

  const visibleHeight =
    Math.max(
      1.4,
      maxY - minY + 0.25
    );

  const captureHeight = Math.round(
    captureWidth *
    visibleHeight /
    visibleWidth
  );

  const canvas =
    document.createElement("canvas");

  canvas.width = captureWidth;
  canvas.height = captureHeight;

  const captureRenderer =
    new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true
    });

  try {
    captureRenderer.setPixelRatio(1);

    captureRenderer.setSize(
      captureWidth,
      captureHeight,
      false
    );

    captureRenderer.outputColorSpace =
      THREE.SRGBColorSpace;

    captureRenderer.toneMapping =
      THREE.NoToneMapping;

    captureRenderer.setClearColor(
      "#FFFFFF",
      1
    );

    const posterCamera =
      new THREE.OrthographicCamera(
        -visibleWidth / 2,
        visibleWidth / 2,
        visibleHeight / 2,
        -visibleHeight / 2,
        0.1,
        100
      );

    posterCamera.position.set(
      0,
      centerY,
      20
    );

    posterCamera.lookAt(
      0,
      centerY,
      0
    );

    posterCamera.updateProjectionMatrix();

    captureRenderer.render(
      scene,
      posterCamera
    );

    const result =
      document.createElement("canvas");

    result.width = captureWidth;
    result.height = captureHeight;

    result.getContext("2d").drawImage(
      canvas,
      0,
      0
    );

    return result;
  } finally {
    captureRenderer.dispose();
  }
}



function drawPoster(ctx, waveCanvas) {
  const W = 595;
  const H = 842;

  const M = 29;
  const R = W - M;

  const BLACK = "#050505";
  const GRAY = "#858585";
  const LIGHT = "#C4C4C4";

  const FONT =
    '"Hanken Grotesk", Arial, sans-serif';

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  function text(
    value,
    x,
    y,
    size,
    weight = 400,
    color = BLACK,
    tracking = 0
  ) {
    ctx.save();

    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${FONT}`;

    if ("letterSpacing" in ctx) {
      ctx.letterSpacing = `${tracking}px`;
    }

    ctx.fillText(String(value), x, y);
    ctx.restore();
  }

  function line(x1, y1, x2, y2, color = BLACK, width = 0.7) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  text("SAUDADE®", M, 38, 11, 900, BLACK, -0.4);

  line(111, 34, 128, 34, BLACK, 0.8);

  ctx.textAlign = "center";
  text("TRABAJO DE FIN DE GRADO", W / 2, 38, 8, 400);
  ctx.textAlign = "right";
  text(`06 / ${currentYear}`, R, 38, 8, 500);
  ctx.textAlign = "left";

  const brand = "SAUDADE";

  let brandSize = 115;

  ctx.font = `900 ${brandSize}px ${FONT}`;

  if ("letterSpacing" in ctx) {
    ctx.letterSpacing = "-5px";
  }

  while (
    ctx.measureText(brand).width > R - M - 16 &&
    brandSize > 50
  ) {
    brandSize -= 1;
    ctx.font = `900 ${brandSize}px ${FONT}`;
  }

  text(
    brand,
    M - 2,
    235,
    brandSize,
    900,
    BLACK,
    -5
  );

  text(
    "®",
    R - 3,
    156,
    15,
    700
  );

  text(
    "CARTOGRAFÍAS",
    M,
    285,
    18,
    800,
    BLACK,
    -0.7
  );

  text(
    "DEL VACÍO",
    M,
    307,
    18,
    200,
    GRAY,
    -0.5
  );

  line(
    183,
    286,
    389,
    286,
    "#777777",
    0.6
  );

  line(
    412,
    270,
    412,
    311,
    "#999999",
    0.6
  );

  text(
    "UNA EXPLORACIÓN VISUAL",
    432,
    281,
    8,
    400
  );

  text(
    "DE LA MEMORIA PERSONAL",
    432,
    293,
    8,
    400
  );

  text(
    "A TRAVÉS DE SU FORMA.",
    432,
    305,
    8,
    400
  );

  const waveX = 0;
  const waveY = 330;
  const waveWidth = W;

  const waveHeight = waveCanvas
    ? waveWidth * waveCanvas.height / waveCanvas.width
    : 160;

  if (waveCanvas) {
    ctx.drawImage(
      waveCanvas,
      waveX,
      waveY,
      waveWidth,
      waveHeight
    );
  }

  const waveBottom = waveY + waveHeight;

  const footerY = 804;
  const dataStart = waveBottom + 29;
  const available = footerY - dataStart - 35;

  const compactness = Math.max(
    0.45,
    Math.min(1, available / 150)
  );

  const numberSize = 92 * compactness;
  const labelSize = 13 * compactness;
  const periodSize = 27 * compactness;

  text(
    String(memories.length).padStart(2, "0"),
    M,
    dataStart + numberSize,
    numberSize,
    900,
    BLACK,
    -5 * compactness
  );

  text(
    "RECUERDOS",
    146,
    dataStart + 51 * compactness,
    labelSize,
    400
  );

  text(
    "REGISTRADOS",
    146,
    dataStart + 67 * compactness,
    labelSize,
    400
  );

  line(
    247,
    dataStart + 5,
    247,
    dataStart + 96 * compactness,
    "#999999",
    0.7
  );

  text(
    "PERIODO VITAL",
    268,
    dataStart + 30 * compactness,
    10 * compactness,
    400,
    GRAY
  );

  text(
    `${birthYear ?? "—"}—${currentYear}`,
    268,
    dataStart + 73 * compactness,
    periodSize,
    800,
    BLACK,
    -1
  );

  line(
    455,
    dataStart + 5,
    455,
    dataStart + 96 * compactness,
    "#999999",
    0.7
  );

  const legend = [
    ["lugar", "Lugar"],
    ["tiempo", "Tiempo"],
    ["vinculo", "Vínculo"]
  ];

  legend.forEach(([type, label], index) => {
    const y =
      dataStart +
      (25 + index * 27) * compactness;

    ctx.fillStyle = COLORS[type];
    ctx.beginPath();
    ctx.arc(
      477,
      y - 4,
      5 * compactness,
      0,
      Math.PI * 2
    );
    ctx.fill();

    text(
      label,
      495,
      y,
      12 * compactness,
      400
    );
  });

  line(M, 790, M + 19, 790, BLACK, 1.2);

  text(
    "ATLAS PERSONAL / 001",
    M,
    818,
    9,
    400
  );

  ctx.textAlign = "right";

  text(
    "FIG. 01",
    R,
    818,
    9,
    400
  );

  ctx.textAlign = "left";
}



exportBtn?.addEventListener("click", async () => {
  if (!renderer || memories.length === 0) {
    showToast(
      "Añade al menos un recuerdo para crear tu lámina."
    );
    return;
  }

  if (!window.jspdf?.jsPDF) {
    showToast(
      "No se ha podido cargar el generador PDF."
    );
    return;
  }

  const originalText = exportBtn.textContent;

  exportBtn.disabled = true;
  exportBtn.textContent = "PREPARANDO PDF…";

  try {
    if (document.fonts) {
      await Promise.all([
        document.fonts.load('200 40px "Hanken Grotesk"'),
        document.fonts.load('400 40px "Hanken Grotesk"'),
        document.fonts.load('700 40px "Hanken Grotesk"'),
        document.fonts.load('900 40px "Hanken Grotesk"')
      ]);

      await document.fonts.ready;
    }

    const waveCapture = capturePosterWave();

    const format =
      $("pdfSize")?.value === "a3" ? "a3" : "a4";

    const widthMM = format === "a3" ? 297 : 210;
    const heightMM = format === "a3" ? 420 : 297;

    const dpi = 170;

    const canvas = document.createElement("canvas");

    canvas.width = Math.round(widthMM / 25.4 * dpi);
    canvas.height = Math.round(heightMM / 25.4 * dpi);

    const ctx = canvas.getContext("2d", {
      alpha: false
    });

    ctx.scale(
      canvas.width / 595,
      canvas.height / 842
    );

    drawPoster(ctx, waveCapture);

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format,
      compress: true
    });

    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.96),
      "JPEG",
      0,
      0,
      widthMM,
      heightMM
    );

    pdf.save(
      `saudade-atlas-${format.toUpperCase()}.pdf`
    );

    showToast(
      `Lámina ${format.toUpperCase()} descargada.`
    );

  } catch (error) {
    console.error("Error al exportar el cartel:", error);
    showToast("No se ha podido generar el PDF.");

  } finally {
    exportBtn.disabled = false;
    exportBtn.textContent = originalText;
  }
});



resetBtn?.addEventListener("click", () => {
  memories = [];

  memoryForm?.reset();

  if (intensityInput) {
    intensityInput.value = 0;
  }

  updateIntensity();
  updateAge();
  updateInterface();
  updateVisualization();

  showToast("La línea temporal se ha reiniciado.");
});



function initializeApp() {
  if (birthInput?.value) {
    const value = Number(birthInput.value);

    if (
      Number.isInteger(value) &&
      value >= 1900 &&
      value <= currentYear
    ) {
      birthYear = value;
    }
  }

  updateAge();
  updateIntensity();
  updateInterface();
  initVisualization();
}

initializeApp();
