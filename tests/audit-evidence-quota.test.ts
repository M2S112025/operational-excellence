import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import {authenticateDemoFixture} from './helpers/demo-session';
import type {FiveSAudit} from '@/features/five-s/types/five-s';
const assets=vi.hoisted(()=>({blobs:new Map<string,Blob>()}));
vi.mock('@/lib/gemba/gemba-photo-storage',async original=>({...await original<typeof import('@/lib/gemba/gemba-photo-storage')>(),saveGembaPhoto:vi.fn(async(key:string,blob:Blob)=>{assets.blobs.set(key,blob);})}));
const key='manufacturing-qms-five-s-audits-v1';let values:Map<string,string>;
const dataUrl='data:image/png;base64,'+Buffer.from('audit-evidence-bytes').toString('base64');
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();assets.blobs.clear();values=new Map([['ops-red-tag-original-reset-v1','done'],['unrelated-setting','preserved']]);vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('window',{localStorage:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)}});authenticateDemoFixture();});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
async function setup(){
 const store=await import('@/lib/five-s/audit-store'),identity=await import('@/lib/current-user');
 const audit=store.createFiveSAudit({title:'Quota fixture',plant:'Egmore Plant',area:'Zone B',department:'Production',auditor:'Lakshman',dueDate:'2030-12-20',sections:[{category:'Sort',description:'Preserve scoring',score:0,maxScore:2,questions:[{id:'Q-QUOTA',category:'Sort',question:'Original wording',score:0,maxScore:2,status:'Fail',actionRequired:true,evidence:[{id:'PHOTO',name:'initial.png',type:'image',size:20,dataUrl,uploadedAt:'2026-10-19T10:00:00Z',uploadedBy:'Lakshman'}]}]}]});
 return {store,audit,actor:identity.DEMO_USERS.auditor,identity};
}
describe('Audit evidence quota recovery',()=>{
 it('deduplicates embedded assets and preserves historical metadata, scoring and original bytes after reload',async()=>{
  const {store,audit}=await setup();const original=structuredClone(audit);const saved=JSON.parse(values.get(key)!) as FiveSAudit[];saved.find(item=>item.id===audit.id)!.status='Completed';values.set(key,JSON.stringify(saved));vi.resetModules();const current=await import('@/lib/five-s/audit-store');
  await current.compactAuditEvidenceStorage();const result=current.getFiveSAuditById(audit.id)!;const photo=result.sections[0].questions[0].evidence![0];
  expect(result).toMatchObject({id:audit.id,status:'Completed',sections:[{category:'Sort',score:original.sections[0].score,questions:[{id:'Q-QUOTA',question:'Original wording',score:0,status:'Fail',evidence:[{id:'PHOTO',name:'initial.png',dataUrl:'',storageKey:expect.any(String)}]}]}]});
  expect(await assets.blobs.get(photo.storageKey!)!.text()).toBe('audit-evidence-bytes');expect(audit).toEqual(original);expect(values.get('unrelated-setting')).toBe('preserved');
  vi.resetModules();expect((await import('@/lib/five-s/audit-store')).getFiveSAuditById(audit.id)!.sections[0].questions[0].evidence![0].storageKey).toBe(photo.storageKey);
  expect(store.getFiveSAuditById(audit.id)!.sections[0].questions[0].question).toBe('Original wording');
 });
 it('stores each repeated payload once and prevents stale mounted forms from embedding it again',async()=>{
  const {store,audit,actor}=await setup();const stale=structuredClone(audit.sections);await store.compactAuditEvidenceStorage();
  store.updateFiveSAudit(audit.id,{sections:stale,title:'Edited after migration'},actor);
  expect(values.get(key)).not.toContain(dataUrl);expect(store.getFiveSAuditById(audit.id)!.sections[0].questions[0].evidence![0].storageKey).toBeTruthy();expect(assets.blobs.size).toBe(1);
 });
 it('preserves source records when IndexedDB cannot confirm the asset write',async()=>{
  const {store,audit}=await setup();const before=values.get(key);vi.mocked((await import('@/lib/gemba/gemba-photo-storage')).saveGembaPhoto).mockRejectedValueOnce(new Error('Asset write failed'));
  await expect(store.compactAuditEvidenceStorage()).rejects.toThrow('Asset write failed');expect(values.get(key)).toBe(before);expect(store.getFiveSAuditById(audit.id)!.sections[0].questions[0].evidence![0].dataUrl).toBe(dataUrl);
 });
 it('keeps source records unchanged if metadata persistence fails after assets were saved',async()=>{
  const {store,audit}=await setup();const before=values.get(key),original=structuredClone(store.getFiveSAuditById(audit.id));const write=window.localStorage.setItem.bind(window.localStorage);
  vi.spyOn(window.localStorage,'setItem').mockImplementation((name,value)=>{if(name===key)throw new DOMException('quota','QuotaExceededError');write(name,value);});
  await expect(store.compactAuditEvidenceStorage()).rejects.toThrow();expect(values.get(key)).toBe(before);expect(store.getFiveSAuditById(audit.id)).toEqual(original);expect(assets.blobs.size).toBe(1);
 });
 it('rebases reference conversion on edits made during asset processing',async()=>{
  const {store,audit,actor}=await setup();vi.mocked((await import('@/lib/gemba/gemba-photo-storage')).saveGembaPhoto).mockImplementationOnce(async(name,blob)=>{store.updateFiveSAudit(audit.id,{dueDate:'2031-01-01'},actor);assets.blobs.set(name,blob);});
  await store.compactAuditEvidenceStorage();expect(store.getFiveSAuditById(audit.id)!.dueDate).toBe('2031-01-01');expect(store.getFiveSAuditById(audit.id)!.sections[0].questions[0].evidence![0].storageKey).toBeTruthy();
 });
 it('shares durable evidence references between the Action and Audit question without base64 copies',async()=>{
  const {store,audit,actor}=await setup();await store.compactAuditEvidenceStorage();const photo=store.getFiveSAuditById(audit.id)!.sections[0].questions[0].evidence![0];const linked=await import('@/features/actions/create-linked-action-dialog');
  const action=linked.createCanonicalLinkedAction({source:'Audit',sourceModule:'audit',sourceId:audit.id,sourceObservationId:'Q-QUOTA',sourceObservation:'Original wording',title:'Correct storage',description:'Preserve evidence',plant:audit.plant,zone:audit.area,location:audit.department,evidence:[{id:photo.id,name:photo.name,type:photo.type,storageKey:photo.storageKey,uploadedAt:photo.uploadedAt,uploadedBy:photo.uploadedBy}],auditQuestion:{auditId:audit.id,questionId:'Q-QUOTA'}},'USR-RUMESH',actor,'Safety','Medium','2030-12-20');
  expect(store.linkAuditQuestionAction(audit.id,'Q-QUOTA',action.id,actor)).toBe(true);expect(values.get(key)).not.toContain(dataUrl);expect(values.get('standalone-5s-actions')).not.toContain(dataUrl);expect(store.getFiveSAuditById(audit.id)!.sections[0].questions[0]).toMatchObject({actionId:action.id,evidence:[{storageKey:photo.storageKey,dataUrl:''}]});
 });
 it('keeps malformed legacy payloads and remote URLs intact',async()=>{
  const helper=await import('@/lib/five-s/audit-evidence-storage');const base={id:'BAD',name:'legacy.png',type:'image' as const,size:1,uploadedAt:'2026-10-19',uploadedBy:'Lakshman'};
  for(const dataUrl of ['data:image/png;base64,INVALID!','/demo-5s/good-example.png']){const photo={...base,dataUrl};expect(await helper.persistAuditEvidence(photo)).toBe(photo);}expect(assets.blobs.size).toBe(0);
 });
});
