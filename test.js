// Integration test: node test.js  (uses a temporary database)
process.env.DB_PATH = require('node:path').join(require('node:os').tmpdir(), 'ls-test-' + Date.now() + '.db');
process.env.JWT_SECRET = "test-secret"; process.env.NO_SYNC = "1";
const assert = require('node:assert/strict');
const server = require('./server');

server.listen(0, async () => {
  const base = 'http://127.0.0.1:' + server.address().port;
  const call = async (m, p, b, t) => {
    const r = await fetch(base + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined });
    return { s: r.status, j: await r.json().catch(() => ({})) };
  };

  try {
    // 1. Auth & login checks
    assert.equal((await call('POST', '/api/auth/login', { username: 'admin', password: 'nope' })).s, 401);
    const off = (await call('POST', '/api/auth/login', { username: 'officer', password: 'officer123' })).j;
    const adm = (await call('POST', '/api/auth/login', { username: 'admin', password: 'admin123' })).j;
    assert.ok(off.token && adm.token);

    // 2. Signup
    const su = await call('POST', '/api/auth/signup', { name: 'Test Resident', username: 'res_one', password: 'longpassword', phone: '+919999999999', zone: 8 });
    assert.equal(su.s, 201); assert.equal(su.j.user.r, 'Public');
    assert.equal((await call('POST', '/api/auth/signup', { name: 'X', username: 'res_one', password: 'longpassword' })).s, 400);
    const rt = su.j.token;

    // 3. Password change endpoint
    assert.equal((await call('POST', '/api/auth/password', { old_password: 'wrong', new_password: 'newpassword123' }, rt)).s, 401, 'rejects wrong old password');
    assert.equal((await call('POST', '/api/auth/password', { old_password: 'longpassword', new_password: 'short' }, rt)).s, 400, 'rejects short new password');
    assert.equal((await call('POST', '/api/auth/password', { old_password: 'longpassword', new_password: 'brandnewpassword123' }, rt)).s, 200, 'accepts valid password update');
    assert.equal((await call('POST', '/api/auth/login', { username: 'res_one', password: 'brandnewpassword123' })).s, 200, 'new password works for login');

    // 4. Citizen reports & community loop
    assert.equal((await call('GET', '/api/reports')).s, 401);
    const rp = await call('POST', '/api/reports', { zone: 8, hazard: 'Rockfall' }, rt);
    assert.equal(rp.s, 201); assert.equal(rp.j.st, 'Pending');
    assert.equal((await call('GET', '/api/reports', null, rt)).j.length, 1, 'resident sees only own reports');
    assert.ok((await call('GET', '/api/reports', null, off.token)).j.length >= 3, 'officer sees all');
    assert.equal((await call('PATCH', '/api/reports/' + rp.j.dbid, { status: 'Verified' }, rt)).s, 403);
    const vrf = await call('PATCH', '/api/reports/' + rp.j.dbid, { status: 'Verified' }, off.token);
    assert.equal(vrf.j.st, 'Verified');
    assert.ok(vrf.j.updated_zone_risk, 'closing community loop: verification returns updated zone risk');

    // 5. Check-ins
    assert.equal((await call('POST', '/api/checkins', { kind: 'help' }, rt)).s, 201);
    assert.equal((await call('GET', '/api/checkins', null, rt)).s, 403);
    assert.equal((await call('GET', '/api/checkins', null, off.token)).j.length, 1);

    // 6. Alerts & zone cooldown
    const al = await call('POST', '/api/alerts', { zone: 8, level: 3, message: 'LANDSAFE CRITICAL: test' }, off.token);
    assert.equal(al.s, 201); assert.equal(al.j.texted, 1, 'registered resident in zone 8 is texted');
    assert.equal((await call('POST', '/api/alerts', { zone: 8, level: 3, message: 'x' }, rt)).s, 403);

    // Immediate repeat alert in same zone hits cooldown (429)
    const al2 = await call('POST', '/api/alerts', { zone: 8, level: 3, message: 'LANDSAFE CRITICAL: spam' }, off.token);
    assert.equal(al2.s, 429, 'zone alert cooldown protects residents from repeated spam');

    // Admin can force alert if necessary
    const alForce = await call('POST', '/api/alerts', { zone: 8, level: 3, message: 'LANDSAFE CRITICAL: forced emergency', force: true }, adm.token);
    assert.equal(alForce.s, 201, 'admin can bypass cooldown with force flag in emergencies');

    // 7. Security: /send is restricted to Admin only
    assert.equal((await call('POST', '/send', { to: '+919999999999', message: 'test' }, off.token)).s, 403, 'field officer cannot access /send');
    assert.equal((await call('POST', '/send', { to: '+919999999999', message: 'test' }, adm.token)).s, 200, 'admin can access /send');

    // 8. User role management
    assert.equal((await call('GET', '/api/users', null, off.token)).s, 403);
    assert.equal((await call('PATCH', '/api/users/res_one/role', { role: 'Field Officer' }, adm.token)).s, 200);

    // 9. Server-side risk evaluation & explainability
    const riskList = await call('GET', '/api/risk');
    assert.equal(riskList.s, 200);
    assert.equal(riskList.j.length, 16, 'server evaluates risk for all 16 zones');
    const z8 = riskList.j.find(z => z.zone_id === 8);
    assert.ok(z8.reasons.length > 0, 'zone contains explainable trigger reasons');
    assert.ok(z8.breakdown && typeof z8.breakdown.rainPoints === 'number');

    // 10. NASA GLC backtest report
    const bt = await call('GET', '/api/backtest');
    assert.equal(bt.s, 200);
    assert.equal(bt.j.status, 'calibrated');
    assert.ok(bt.j.hitRatePct >= 80, 'backtest against NASA GLC achieves high hit rate');

    // 11. Real sensor telemetry ingestion (ESP32 LoRa)
    const telem = await call('POST', '/api/telemetry', { zone_id: 8, node_id: 'ESP32-TK-01', soil_pct: 88, rain_mm: 72 });
    assert.equal(telem.s, 200);
    assert.equal(telem.j.risk.level, 'CRITICAL', 'telemetry triggers server-side risk calculation');

    // 12. Zone metrics feed & soil_pct persistence
    assert.equal((await call('PUT', '/api/zone_metrics', [{ zone: 'Tawang Sector', rain_mm_24h: 61, soil_pct: 75, ndvi: 0.4 }], adm.token)).s, 200);
    const feed = (await call('GET', '/zone_metrics.json')).j;
    const tawang = feed.find(x => x.zone === 'Tawang Sector');
    assert.equal(tawang.soil_pct, 75, 'soil_pct column is verified and persistent');

    // 13. Frontend HTML served
    const page = await fetch(base + '/');
    assert.ok((await page.text()).includes('LANDSAFE AI'));

    console.log('All comprehensive tests passed successfully!');
    process.exit(0);
  } catch (e) {
    console.error('FAILED:', e);
    process.exit(1);
  }
});
