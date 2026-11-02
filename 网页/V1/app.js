const names = ['个人简介', '教育背景', '项目经历', '专业技能', '联系方式'];
const panels = [...document.querySelectorAll('.panel')];
const navigation = [...document.querySelectorAll('nav [data-page]')];
const carousel = document.querySelector('#carousel');
const cubeButton = document.querySelector('#cube-button');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let current = 0;
let angle = 0;
let transitionStart = 0;
let animationFrame;
let cube;
let render3D = () => {};
let fromPose = { rotation: [0, 0, 0], layers: [0, 0, 0], spread: 1 };
let displayedPose = structuredClone(fromPose);
// Each module has a fixed final pose. These are visual states, not Rubik's Cube rules.
const poses = [
  { rotation: [.30, .60, -.10], layers: [0, 0, 0], spread: 1 },
  { rotation: [.22, 1.00, .08], layers: [0, .32, -.32], spread: 1.1 },
  { rotation: [.42, 1.65, -.12], layers: [.65, 0, -.65], spread: 1.05 },
  { rotation: [.20, 2.30, .15], layers: [.30, -.30, .30], spread: 1.18 },
  { rotation: [.38, 3.15, -.08], layers: [-.42, 0, .42], spread: 1.06 },
];
panels.forEach((panel, index) => { panel.style.transform = `rotateY(${index * 72}deg) translateZ(var(--radius))`; });

function selectPage(index, updateHash = true) {
  const target = (index + panels.length) % panels.length;
  if (target === current && animationFrame) return;
  const focusWasInPanel = panels.some(panel => panel.contains(document.activeElement));
  let steps = target - current;
  if (steps > 2) steps -= 5;
  if (steps < -2) steps += 5;
  angle -= steps * 72;
  current = target;
  carousel.style.transition = reduceMotion.matches ? 'none' : 'transform 850ms cubic-bezier(.22,.8,.24,1)';
  carousel.style.transform = `translateZ(calc(-1 * var(--radius))) rotateY(${angle}deg)`;
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
  transitionStart = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(animate);
}

function animate(now) {
  const t = reduceMotion.matches ? 1 : Math.min(1, (now - transitionStart) / 850);
  const eased = 1 - (1 - t) ** 3;
  const destination = poses[current];
  const mix = (a, b) => a + (b - a) * eased;
  displayedPose = {
    rotation: fromPose.rotation.map((n, i) => mix(n, destination.rotation[i])),
    layers: fromPose.layers.map((n, i) => mix(n, destination.layers[i]) + Math.sin(t * Math.PI) * (i - 1) * .7),
    spread: mix(fromPose.spread, destination.spread) + Math.sin(t * Math.PI) * .12,
  };
  if (cube) {
    cube.rotation.set(...displayedPose.rotation);
    cube.children.forEach((layer, i) => {
      layer.rotation.y = displayedPose.layers[i];
      layer.position.y = (i - 1) * .66 * displayedPose.spread;
    });
  }
  render3D();
  animationFrame = t < 1 ? requestAnimationFrame(animate) : undefined;
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
reduceMotion.addEventListener('change', () => selectPage(current, false));
selectPage(0, false);
readHash();

try {
  const THREE = await import('./vendor/three.module.js');
  const canvas = document.querySelector('#world');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 50);
  camera.position.set(0, 2.2, 8.7);
  camera.lookAt(0, -.12, 0);
  scene.add(new THREE.AmbientLight(0x97ddea, 2));
  const light = new THREE.DirectionalLight(0xc1fff6, 4);
  light.position.set(3, 5, 4);
  scene.add(light);
  const rimLight = new THREE.PointLight(0x7976ff, 24, 15);
  rimLight.position.set(-3, 1, -2);
  scene.add(rimLight);
  cube = new THREE.Group();
  const geometry = new THREE.BoxGeometry(.58, .58, .58);
  const edgeGeometry = new THREE.EdgesGeometry(geometry);
  const faceColors = [0x1b6974, 0x143a56, 0x38969a, 0x162d47, 0x21616b, 0x233e60];
  const materials = faceColors.map(color => new THREE.MeshStandardMaterial({ color, metalness:.65, roughness:.3 }));
  const edgeMaterial = new THREE.LineBasicMaterial({ color:0x9bfff0, transparent:true, opacity:.8 });
  for (let y = -1; y <= 1; y++) {
    const layer = new THREE.Group();
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) {
      const block = new THREE.Mesh(geometry, materials);
      block.position.set(x * .66, 0, z * .66);
      block.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));
      layer.add(block);
    }
    layer.position.y = y * .66;
    cube.add(layer);
  }
  scene.add(cube);
  for (const [radius, opacity] of [[1.55,.32],[1.75,.12]]) {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(radius,.008,6,100),new THREE.MeshBasicMaterial({color:0x83f8ed,transparent:true,opacity}));
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -1.52;
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
  selectPage(current, false);
} catch (error) {
  console.error('3D preview unavailable:', error);
  document.querySelector('.cube-fallback').hidden = false;
  document.querySelector('.cube-hint').firstChild.textContent = '3D 暂不可用，仍可点击切换模块';
}
