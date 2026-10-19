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
    assert.equal((await call('POST', '/api/auth/login', { username: 'admin', password: 'nope' })).s, 401);
    const off = (await call('POST', '/api/auth/login', { username: 'officer', password: 'officer123' })).j;
    const adm = (await call('POST', '/api/auth/login', { username: 'admin', password: 'admin123' })).j;
    assert.ok(off.token && adm.token);

    const su = await call('POST', '/api/auth/signup', { name: 'Test Resident', username: 'res_one', password: 'longpassword', phone: '+919999999999', zone: 8 });
    assert.equal(su.s, 201); assert.equal(su.j.user.r, 'Public');
    assert.equal((await call('POST', '/api/auth/signup', { name: 'X', username: 'res_one', password: 'longpassword' })).s, 400);
    const rt = su.j.token;

    assert.equal((await call('GET', '/api/reports')).s, 401);
    const rp = await call('POST', '/api/reports', { zone: 8, hazard: 'Rockfall' }, rt);
    assert.equal(rp.s, 201); assert.equal(rp.j.st, 'Pending');
    assert.equal((await call('GET', '/api/reports', null, rt)).j.length, 1, 'resident sees only own reports');
    assert.ok((await call('GET', '/api/reports', null, off.token)).j.length >= 3, 'officer sees all');
    assert.equal((await call('PATCH', '/api/reports/' + rp.j.dbid, { status: 'Verified' }, rt)).s, 403);
    assert.equal((await call('PATCH', '/api/reports/' + rp.j.dbid, { status: 'Verified' }, off.token)).j.st, 'Verified');

    assert.equal((await call('POST', '/api/checkins', { kind: 'help' }, rt)).s, 201);
    assert.equal((await call('GET', '/api/checkins', null, rt)).s, 403);
    assert.equal((await call('GET', '/api/checkins', null, off.token)).j.length, 1);

    const al = await call('POST', '/api/alerts', { zone: 8, level: 3, message: 'LANDSAFE CRITICAL: test' }, off.token);
    assert.equal(al.s, 201); assert.equal(al.j.texted, 1, 'registered resident in zone 8 is texted');
    assert.equal((await call('POST', '/api/alerts', { zone: 8, level: 3, message: 'x' }, rt)).s, 403);

    assert.equal((await call('GET', '/api/users', null, off.token)).s, 403);
    assert.equal((await call('PATCH', '/api/users/res_one/role', { role: 'Field Officer' }, adm.token)).s, 200);
    assert.equal((await call('PUT', '/api/zone_metrics', [{ zone: 'Tawang Sector', rain_mm_24h: 61, ndvi: 0.4 }], adm.token)).s, 200);
    assert.equal((await call('GET', '/zone_metrics.json')).j[0].zone, 'Tawang Sector');
    const page = await fetch(base + '/'); assert.ok((await page.text()).includes('LANDSAFE AI'));
    console.log('All tests passed');
    process.exit(0);
  } catch (e) { console.error('FAILED:', e); process.exit(1); }
});
