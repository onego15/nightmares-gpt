const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../rules');
test('lighting puzzle rejects a correct set in the wrong order', () => {
  assert.equal(R.matches([0,1,2],R.lampOrder),false);
  assert.equal(R.matches([1,0],R.lampOrder),false);
  assert.equal(R.matches([1,0,2],R.lampOrder),true);
});
test('counterweights and focus have different solutions', () => {
  assert.equal(R.matches([2,4,1],R.weights),true);
  assert.equal(R.matches([2,4,1],R.focus),false);
  assert.equal(R.matches([2,1,3],R.focus),true);
});
test('jump clearance and horizontal bounds determine collision', () => {
  assert.equal(R.obstacleHit(1150,0,[1150]),true);
  assert.equal(R.obstacleHit(1150,36,[1150]),false);
  assert.equal(R.obstacleHit(1200,0,[1150]),false);
});
test('save loading rejects corrupt or unsupported data', () => {
  for(const save of [null,{}, {version:2,act:0,flags:{},notes:[]},{version:1,act:5,flags:{},notes:[]},{version:1,act:-1,flags:{},notes:[]},{version:1,act:1,flags:null,notes:[]}]) assert.equal(R.validSave(save),false);
  assert.equal(R.validSave({version:1,act:4,flags:{final:true},notes:[1,2]}),true);
});
