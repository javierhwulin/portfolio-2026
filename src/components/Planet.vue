<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import * as THREE from 'three';

const container = ref(null);
const props = defineProps({
  backgroundColor: {
    type: String,
    required: true,
  },
  fitPadding: {
    type: Number,
    default: 1.15,
  },
});

let renderer, scene, camera, frameId;
let planet, ring, moon, moonOrbit;
let rootGroup;
let orbitAngle = 0;
let isVisible = true;
let intersectionObserver;
let prefersReducedMotion;

function init() {
  // Renderer

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(container.value.clientWidth, container.value.clientHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.value.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(props.backgroundColor);

  camera = new THREE.PerspectiveCamera(45, container.value.clientWidth / container.value.clientHeight, 0.1, 100);
  camera.position.set(0, 1.2, 6);
  scene.add(camera);

  rootGroup = new THREE.Group();
  scene.add(rootGroup);

  // Lights
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
  keyLight.position.set(5, 5, 3);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xffe9b1, 1.25);
  rimLight.position.set(-6, 2, -4);
  scene.add(rimLight);

  const fill = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(fill);

  const planetGeo = new THREE.SphereGeometry(1.65, 96, 96);
  const planetMat = new THREE.MeshPhysicalMaterial({
    color: 0xfafafa,
    roughness: 0.5,
    metalness: 0.05,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
  });

  planet = new THREE.Mesh(planetGeo, planetMat);
  planet.position.set(0, -0.15, 0);
  rootGroup.add(planet);

  const ringGeo = new THREE.TorusGeometry(2.2, 0.055, 24, 200);
  const ringMat = new THREE.MeshPhysicalMaterial({
    color: 0xd9a441,
    metalness: 1.0,
    roughness: 0.22,
    clearcoat: 0.7,
    transmission: 0.04,
  });

  ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(planet.position);
  ring.rotation.x = THREE.MathUtils.degToRad(100);
  ring.rotation.z = THREE.MathUtils.degToRad(-25);
  rootGroup.add(ring);

  moonOrbit = new THREE.Group();
  moonOrbit.position.copy(planet.position);
  moonOrbit.rotation.x = THREE.MathUtils.degToRad(12);
  rootGroup.add(moonOrbit);

  const moonGeo = new THREE.SphereGeometry(0.36, 48, 48);
  const moonMat = new THREE.MeshPhysicalMaterial({
    color: 0xd9a441,
    metalness: 1.0,
    roughness: 0.24,
    clearcoat: 0.7,
  });

  moon = new THREE.Mesh(moonGeo, moonMat);
  moon.position.set(3.1, 1.1, 0);
  moonOrbit.add(moon);

  frameScene();
  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  if (!container.value) return;
  const { clientWidth, clientHeight } = container.value;
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(clientWidth, clientHeight);
  frameScene();
}

function frameScene() {
  if (!rootGroup || !camera) return;
  const box = new THREE.Box3().setFromObject(rootGroup);
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);

  const distV = sphere.radius / Math.tan(vFov / 2);
  const distH = sphere.radius / Math.tan(hFov / 2);
  const distance = Math.max(distV, distH) * props.fitPadding;

  const direction = new THREE.Vector3().subVectors(camera.position, sphere.center).normalize();
  camera.position.copy(direction.multiplyScalar(distance).add(sphere.center));
  camera.near = Math.max(0.1, distance - sphere.radius * 2);
  camera.far = distance + sphere.radius * 4;
  camera.lookAt(sphere.center);
  camera.updateProjectionMatrix();
}

function tick() {
  if (prefersReducedMotion?.matches || !isVisible) {
    frameId = undefined;
    return;
  }

  frameId = requestAnimationFrame(tick);
  // Moon orbit
  orbitAngle += 0.003;
  moonOrbit.rotation.y = orbitAngle;
  moon.position.y = 1.1 + Math.sin(orbitAngle * 0.5) * 0.18;

  renderer.render(scene, camera);
}

function startAnimation() {
  if (frameId != null) return;
  frameId = requestAnimationFrame(tick);
}

function stopAnimation() {
  if (frameId == null) return;
  cancelAnimationFrame(frameId);
  frameId = undefined;
}

onMounted(() => {
  init();

  prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handlePRM = () => {
    if (prefersReducedMotion.matches) {
      stopAnimation();
      renderer.render(scene, camera);
    } else if (isVisible) {
      startAnimation();
    }
  };
  prefersReducedMotion.addEventListener?.('change', handlePRM);

  intersectionObserver = new IntersectionObserver((entries) => {
    const entry = entries[0];
    isVisible = Boolean(entry?.isIntersecting);
    if (isVisible && !prefersReducedMotion.matches) {
      startAnimation();
    } else {
      stopAnimation();
      renderer.render(scene, camera);
    }
  }, { threshold: 0.1 });
  if (container.value) intersectionObserver.observe(container.value);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAnimation();
    } else if (isVisible && !prefersReducedMotion.matches) {
      startAnimation();
    }
  });

  // Initial start
  if (!prefersReducedMotion.matches) {
    startAnimation();
  } else {
    renderer.render(scene, camera);
  }
});
onBeforeUnmount(() => {
  stopAnimation();
  window.removeEventListener('resize', onWindowResize);
  prefersReducedMotion?.removeEventListener?.('change', () => {});
  intersectionObserver?.disconnect?.();
  renderer?.dispose?.();
});

</script>

<template>
  <div ref="container" class="w-full h-full"></div>
</template>

<style scoped>
:host, .w-full.h-full {
  width: 100%;
  height: 100%;
  display: block;
}
</style>