const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
// Compile only for this test process; production still uses Vite and tsc.
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename)
const { computeProgression, levelForXp, PROFILE_EMBLEMS, isEmblemUnlocked } = require('../src/lib/progression.ts')
const trade = (overrides = {}) => ({ trade_date: '2026-01-01', net_pnl: 0, entry_price: 100, exit_price: 100, qty: 1, point_value: 1, ...overrides })
assert.equal(computeProgression([], []).totalXp, 0)
assert.equal(computeProgression([trade()], []).logging, 60)
assert.equal(computeProgression(Array.from({ length: 100 }, () => trade()), []).logging, 150)
assert.equal(computeProgression([trade(), trade({ trade_date: '2026-01-02' })], []).logging, 120)
assert.equal(computeProgression([], [{ badge_id: 'first_trade' }, { badge_id: 'first_trade' }]).achievements, 100)
assert.equal(computeProgression([trade({ net_pnl: 1000 })], []).profitability, 750)
assert.equal(computeProgression([trade({ net_pnl: 1000 }), trade({ net_pnl: -1000 })], []).profitability, 0)
assert.equal(computeProgression([trade({ entry_price: 1e10, exit_price: 1e10 })], []).volume, 1250)
assert.equal(computeProgression([], [], 365).loyalty, 9125)
for (let i = 0; i < 12; i++) {
  const thresholds = require('../src/lib/progression.ts').LEVEL_THRESHOLDS
  assert.equal(levelForXp(thresholds[i]).level, i + 1)
  if (i > 0) assert.equal(levelForXp(thresholds[i] - 1).level, i)
}
assert.equal(levelForXp(130000).next, null)
const highXp = { ...computeProgression([], []), totalXp: 130000 }
assert.equal(isEmblemUnlocked(PROFILE_EMBLEMS.find(e => e.id === 'veteran'), highXp), false)
assert.equal(isEmblemUnlocked(PROFILE_EMBLEMS.find(e => e.id === 'veteran'), { ...highXp, visits: 365 }), true)
assert.equal(isEmblemUnlocked(PROFILE_EMBLEMS.find(e => e.id === 'profit'), { ...highXp, netProfit: 100000, tradingDays: 99 }), false)
assert.equal(isEmblemUnlocked(PROFILE_EMBLEMS.find(e => e.id === 'legend'), { ...highXp, tradingDays: 500 }), true)
console.log('Progression tests passed: caps, tiers, losses, badge deduplication, level boundaries, and emblem qualifications.')
