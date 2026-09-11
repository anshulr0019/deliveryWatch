const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { drizzle } = require('drizzle-orm/pglite');
const { eq } = require('drizzle-orm');
const { makeLoader, root } = require('./load.cjs');
const { NextRequest, NextResponse } = require('next/server');

const healthy = () => ({ domain:'example.com', totalScore:100, grade:'A+', tier:'Excellent', complete:true,
 spf:{status:'pass',score:20,maxScore:20,found:true,record:'v=spf1 ip4:8.8.8.8 -all',qualifier:'-',includes:[],detectedProviders:[],issues:[],suggestions:[]},
 dkim:{status:'pass',score:20,maxScore:20,found:true,bestSelector:'google',keyBits:2048,keyFingerprint:'key-a',selectors:[{selector:'google',fingerprint:'key-a'}],issues:[],suggestions:[]},
 dmarc:{status:'pass',score:20,maxScore:20,found:true,record:'v=DMARC1; p=reject',policy:'reject',issues:[],suggestions:[]},
 mx:{status:'pass',score:20,maxScore:20,found:true,records:[{exchange:'mx.example.com',priority:10,provider:null}],hasBackup:false,primaryProvider:null,issues:[],suggestions:[]},
 rbl:{status:'pass',score:20,maxScore:20,ip:'8.8.8.8',source:'configured',listedOn:[],providers:[{name:'Spamhaus ZEN',status:'clear'}],issues:[],suggestions:[]},
 scannedAt:new Date().toISOString(),scanDurationMs:1 });

test('authenticated route lifecycle, ownership, durable alerts, leases, and rate limits', async t => {
 const pg = new PGlite();
 t.after(()=>pg.close());
 for(const file of fs.readdirSync(path.join(root,'migrations')).filter(f=>f.endsWith('.sql')).sort()) await pg.exec(fs.readFileSync(path.join(root,'migrations',file),'utf8'));
 const schema=makeLoader()('src/db/schema.ts');
 const db=drizzle(pg,{schema});
 const jars=[new Map(),new Map()];let jar=jars[0];let verificationToken;let nextResult=healthy();let deliverySucceeds=false, sends=0;
 const oldEnv={DATABASE_URL:process.env.DATABASE_URL,RESEND_API_KEY:process.env.RESEND_API_KEY,NEXT_PUBLIC_SITE_URL:process.env.NEXT_PUBLIC_SITE_URL};const oldDb=oldEnv.DATABASE_URL;process.env.DATABASE_URL='test-only';process.env.RESEND_API_KEY='test-only';process.env.NEXT_PUBLIC_SITE_URL='http://localhost:3000';
 t.after(()=>{for(const [k,v] of Object.entries(oldEnv)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
 t.after(()=>{if(oldDb===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=oldDb;});
 const realDns=makeLoader()('src/lib/dns-check.ts');
 const load=makeLoader({
  '@/db':{db},
  'next/headers':{cookies:async()=>({get:k=>jar.has(k)?{value:jar.get(k)}:undefined,set:(k,v,o)=>o?.maxAge===0?jar.delete(k):jar.set(k,v)})},
  'next/server':{NextResponse,after:()=>{}},
  '@/lib/dns-check':{...realDns,checkDomain:async(domain)=>({...structuredClone(nextResult),domain,scannedAt:new Date().toISOString()})},
  '@/lib/alert-sender':{dispatchToChannels:async channels=>{sends++;return channels.map(c=>({channelId:c.id,type:c.type,ok:deliverySucceeds,reason:deliverySucceeds?undefined:'Simulated provider outage'}));}},
  '@/lib/safe-webhook':{resolveWebhook:async raw=>{const url=new URL(raw);if(url.hostname==='127.0.0.1')throw Error('private');return {url};}},
 }, {fetch:async(url, options)=>{assert.equal(url,'https://api.resend.com/emails');const text=JSON.parse(options.body).text;verificationToken=new URL(text.match(/http:\/\/localhost:3000\/verify-email\?token=[A-Za-z0-9_-]+/)[0]).searchParams.get('token');return new Response('{}',{status:200});}});
 const request=(route,method,body)=>new Request('http://localhost'+route,{method,headers:{'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const signup=load('src/app/api/auth/signup/route.ts').POST;
 const login=load('src/app/api/auth/login/route.ts').POST;
 const logout=load('src/app/api/auth/logout/route.ts').POST;
 const auth=load('src/lib/auth.ts');
 await t.test('signup, login, invalid sessions, and logout',async()=>{
  for(const body of [null,{email:123,password:'password'}])assert.equal((await signup(request('/api/auth/signup','POST',body))).status,400);
  const res=await signup(request('/api/auth/signup','POST',{email:'owner@example.com',password:'test-password',fullName:'Owner'}));assert.equal(res.status,200);
  assert.equal((await res.json()).verificationRequired,true);assert.equal(await auth.getCurrentUser(),null);
  assert.equal((await login(request('/login','POST',{email:'owner@example.com',password:'test-password'}))).status,403);
  const verify=load('src/app/api/auth/verify/route.ts').POST;
  assert.equal((await verify(request('/verify','POST',{token:verificationToken}))).status,200);
  assert.equal((await verify(request('/verify','POST',{token:verificationToken}))).status,400);
  assert.equal((await login(request('/login','POST',{email:'owner@example.com',password:'test-password'}))).status,200);
  assert.ok((await auth.getCurrentUser()).id);
  assert.equal((await signup(request('/api/auth/signup','POST',{email:'owner@example.com',password:'test-password'}))).status,409);
  await logout();assert.equal(await auth.getCurrentUser(),null);
  assert.equal((await login(request('/api/auth/login','POST',{email:'owner@example.com',password:'wrong-password'}))).status,401);
  assert.equal((await login(request('/api/auth/login','POST',{email:'owner@example.com',password:'test-password'}))).status,200);
  const token=jar.get('dw_session');jar.set('dw_session','invalid');assert.equal(await auth.getCurrentUser(),null);
  const proxy=load('src/proxy.ts').proxy(new NextRequest('http://localhost/login',{headers:{cookie:'dw_session=invalid'}}));assert.equal(proxy.headers.get('location'),null);jar.set('dw_session',token);
 });
 const domains=load('src/app/api/domains/route.ts');
 const detail=load('src/app/api/domains/[id]/route.ts');
 const add=load('src/app/api/check/route.ts').POST;
 const recheck=load('src/app/api/domains/[id]/recheck/route.ts').POST;
 const channels=load('src/app/api/alerts/route.ts');
 const channel=load('src/app/api/alerts/[id]/route.ts');
 let domainId,channelId;
 const params=()=>({params:Promise.resolve({id:domainId})});
 await t.test('add/list/detail domain, duplicate rejection, pause and resume',async()=>{
  let res=await add(request('/api/check','POST',{domain:'example.com',dkimSelectors:['google'],sendingIp:'8.8.8.8'}));assert.equal(res.status,200);domainId=(await res.json()).domainId;
  assert.equal((await add(request('/api/check','POST',{domain:'example.com'}))).status,409);
  assert.equal((await (await domains.GET()).json()).domains.length,1);
  let data=await (await detail.GET(request('/api/domains/'+domainId,'GET'),params())).json();assert.equal(data.checks.length,1);assert.equal(data.domain.scanOptions.sendingIp,'8.8.8.8');
  for(const isActive of [false,true]){res=await detail.PATCH(request('/api/domains/'+domainId,'PATCH',{isActive}),params());assert.equal((await res.json()).domain.isActive,isActive);}
 });
 await t.test('second account cannot read, change, recheck, or delete another account domain',async()=>{
  jar=jars[1];await signup(request('/api/auth/signup','POST',{email:'other@example.com',password:'test-password'}));await load('src/app/api/auth/verify/route.ts').POST(request('/verify','POST',{token:verificationToken}));await login(request('/login','POST',{email:'other@example.com',password:'test-password'}));
  assert.equal((await detail.GET(request('/api/domains/'+domainId,'GET'),params())).status,404);
  assert.equal((await detail.PATCH(request('/api/domains/'+domainId,'PATCH',{isActive:false}),params())).status,404);
  assert.equal((await recheck(request('/recheck','POST'),params())).status,404);
  assert.equal((await detail.DELETE(request('/domain','DELETE'),params())).status,404);jar=jars[0];
 });
 await t.test('alert CRUD and ownership, with test sender stubbed',async()=>{
  const res=await channels.POST(request('/api/alerts','POST',{type:'webhook',config:{url:'https://example.com/events'}}));assert.equal(res.status,201);channelId=(await res.json()).channel.id;
  const p={params:Promise.resolve({id:channelId})};
  jar=jars[1];for(const method of ['PATCH','DELETE','POST'])assert.equal((await channel[method](request('/channel',method,{isActive:false}),p)).status,404);jar=jars[0];
  assert.equal((await channel.PATCH(request('/channel','PATCH',{isActive:false}),p)).status,200);
  assert.equal((await channel.PATCH(request('/channel','PATCH',{isActive:true}),p)).status,200);
  assert.equal((await channel.POST(request('/channel','POST'),p)).status,200);
 });
 await t.test('same-status SPF drift enqueues a durable alert; provider failure retries without another DNS change',async()=>{
  nextResult=healthy();nextResult.spf.record='v=spf1 ip4:1.1.1.1 -all';
  const res=await recheck(request('/recheck','POST'),params());assert.equal(res.status,200);assert.equal((await res.json()).score,100);
  let jobs=await db.select().from(schema.alertDeliveries);assert.equal(jobs.length,1);assert.equal(jobs[0].status,'pending');
  const outbox=load('src/lib/alert-outbox.ts');await outbox.drainAlertOutbox();
  jobs=await db.select().from(schema.alertDeliveries);assert.equal(jobs[0].attempts,1);assert.equal(jobs[0].status,'pending');assert.match(jobs[0].lastError,/outage/);
  // The persisted next-attempt time drives retry, without a new scan.
  await db.update(schema.alertDeliveries).set({nextAttemptAt:new Date(0)});deliverySucceeds=true;
  await outbox.drainAlertOutbox();jobs=await db.select().from(schema.alertDeliveries);assert.equal(jobs[0].status,'sent');assert.equal(jobs[0].attempts,2);
  const before=sends;await outbox.drainAlertOutbox();assert.equal(sends,before);
 });
 await t.test('active domain lease rejects overlapping scans and paused domains are not scheduled',async()=>{
  await db.update(schema.domains).set({checkLeaseUntil:new Date(Date.now()+60000)}).where(eq(schema.domains.id,domainId));
  assert.equal((await recheck(request('/recheck','POST'),params())).status,409);
  await db.update(schema.domains).set({checkLeaseUntil:null,isActive:false,nextCheckAt:new Date(0)}).where(eq(schema.domains.id,domainId));
  const monitor=load('src/lib/monitor.ts');await assert.rejects(async()=>monitor.runMonitoredCheck({domainId,domainName:'example.com',userId:(await auth.getCurrentUser()).id,scheduled:true}));
 });
 await t.test('rate windows enforce the cap and reset after expiry',async()=>{
  const {rateLimit}=load('src/lib/rate-limit.ts');assert.equal(await rateLimit('test','user',2),null);assert.equal(await rateLimit('test','user',2),null);assert.equal((await rateLimit('test','user',2)).status,429);
  await db.update(schema.rateLimits).set({expiresAt:new Date(0)});assert.equal(await rateLimit('test','user',2),null);
 });
 await t.test('delete cascades history, events and pending deliveries',async()=>{
  assert.equal((await detail.DELETE(request('/domain','DELETE'),params())).status,200);
  assert.equal((await db.select().from(schema.checks)).length,0);assert.equal((await db.select().from(schema.alertDeliveries)).length,0);
  assert.equal((await channel.DELETE(request('/channel','DELETE'),{params:Promise.resolve({id:channelId})})).status,200);
 });
});
