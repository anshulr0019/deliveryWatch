const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { makeLoader } = require('./load.cjs');
const load=makeLoader();
const { safeNext, readObject }=load('src/lib/request.ts');
const { isPublicAddress, parseWebhookUrl }=load('src/lib/safe-webhook.ts');
test('redirect targets stay on the application origin',()=>{
 for(const url of ['//evil.test','/\\evil.test','https://evil.test','/\nevil.test'])assert.equal(safeNext(url),'/dashboard');
 assert.equal(safeNext('/dashboard?add=example.com'),'/dashboard?add=example.com');
});
test('invalid JSON shapes/types and oversized bodies get controlled errors',async()=>{
 for(const value of [null,[],123,'string']) {const r=await readObject(new Request('http://local/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)}));assert.equal(r.status,400);}
 const r=await readObject(new Request('http://local/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({x:'a'.repeat(9000)})}));assert.equal(r.status,413);
});
test('webhooks reject loopback/private/metadata/credentials/ports and IPv6 mapped addresses',()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','100.64.0.1','172.31.0.1','192.168.1.1','::1','::ffff:127.0.0.1','fc00::1','2001:db8::1'])assert.equal(isPublicAddress(ip),false,ip);
 for(const url of ['http://example.com','https://user:pass@example.com','https://example.com:444','https://2130706433','https://[::1]/'])assert.throws(()=>parseWebhookUrl(url),url);
 assert.equal(isPublicAddress('8.8.8.8'),true);assert.equal(isPublicAddress('2606:4700:4700::1111'),true);
});
test('DNS rebinding is prevented by pinning the checked address; redirects are not followed',async()=>{
 let lookups=0,requests=0;
 const s=makeLoader({'node:dns/promises':{lookup:async()=>{lookups++;return [{address:'8.8.8.8',family:4}];}},'node:https':{request:(url,options,callback)=>{
  requests++;assert.equal(url.hostname,'example.com');assert.equal(options.agent,false);
  options.lookup('example.com',{},(err,address,family)=>{assert.equal(address,'8.8.8.8');assert.equal(family,4);});
  const req=new EventEmitter();req.destroy=()=>{};req.end=()=>{const res=new EventEmitter();res.statusCode=302;res.resume=()=>{};callback(res);setImmediate(()=>{res.emit('end');req.emit('close');});};return req;
 }}})('src/lib/safe-webhook.ts');
 const r=await s.postWebhook('https://example.com','{}',{});assert.equal(r.ok,false);assert.equal(requests,1);assert.equal(lookups,1);
});
test('a mixed public/private DNS answer is rejected before making a request',async()=>{
 const s=makeLoader({'node:dns/promises':{lookup:async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]}})('src/lib/safe-webhook.ts');
 await assert.rejects(()=>s.resolveWebhook('https://example.com'),/public/);
});
test('same-status record changes alert; unavailable RBL does not imply delisting',()=>{
 const {detectDomainChanges}=load('src/lib/change-detector.ts');
 const before={score:90,spfStatus:'pass',dkimStatus:'pass',dmarcStatus:'pass',mxStatus:'pass',rblStatus:'fail',spfRecord:'old',dmarcPolicy:'reject',dmarcRecord:'old',dkimFingerprint:'old',mxRecords:'old',rblIp:'8.8.8.8',rblListedOn:['Spamhaus ZEN'],rblProviders:[{name:'Spamhaus ZEN',status:'listed'}]};
 const after={...before,spfRecord:'new',dmarcPolicy:'quarantine',dmarcRecord:'new',dkimFingerprint:'new',mxRecords:'new',rblListedOn:[],rblStatus:'unknown',rblProviders:[{name:'Spamhaus ZEN',status:'unavailable'}]};
 const events=detectDomainChanges(before,after);for(const type of ['spf_changed','dkim_changed','dmarc_changed','mx_changed'])assert.ok(events.some(e=>e.type===type));assert.ok(!events.some(e=>e.type==='blacklist_removed'));
});
