(function (root) {
  const rules = {
    lampOrder: [1, 0, 2],
    weights: [2, 4, 1],
    focus: [2, 1, 3],
    matches: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
    obstacleHit(x, y, obstacles) { return obstacles.some(o => Math.abs(x - o) < 37 && y < 35); },
    validSave(s) {
      return !!s && s.version === 1 && Number.isInteger(s.act) && s.act >= 0 && s.act <= 4 &&
        typeof s.flags === 'object' && s.flags !== null && Array.isArray(s.notes);
    }
  };
  if (typeof module !== 'undefined') module.exports = rules;
  else root.Rules = rules;
})(globalThis);
