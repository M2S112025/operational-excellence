import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {DemoUser} from '@/lib/current-user';
import type {RedTagDecision} from '@/features/five-s/red-tag/types';
let values:Map<string,string>;
beforeEach(()=>{vi.resetModules();values=new Map([['ops-red-tag-original-reset-v1','done']]);vi.stubGlobal('window',{alert:vi.fn(),localStorage:{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)}});});
afterEach(()=>vi.unstubAllGlobals());
async function setup(decision:RedTagDecision|null='keep'){
 const identity=await import('@/lib/current-user');const store=await import('@/features/five-s/red-tag/store');const actor=identity.DEMO_USERS.auditor;
 const tag=store.createRedTagV2({plant:actor.plant,zone:'Zone A',section:'Stores',department:'Production',category:'Tools',itemName:'Calibrated master',reason:'Unused',remarks:'Review retention',imageUrl:'data:image/png;base64,before',createdById:actor.id,createdByName:actor.name},actor)!;
 store.submitRedTagForReview(tag.id,{reviewerId:actor.id,reviewerName:actor.name},actor);
 if(decision)store.recordRedTagDecision(tag.id,{decision,comments:'Review retained'},actor);
 return {store,identity,actor,id:tag.id};
}
describe('Keep confirmation closure',()=>{
 it('requires justification and explicit confirmation; closes without disposition, After or Action',async()=>{
  const {store,actor,id}=await setup();const before=store.getRedTag(id)!;
  expect(before.status).toBe('Decision Made');expect(store.closeRedTag(id,actor)).toBeUndefined();
  expect(store.confirmRedTagKeep(id,'  ',actor)).toBeUndefined();expect(store.getRedTag(id)).toEqual(before);
  expect(store.startRedTagDisposition(id,{responsiblePersonId:actor.id,responsiblePersonName:actor.name,targetDate:'2030-01-01'},actor)).toBeUndefined();
  const closed=store.confirmRedTagKeep(id,'  Required calibrated reference  ',actor)!;
  expect(closed).toMatchObject({status:'Closed',decisionRecord:before.decisionRecord,keepConfirmation:{justification:'Required calibrated reference',confirmedByUserId:actor.id,confirmedByName:actor.name}});
  expect(closed.keepConfirmation?.confirmedAt).toBe(closed.closedAt);
  for(const key of ['dispositionDetails','afterEvidence','actionId','handlingMode']as const)expect(closed[key]).toBeUndefined();
  expect(closed.history.slice(0,before.history.length)).toEqual(before.history);
  expect(closed.history.slice(-2).map(e=>e.type)).toEqual(['keep_confirmed','closed']);
  expect(closed.history.slice(-2).every(e=>e.actor===actor.name&&e.at===closed.closedAt)).toBe(true);
 });
 it('rejects duplicate confirmation and persists the exact closure on reload',async()=>{
  const {store,actor,id}=await setup();const closed=store.confirmRedTagKeep(id,'Retain reference',actor)!;
  const saved=values.get(store.RED_TAG_STORAGE_KEY);
  expect(store.confirmRedTagKeep(id,'Duplicate',actor)).toBeUndefined();expect(store.closeRedTag(id,actor)).toBeUndefined();expect(values.get(store.RED_TAG_STORAGE_KEY)).toBe(saved);
  vi.resetModules();const reloaded=await import('@/features/five-s/red-tag/store');expect(reloaded.getRedTag(id)).toEqual(store.normalizeRedTag(closed));
 });
 it('rejects unknown, unprivileged, inactive and impersonated actors without mutation',async()=>{
  const {store,identity,actor,id}=await setup();const before=store.getRedTag(id);
  expect(store.confirmRedTagKeep(id,'Keep',{...actor,id:'UNKNOWN'})).toBeUndefined();
  identity.setDemoRole('responsible');expect(store.confirmRedTagKeep(id,'Keep',identity.DEMO_USERS.responsible)).toBeUndefined();expect(store.confirmRedTagKeep(id,'Keep',actor)).toBeUndefined();
  identity.setDemoRole('auditor');const admin=await import('@/features/five-s/administration/store');admin.getAdminUser(actor.id)!.status='Inactive';expect(store.confirmRedTagKeep(id,'Keep',actor)).toBeUndefined();expect(store.getRedTag(id)).toEqual(before);
 });
 it('uses canonical actor identity for confirmation and history',async()=>{
  const {store,actor,id}=await setup();const closed=store.confirmRedTagKeep(id,'Keep',{...actor,name:'Forged Name'})!;
  expect(closed.keepConfirmation?.confirmedByName).toBe(actor.name);expect(closed.history.at(-1)?.actor).toBe(actor.name);
 });
 it('rejects generic closure of an unconfirmed Keep even with legacy verification data',async()=>{
  const {store,actor,id}=await setup();const tag=store.getRedTag(id)!;
  values.set(store.RED_TAG_STORAGE_KEY,JSON.stringify([{...tag,status:'Awaiting Verification',afterEvidence:[{id:'x',url:'data:image/png;base64,x'}],closure:{verificationResult:'Passed'},dispositionDetails:{decision:'keep',responsiblePersonId:actor.id,responsiblePersonName:actor.name,targetDate:'2030-01-01',executionNotes:'Legacy handling',completedAt:'2026-10-18T09:00:00Z',completionNotes:'Legacy complete',responsibleConfirmed:true,evidence:[{id:'x',url:'data:image/png;base64,x'}]}}]));vi.resetModules();const reloaded=await import('@/features/five-s/red-tag/store');
  expect(reloaded.closeRedTag(id,actor)).toBeUndefined();expect(reloaded.confirmRedTagKeep(id,'Keep',actor)).toBeUndefined();expect(reloaded.getRedTag(id)?.status).toBe('Awaiting Verification');
 });
 it.each(['relocate','return','repair','sell_reuse','scrap']as const)('preserves %s disposition entry and rejects Keep closure',async decision=>{
  const {store,actor,id}=await setup(decision);expect(store.confirmRedTagKeep(id,'Keep',actor)).toBeUndefined();
  expect(store.startRedTagDisposition(id,{responsiblePersonId:actor.id,responsiblePersonName:actor.name,targetDate:'2030-01-01',executionNotes:'Execute decision'},actor)).toMatchObject({status:'Disposition In Progress',decisionRecord:{type:decision}});
 });
 it('preserves Further Evaluation final-decision requirement',async()=>{
  const {store,actor,id}=await setup('further_evaluation');expect(store.confirmRedTagKeep(id,'Keep',actor)).toBeUndefined();expect(store.startRedTagDisposition(id,{responsiblePersonId:actor.id,responsiblePersonName:actor.name,targetDate:'2030-01-01'},actor)).toBeUndefined();expect(store.getRedTag(id)?.status).toBe('Decision Made');
 });
});


describe('Atomic Keep closure from review',()=>{
 it('persists review, decision, confirmation and closure in exactly one write',async()=>{
  const {store,actor,id}=await setup(null);const before=store.getRedTag(id)!;
  const write=vi.spyOn(window.localStorage,'setItem');
  expect(store.confirmRedTagKeep(id,'  Keep calibrated reference  ',actor)).toMatchObject({status:'Closed',review:{reviewedAt:expect.any(String)},decisionRecord:{type:'keep',decidedByUserId:actor.id,decidedByName:actor.name},keepConfirmation:{justification:'Keep calibrated reference',confirmedByUserId:actor.id}});
  const calls=write.mock.calls.filter(([key])=>key===store.RED_TAG_STORAGE_KEY);expect(calls).toHaveLength(1);
  const closed=store.getRedTag(id)!;expect(JSON.parse(calls[0][1]).find((t:{id:string})=>t.id===id)).toEqual(closed);
  expect(closed.history.slice(0,before.history.length)).toEqual(before.history);
  expect(closed.history.slice(-4).map(e=>e.type)).toEqual(['reviewed','decision_recorded','keep_confirmed','closed']);
  expect(new Set([closed.review?.reviewedAt,closed.decisionRecord?.decidedAt,closed.keepConfirmation?.confirmedAt,closed.closedAt,...closed.history.slice(-4).map(e=>e.at)]).size).toBe(1);
  expect(store.confirmRedTagKeep(id,'Duplicate',actor)).toBeUndefined();expect(write.mock.calls.filter(([key])=>key===store.RED_TAG_STORAGE_KEY)).toHaveLength(1);
  vi.resetModules();expect((await import('@/features/five-s/red-tag/store')).getRedTag(id)).toEqual(store.normalizeRedTag(closed));
 });
 it('rejects empty justification, unknown/unprivileged actors and a different authorized reviewer',async()=>{
  const {store,identity,actor,id}=await setup(null);const before=store.getRedTag(id)!;const write=vi.spyOn(window.localStorage,'setItem');
  expect(store.confirmRedTagKeep(id,'   ',actor)).toBeUndefined();expect(store.confirmRedTagKeep(id,'Keep',{...actor,id:'UNKNOWN'})).toBeUndefined();
  identity.setDemoRole('responsible');expect(store.confirmRedTagKeep(id,'Keep',identity.DEMO_USERS.responsible)).toBeUndefined();expect(store.confirmRedTagKeep(id,'Keep',actor)).toBeUndefined();
  identity.setDemoRole('leader');expect(store.confirmRedTagKeep(id,'Keep',identity.DEMO_USERS.leader)).toBeUndefined();
  expect(store.getRedTag(id)).toEqual(before);expect(write.mock.calls.filter(([key])=>key===store.RED_TAG_STORAGE_KEY)).toHaveLength(0);
 });
 it('failed durable write leaves the review untouched and permits a single clean retry',async()=>{
  const {store,actor,id}=await setup(null);const before=store.getRedTag(id)!;const saved=values.get(store.RED_TAG_STORAGE_KEY);
  const write=vi.spyOn(window.localStorage,'setItem').mockImplementation(()=>{throw new DOMException('Full','QuotaExceededError');});
  expect(store.confirmRedTagKeep(id,'Keep reference',actor)).toBeUndefined();expect(store.getRedTag(id)).toEqual(before);expect(values.get(store.RED_TAG_STORAGE_KEY)).toBe(saved);
  write.mockRestore();const closed=store.confirmRedTagKeep(id,'Keep reference',actor)!;expect(closed.status).toBe('Closed');expect(closed.history.filter(e=>e.type==='decision_recorded')).toHaveLength(1);expect(closed.history.filter(e=>e.type==='closed')).toHaveLength(1);
 });
});

describe('All seven decision submission safeguards',()=>{
 it.each(['keep','relocate','return','repair','sell_reuse','scrap','further_evaluation']as const)('%s rejects unauthorized submission and duplicate events',async decision=>{
  const {store,actor,identity,id}=await setup(null);const before=store.getRedTag(id)!;
  const submit=(who:DemoUser)=>decision==='keep'?store.confirmRedTagKeep(id,'Keep reference',who):store.recordRedTagDecision(id,{decision,comments:'Decision-specific comment'},who);
  expect(submit({...actor,id:'UNKNOWN'})).toBeUndefined();identity.setDemoRole('responsible');expect(submit(identity.DEMO_USERS.responsible)).toBeUndefined();expect(store.getRedTag(id)).toEqual(before);identity.setDemoRole('auditor');
  const saved=submit(actor)!;expect(saved.status).toBe(decision==='keep'?'Closed':'Decision Made');expect(saved.decisionRecord?.type).toBe(decision);
  expect(submit(actor)).toBeUndefined();expect(store.getRedTag(id)).toEqual(saved);expect(saved.history.filter(e=>e.type==='decision_recorded')).toHaveLength(1);
 });
});
