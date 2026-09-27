'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/editor/core.js');

const object = (type, id, properties = {}) => C.createObject(type, {id, ...properties});
const find = (project, id) => project.objects.find(item => item.id === id);
test('overlapping selection sources never transform an object twice', () => {
  const p = C.createProject();
  p.objects = [object('rect', 'one'), object('rect', 'two')];
  const start = C.clone(p.objects[0].m);
  assert.deepEqual(C.topIds(p, ['one', 'one', 'two']), ['one', 'two']);
  C.transformObjects(p, ['one', 'one'], C.translate(10, 0));
  assert.equal(p.objects[0].m[4], start[4] + 10);
  assert.throws(() => C.group(p, ['one', 'one']), /至少两个/);
});
function matrixEqual(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-8,
    `matrix component ${index}: ${value} != ${expected[index]}`));
}

test('ungroup preserves nested world geometry, identities and sibling order', () => {
  const p = C.createProject();
  p.objects = [
    object('group', 'outer', {m: C.around(0, 0, 2, 3, 23)}),
    object('rect', 'back', {parentId: 'outer'}),
    object('group', 'bundle', {parentId: 'outer', m: C.translate(27, 41)}),
    object('text', 'text', {parentId: 'bundle', text: 'Editable text'}),
    object('path', 'curve', {parentId: 'bundle', nodes: [
      {x: 0, y: 0, outX: 20, outY: 40}, {x: 80, y: 0, inX: 60, inY: 40}
    ]}),
    object('rect', 'front', {parentId: 'outer'})
  ];
  const geometry = ['text', 'curve'].map(id => C.worldMatrix(p, find(p, id)));
  const nodes = C.clone(find(p, 'curve').nodes);
  assert.deepEqual(C.ungroup(p, 'bundle'), ['text', 'curve']);
  assert.equal(p.objects.length, 5);
  assert.equal(new Set(p.objects.map(item => item.id)).size, 5);
  assert.deepEqual(p.objects.filter(item => item.parentId === 'outer').map(item => item.id),
    ['back', 'text', 'curve', 'front']);
  ['text', 'curve'].forEach((id, index) => matrixEqual(C.worldMatrix(p, find(p, id)), geometry[index]));
  assert.deepEqual(find(p, 'curve').nodes, nodes);
  assert.equal(find(p, 'text').text, 'Editable text');
  assert.doesNotThrow(() => C.validateProject(p));
});

test('ungroup preserves hidden state and removes obsolete animation target', () => {
  const p = C.createProject();
  p.objects = [object('group', 'bundle', {visible: false, opacity: 0.5}),
    object('rect', 'child', {parentId: 'bundle', opacity: 0.6})];
  p.animation.objectIds = ['bundle', 'child'];
  C.ungroup(p, 'bundle');
  assert.equal(find(p, 'child').visible, false);
  assert.equal(find(p, 'child').opacity, 0.3);
  assert.deepEqual(p.animation.objectIds, ['child']);
  assert.doesNotThrow(() => C.validateProject(p));
});

test('deleting an ancestor of a locked object preserves the complete subtree', () => {
  const p = C.createProject();
  p.objects = [object('group', 'outer', {m: C.translate(300, 500)}),
    object('group', 'inner', {parentId: 'outer', m: C.around(0, 0, 2, 2, 15)}),
    object('rect', 'locked', {parentId: 'inner', locked: true}),
    object('text', 'sibling', {parentId: 'outer'})];
  const before = C.clone(p);
  C.remove(p, ['outer']);
  assert.deepEqual(p, before);
  matrixEqual(C.worldMatrix(p, find(p, 'locked')), C.worldMatrix(before, find(before, 'locked')));
});

test('mixed deletion removes eligible roots and keeps protected roots and resources', () => {
  const p = C.createProject();
  p.assets.pixel = {id: 'pixel', mime: 'image/png', name: 'pixel.png',
    data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII='};
  p.objects = [object('group', 'protected'), object('rect', 'locked', {parentId: 'protected', locked: true}),
    object('image', 'removable', {assetId: 'pixel'})];
  p.animation.objectIds = ['protected', 'removable'];
  C.remove(p, ['protected', 'removable']);
  assert.deepEqual(p.objects.map(item => item.id), ['protected', 'locked']);
  assert.deepEqual(p.animation.objectIds, ['protected']);
  assert.ok(p.assets.pixel, 'retained assets remain available to undo and stickers');
  assert.doesNotThrow(() => C.validateProject(p));
});

test('regeneration retains manual parent, transform, visibility and lock while updating geometry', () => {
  const p = C.createProject();
  const module = {id: 'shapes', version: 1, generate: ({params}) => [
    object('ellipse', 'fresh', {generatorKey: 'primary', w: params.width})
  ]};
  C.regenerate(p, module, {width: 80, seed: 1});
  const generated = p.objects[0], stableId = generated.id;
  p.objects.push(object('group', 'manual', {m: C.around(0, 0, 2, 3, 31)}));
  generated.parentId = 'manual';
  generated.m = C.translate(42, 73);
  generated.visible = false;
  generated.locked = true;
  const before = C.worldMatrix(p, generated);
  C.regenerate(p, module, {width: 120, seed: 2});
  const updated = find(p, stableId);
  assert.equal(updated.parentId, 'manual');
  matrixEqual(C.worldMatrix(p, updated), before);
  assert.equal(updated.w, 120);
  assert.equal(updated.visible, false);
  assert.equal(updated.locked, true);
  assert.equal(find(p, 'manual').type, 'group');
  assert.doesNotThrow(() => C.validateProject(p));
});

test('regeneration remaps generated child parents when generator allocates fresh IDs', () => {
  const p = C.createProject();
  let generation = 0;
  const module = {id: 'nested', version: 1, generate: () => {
    const suffix = ++generation;
    return [object('group', `group_${suffix}`, {generatorKey: 'group'}),
      object('rect', `child_${suffix}`, {parentId: `group_${suffix}`, generatorKey: 'child'})];
  }};
  C.regenerate(p, module, {});
  const originalIds = p.objects.map(item => item.id);
  C.regenerate(p, module, {});
  assert.deepEqual(p.objects.map(item => item.id), originalIds);
  assert.equal(p.objects[1].parentId, p.objects[0].id);
  assert.doesNotThrow(() => C.validateProject(p));
});

test('removing a generated parent preserves surviving generated and user geometry', () => {
  const p = C.createProject();
  const module = {id: 'nested', version: 1, generate: ({params}) => {
    const child = object('rect', 'new_child', {generatorKey: 'child'});
    if (!params.withParent) return [child];
    child.parentId = 'new_group';
    return [object('group', 'new_group', {generatorKey: 'group', m: C.translate(200, 300)}), child];
  }};
  C.regenerate(p, module, {withParent: true});
  const parent = p.objects.find(item => item.generatorKey === 'group');
  const child = p.objects.find(item => item.generatorKey === 'child');
  p.objects.push(object('text', 'user_text', {parentId: parent.id}));
  const childBefore = C.worldMatrix(p, child);
  const userBefore = C.worldMatrix(p, find(p, 'user_text'));
  C.regenerate(p, module, {withParent: false});
  matrixEqual(C.worldMatrix(p, find(p, child.id)), childBefore);
  matrixEqual(C.worldMatrix(p, find(p, 'user_text')), userBefore);
  assert.equal(find(p, child.id).parentId, null);
  assert.equal(find(p, 'user_text').parentId, null);
  assert.doesNotThrow(() => C.validateProject(p));
});

test('generator receives seed zero unchanged and missing seed defaults to one', () => {
  const p = C.createProject(), seeds = [];
  const module = {id: 'seeded', version: 1, generate: ({seed}) => {seeds.push(seed); return [];}};
  C.regenerate(p, module, {seed: 0});
  assert.equal(p.style.params.seeded.seed, 0);
  C.regenerate(p, module, {});
  assert.deepEqual(seeds, [0, 1]);
});

test('project round trip retains hidden geometry and rejects missing image resources', () => {
  const p = C.createProject();
  p.objects = [object('group', 'hidden', {visible: false}),
    object('path', 'path', {parentId: 'hidden', nodes: [
      {x: 0, y: 0, outX: 15, outY: 25}, {x: 100, y: 0, inX: 85, inY: 25}
    ]})];
  const restored = C.validateProject(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(restored, p);
  assert.equal(C.isVisible(restored, find(restored, 'path')), false);
  const invalid = C.clone(restored);
  invalid.objects.push(object('image', 'image', {assetId: 'missing'}));
  assert.throws(() => C.validateProject(invalid), /图片素材丢失/);
  assert.deepEqual(restored, p, 'failed validation must not mutate the valid project');
});
