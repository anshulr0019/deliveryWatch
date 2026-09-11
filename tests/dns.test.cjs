const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('node:crypto');
const { makeLoader } = require('./load.cjs');
const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
const ed = generateKeyPairSync('ed25519').publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64');
function engine(options = {}) {
  const records = { 'example.com': [['v=spf1 ip4:8.8.8.8 -all']], 'google._domainkey.example.com': [[`v=DKIM1; k=rsa; p=${rsa}`]], '_dmarc.example.com': [['v=DMARC1; p=reject; rua=mailto:dmarc@example.com']], ...options.txt };
  class Resolver {
    cancel() {}
    async resolveTxt(n) { if (options.txtFailure) throw Object.assign(new Error('DNS failed'), { code: 'ESERVFAIL' }); return records[n] ?? []; }
    async resolveMx() { return [{ exchange: 'mx.example.com', priority: 10 }]; }
    async resolve4(n) { if (n === 'mx.example.com') return ['8.8.8.8']; if (options.rblFailure) throw Object.assign(new Error('DNS failed'), { code: 'ESERVFAIL' }); return options.rblAnswer ?? []; }
    async resolve6() { return []; }
  }
  return makeLoader({ 'node:dns/promises': { Resolver } })('src/lib/dns-check.ts');
}
test('healthy records, one MX, and cryptographically parsed RSA key pass', async () => { const r = await engine().checkDomain('example.com'); assert.equal(r.totalScore, 100); assert.equal(r.complete, true); });
test('duplicate SPF is fail, never a perfect score', async () => { const r = await engine({ txt: { 'example.com': [['v=spf1 -all'], ['v=spf1 ~all']] } }).checkDomain('example.com'); assert.equal(r.spf.status, 'fail'); assert.equal(r.spf.score, 0); });
test('missing includes fail and cycles terminate', async () => {
 for (const txt of [{ 'example.com': [['v=spf1 include:missing.example.com -all']] }, { 'example.com': [['v=spf1 include:example.com -all']] }]) assert.equal((await engine({ txt }).checkDomain('example.com')).spf.status, 'fail');
});
test('SPF redirect is followed without suggesting an all mechanism at the root', async () => { const r = await engine({ txt: { 'example.com': [['v=spf1 redirect=policy.example.com']], 'policy.example.com': [['v=spf1 ip4:8.8.8.8 -all']] } }).checkDomain('example.com'); assert.equal(r.spf.status, 'pass'); assert.equal(r.spf.issues.length, 0); });
test('nested SPF lookup budget and invalid addresses are rejected', async () => {
 const txt = {}; for (let i=0; i<12; i++) txt[i ? `n${i}.example.com` : 'example.com'] = [[`v=spf1 include:n${i+1}.example.com -all`]];
 assert.match((await engine({ txt }).checkDomain('example.com')).spf.issues.join(' '), /10 DNS/);
 assert.equal((await engine({ txt: { 'example.com': [['v=spf1 ip4:999.0.0.1 -all']] } }).checkDomain('example.com')).spf.status, 'fail');
});
test('invalid DKIM keys fail; Ed25519 is not evaluated as short RSA', async () => {
 for (const [key, status] of [['v=DKIM1; k=rsa; p=abc', 'fail'], [`v=DKIM1; k=ed25519; p=${ed}`, 'pass']]) {
  const r=await engine({ txt: { 'google._domainkey.example.com': [[key]] } }).checkDomain('example.com'); assert.equal(r.dkim.status,status);
 }
});
test('explicit custom selectors work; undiscovered common selectors are unknown', async () => {
 const e=engine({txt:{'google._domainkey.example.com':[], 'custom._domainkey.example.com':[[`v=DKIM1; p=${rsa}`]]}});
 assert.equal((await e.checkDomain('example.com')).dkim.status,'unknown');
 assert.equal((await e.checkDomain('example.com',{dkimSelectors:['custom']})).dkim.status,'pass');
 assert.equal((await e.checkDomain('example.com',{dkimSelectors:['missing']})).dkim.status,'fail');
});
test('DNS failures and provider error answers never become clean results', async () => {
 for(const options of [{rblFailure:true},{rblAnswer:['127.255.255.254']}]) {
 const r=await engine(options).checkDomain('example.com'); assert.equal(r.rbl.status,'unknown'); assert.equal(r.rbl.score,0); assert.equal(r.complete,false);
 }
 const r=await engine({txtFailure:true}).checkDomain('example.com'); assert.equal(r.spf.status,'unknown');assert.equal(r.dmarc.status,'unknown');
});
test('configured sending address overrides inbound MX and is labeled', async () => {const r=await engine().checkDomain('example.com',{sendingIp:'1.1.1.1'});assert.equal(r.rbl.ip,'1.1.1.1');assert.equal(r.rbl.source,'configured');});
test('input parser rejects malformed domain and scan options', () => {const e=engine();assert.equal(e.normalizeDomain(123),null);assert.throws(()=>e.parseScanOptions({dkimSelectors:[123]}));assert.throws(()=>e.parseScanOptions({sendingIp:'127.0.0.999'}));});
