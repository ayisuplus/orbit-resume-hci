const names = ['个人简介', '教育背景', '项目经历', '专业技能', '联系方式'];
const panels = [...document.querySelectorAll('.panel')];
const navigation = [...document.querySelectorAll('nav [data-page]')];
const carousel = document.querySelector('#carousel');
const cubeButton = document.querySelector('#cube-button');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const duration = 560;
const colors = ['#79e5ff', '#bca4ff', '#ff9bbb', '#ffd184', '#8af2b7'];
let current = 0;
let angle = 0;
let transitionStart = 0;
let animationFrame;
let cube;
let turnCount = 0;
let render3D = () => {};
// Each module has a fixed final pose. These are visual states, not Rubik's Cube rules.
const poses = [
  { rotation: [.30, .60, -.10], layers: [0, 0, 0], spread: 1 },
  { rotation: [1.87, .60, .08], layers: [0, Math.PI/2, 0], spread: 1.04 },
  { rotation: [-1.27, 2.17, -.12], layers: [Math.PI/2, 0, -Math.PI/2], spread: 1.06 },
  { rotation: [.30, 3.74, .15], layers: [0, -Math.PI/2, 0], spread: 1.1 },
  { rotation: [.30, -.97, -.08], layers: [-Math.PI/2, 0, Math.PI/2], spread: 1.04 },
];
let fromPose = structuredClone(poses[0]);
let displayedPose = structuredClone(fromPose);
let targetPose = structuredClone(fromPose);
panels.forEach((panel, index) => {
  panel.style.transform = `rotateY(${index * 72}deg) translateZ(calc(var(--radius) + 2px))`;
  panel.style.setProperty('--accent', colors[index]);
  navigation[index].style.setProperty('--accent', colors[index]);
});
// A continuous cylindrical surface shares the exact rotation of its HTML content.
// Sixty narrow facets avoid the pentagonal silhouette of five flat cards.
for (let i = 0; i < 60; i++) {
  const facet = document.createElement('div');
  facet.className = 'ring-facet';
  facet.setAttribute('aria-hidden', 'true');
  const sector = Math.floor((i + 6) / 12) % 5;
  const color = colors[sector];
  facet.style.setProperty('--sector', color);
  facet.style.transform = `rotateY(${i * 6}deg) translateZ(var(--radius))`;
  facet.style.background = `linear-gradient(180deg,${color}35,${color}08 35%,${color}12 75%,${color}30),#0c152b`;
  carousel.prepend(facet);
}

function selectPage(index, updateHash = true) {
  const target = (index + panels.length) % panels.length;
  if (target === current) return;
  const focusWasInPanel = panels.some(panel => panel.contains(document.activeElement));
  let steps = target - current;
  if (steps > 2) steps -= 5;
  if (steps < -2) steps += 5;
  angle -= steps * 72;
  current = target;
  carousel.style.transition = reduceMotion.matches ? 'none' : `transform ${duration}ms cubic-bezier(.45,0,.2,1)`;
  carousel.style.transform = `translateZ(calc(-1 * var(--radius))) rotateX(-9deg) rotateY(${angle}deg)`;
  document.documentElement.style.setProperty('--accent', colors[current]);
  panels.forEach((panel, i) => {
    panel.classList.toggle('active', i === current);
    panel.inert = i !== current;
    panel.setAttribute('aria-hidden', String(i !== current));
  });
  navigation.forEach((button, i) => {
    if (i === current) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelector('#large-index').textContent = String(current + 1).padStart(2, '0');
  document.querySelector('#page-status').textContent = `${String(current + 1).padStart(2, '0')} / 05 · ${names[current]}`;
  cubeButton.setAttribute('aria-label', `转动魔方，查看${names[(current + 1) % 5]}`);
  if (focusWasInPanel) navigation[current].focus({ preventScroll: true });
  if (updateHash) history.replaceState(null, '', `#${panels[current].id}`);
  fromPose = structuredClone(displayedPose);
  targetPose = structuredClone(poses[current]);
  // Choose the nearest equivalent final orientation, then alternate full X/Y flips.
  // Unwrapped angles let a new click interrupt smoothly without resetting the cube.
  const fullTurn = Math.PI * 2;
  targetPose.rotation = targetPose.rotation.map((n, i) => n + Math.round((fromPose.rotation[i] - n) / fullTurn) * fullTurn);
  const axis = turnCount++ % 2;
  targetPose.rotation[axis] += (steps < 0 ? -1 : 1) * fullTurn;
  transitionStart = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(animate);
}

function animate(now) {
  const t = reduceMotion.matches ? 1 : Math.min(1, (now - transitionStart) / duration);
  const eased = t < .5 ? 4*t*t*t : 1 - (-2*t+2)**3/2;
  const destination = targetPose;
  const mix = (a, b) => a + (b - a) * eased;
  displayedPose = {
    rotation: fromPose.rotation.map((n, i) => mix(n, destination.rotation[i])),
    layers: fromPose.layers.map((n, i) => mix(n, destination.layers[i]) + Math.sin(t * Math.PI) * (i - 1) * .7),
    spread: mix(fromPose.spread, destination.spread) + Math.sin(t * Math.PI) * .12,
  };
  renderPose();
  animationFrame = t < 1 ? requestAnimationFrame(animate) : undefined;
}

function renderPose() {
  if (cube) {
    cube.rotation.set(...displayedPose.rotation);
    cube.children.forEach((layer, i) => {
      layer.rotation.y = displayedPose.layers[i];
      layer.position.y = (i - 1) * .66 * displayedPose.spread;
    });
  }
  render3D();
}

document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => selectPage(Number(button.dataset.page))));
cubeButton.addEventListener('click', () => selectPage(current + 1));
document.querySelector('#next').addEventListener('click', () => selectPage(current + 1));
document.querySelector('#previous').addEventListener('click', () => selectPage(current - 1));
function readHash() {
  const index = panels.findIndex(panel => `#${panel.id}` === location.hash);
  if (index >= 0) selectPage(index, false);
}
addEventListener('hashchange', readHash);
reduceMotion.addEventListener('change', () => {
  if (reduceMotion.matches && animationFrame) {
    cancelAnimationFrame(animationFrame);
    animate(performance.now());
  }
});
readHash();

try {
  const THREE = await import('./vendor/three.module.js');
  const canvas = document.querySelector('#world');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 50);
  camera.position.set(0, 2.2, 8.2);
  camera.lookAt(0, -.12, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(3, 5, 4);
  scene.add(light);
  const rimLight = new THREE.PointLight(0x7976ff, 24, 15);
  rimLight.position.set(-3, 1, -2);
  scene.add(rimLight);
  cube = new THREE.Group();
  cube.scale.setScalar(1.30);
  const geometry = new THREE.BoxGeometry(.58, .58, .58);
  const edgeGeometry = new THREE.EdgesGeometry(geometry);
  const faceColors = [0xff544f, 0x2075ef, 0xffdb38, 0x21cb84, 0xff8a27, 0xf6f2ff];
  const materials = faceColors.map(color => new THREE.MeshStandardMaterial({ color, metalness:.12, roughness:.34 }));
  const edgeMaterial = new THREE.LineBasicMaterial({ color:0xd6eaff, transparent:true, opacity:.35 });
  for (let y = -1; y <= 1; y++) {
    const layer = new THREE.Group();
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) {
      const blockMaterials = materials.map((_, face) => materials[(face + x + y * 2 + z + 12) % 6]);
      const block = new THREE.Mesh(geometry, blockMaterials);
      block.position.set(x * .66, 0, z * .66);
      block.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));
      layer.add(block);
    }
    layer.position.y = y * .66;
    cube.add(layer);
  }
  scene.add(cube);
  for (const [radius, color, opacity] of [[1.8,0x70dfff,.48],[2.05,0xbd80ff,.35]]) {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(radius,.012,6,100),new THREE.MeshBasicMaterial({color,transparent:true,opacity}));
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -1.88;
    scene.add(halo);
  }
  render3D = () => renderer.render(scene, camera);
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render3D();
  };
  new ResizeObserver(resize).observe(canvas.parentElement);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    document.querySelector('.cube-fallback').hidden = false;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    document.querySelector('.cube-fallback').hidden = true;
    resize();
  });
  renderPose();
} catch (error) {
  console.error('3D preview unavailable:', error);
  document.querySelector('.cube-fallback').hidden = false;
  document.querySelector('.cube-hint').firstChild.textContent = '3D 暂不可用，仍可点击切换模块';
}
