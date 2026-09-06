import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { CAPTAIN, JellyState } from '../src/captain-physics.js';
import { subdivide, linkNormals, smoothNormals } from '../src/captain-geometry.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const captain = JSON.parse(read('../src/assets/captain.json'));
assert.equal(captain.name, 'Captain');
assert.equal(CAPTAIN.stretch, .16);
assert.equal(CAPTAIN.spring, 200);
assert.equal(CAPTAIN.damping, 3.5);
assert.ok(Object.isFrozen(CAPTAIN));

// Exercise a sustained drag, release, and full settling at the production time step.
for (const direction of [[1, 0, 0], [0, -1, 0], [0, 0, 1], [1, 1, 1]]) {
  const state = new JellyState();
  state.held = true;
  state.desired.fromArray(direction).normalize().multiplyScalar(CAPTAIN.limit);
  for (let i = 0; i < 360; i++) state.step(1 / 120);
  assert.ok(state.pull.distanceTo(state.desired) < .001);
  state.release();
  for (let i = 0; i < 2400; i++) {
    state.step(1 / 120);
    assert.ok([...state.pull, ...state.sway, state.hop, state.squash].every(Number.isFinite));
    assert.ok(state.hop >= 0);
  }
  assert.ok(state.pull.length() + state.sway.length() + state.hop + Math.abs(state.squash) < .0001);
}

// Check exported topology and the shared arm normals without requiring a GPU.
const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (const part of captain.parts) for (let i = 0; i < part.positions.length; i++) {
  min[i % 3] = Math.min(min[i % 3], part.positions[i]);
  max[i % 3] = Math.max(max[i % 3], part.positions[i]);
}
const center = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];
const body = new THREE.Group();
for (const part of captain.parts) {
  assert.equal(part.uvs.length, part.positions.length / 3 * 2);
  assert.ok(part.indices.every((index) => Number.isInteger(index) && index >= 0 && index < part.positions.length / 3));
  if (part.refined) assert.equal(part.armWeights.length, part.positions.length / 3);
  const mesh = new THREE.Mesh(subdivide(part, center, 2.65 / (max[1] - min[1])), part.materials.map((data) => new THREE.MeshBasicMaterial({ name: data.name })));
  mesh.userData.base = mesh.geometry.attributes.position.array.slice();
  if (part.refined) mesh.userData.armWeights = part.armWeights;
  body.add(mesh);
}
linkNormals(body);
assert.ok(body.userData.normalLinks.length > 0);
const source = read('../src/captain-viewer.js');
const deformation = source.slice(source.indexOf('function deform(){'), source.indexOf('let active=false'));
const deform = new Function('THREE', 'CAPTAIN', 'physics', 'body', 'smoothNormals', `
  const {pull,grab,sway}=physics,clock=0,reducedMotion=true;
  const contactShadow={material:{},scale:{setScalar(){}}};
  ${deformation}
  deform();
`);
for (const direction of [[0,0,0], [1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1]]) {
  const state = new JellyState();
  state.pull.fromArray(direction).multiplyScalar(CAPTAIN.limit);
  deform(THREE, CAPTAIN, state, body, smoothNormals);
  for (const mesh of body.children) {
    const { position, normal } = mesh.geometry.attributes;
    assert.ok(position.array.every(Number.isFinite));
    for (let i = 0; i < normal.count; i++) assert.ok(Math.abs(Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i)) - 1) < .0001);
  }
}
for (const page of ['index', 'mobile']) {
  const html = read(`../${page}.html`);
  assert.equal((html.match(/id="character-preview"/g) || []).length, 1);
  assert.equal((html.match(/href="#character-preview"/g) || []).length, 2);
  assert.ok(html.indexOf('id="character-preview"') < html.indexOf('id="gallery"'));
  assert.ok(html.includes('Customize your character’s look in-game.'));
}
console.log('Captain: fixed settings, release stability, mesh integrity, seven deformation directions, and both page anchors passed.');
