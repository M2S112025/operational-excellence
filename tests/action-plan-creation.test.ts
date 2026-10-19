import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {authenticateDemoFixture} from './helpers/demo-session';
let values:Map<string,string>;
beforeEach(()=>{
 vi.resetModules();values=new Map([['ops-red-tag-original-reset-v1','done']]);
 vi.stubGlobal('window',{localStorage:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)},alert:vi.fn()});authenticateDemoFixture();
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
async function setup(){
 const identity=await import('@/lib/current-user');const audits=await import('@/lib/five-s/audit-store');const actions=await import('@/lib/actions/action-store');const linked=await import('@/features/actions/create-linked-action-dialog');
 const auditor=identity.DEMO_USERS.auditor,leader=identity.DEMO_USERS.leader,member=identity.DEMO_USERS.responsible;
 const audit=audits.createFiveSAudit({title:'Action plan fixture',plant:'Egmore Plant',area:'Zone B',department:'Production',auditor:auditor.name,dueDate:'2030-12-20',sections:[{category:'Sort',description:'Sort',score:0,maxScore:2,questions:[{id:'PLAN-Q',category:'Sort',question:'Is the area ready?',score:0,maxScore:2,status:'Fail',observation:'Stored items block the aisle',evidence:[],actionRequired:true}]}]});
 const context: import('@/features/actions/create-linked-action-dialog').LinkedActionContext={source:'Audit',sourceModule:'audit',sourceId:audit.id,sourceTitle:audit.title,sourceObservationId:'PLAN-Q',sourceObservation:'Stored items block the aisle',title:'Clear aisle',description:'Move the stored items',plant:audit.plant,zone:audit.area,location:'Production',evidence:[{id:'INITIAL',name:'initial.jpg',type:'image',url:'data:image/jpeg;base64,initial',uploadedAt:'2026-10-19',uploadedBy:auditor.name}],requiresEvidence:true,defaultDueDate:'2030-12-20',auditQuestion:{auditId:audit.id,questionId:'PLAN-Q',questionText:'Is the area ready?',questionSource:'standard',sectionId:'Sort',category:'Sort'}};
 const create=(ownerId:string=leader.id)=>linked.createCanonicalLinkedAction(context,ownerId,auditor,'Safety','Medium','2030-12-20');
 return {identity,audits,actions,linked,auditor,leader,member,audit,context,create};
}
describe('shared Action Plan creation and ownership',()=>{
 it('creates assigned Audit Actions with editable details, real leader ownership and canonical question/evidence links',async()=>{
  const m=await setup();m.context.title='Edited action title';m.context.description='Edited execution instructions';
  expect(m.linked.getEligibleLinkedActionMembers(m.context)).toContainEqual(expect.objectContaining({id:m.leader.id}));
  const action=m.create();expect(action).toMatchObject({status:'Assigned',title:m.context.title,description:m.context.description,responsiblePersonId:m.leader.id,responsiblePersonName:m.leader.name,assignedByUserId:m.auditor.id,sourceModule:'audit',sourceId:m.audit.id,auditId:m.audit.id,questionId:'PLAN-Q',sourceObservationId:'PLAN-Q',sourceObservation:'Stored items block the aisle',issueEvidence:m.context.evidence});
  expect(m.audits.linkAuditQuestionAction(m.audit.id,'PLAN-Q',action.id,m.auditor)).toBe(true);
  expect(m.audits.getFiveSAuditById(m.audit.id)!.sections[0].questions[0]).toMatchObject({score:0,question:'Is the area ready?',actionId:action.id,evidence:[expect.objectContaining({id:'INITIAL'})]});
  vi.resetModules();expect((await import('@/lib/actions/action-store')).getActionById(action.id)).toMatchObject({responsiblePersonId:m.leader.id,sourceId:m.audit.id});
  expect((await import('@/lib/five-s/audit-store')).getFiveSAuditById(m.audit.id)!.sections[0].questions[0].actionId).toBe(action.id);
 });
 it('allows the auditor to choose an eligible member instead of the leader',async()=>{
  const m=await setup();expect(m.create(m.member.id)).toMatchObject({status:'Assigned',responsiblePersonId:m.member.id});
 });
 it('requires a title, description and required finding evidence before creating',async()=>{
  const m=await setup();const before=values.get('standalone-5s-actions');
  for(const patch of [{title:'  '},{description:'  '},{evidence:[]}]) expect(()=>m.linked.createCanonicalLinkedAction({...m.context,...patch},m.leader.id,m.auditor,'Safety','Medium','2030-12-20')).toThrow();
  expect(values.get('standalone-5s-actions')).toBe(before);
 });
 it('lets the assigned leader reassign to a zone member with a reason and prevents work by the former owner',async()=>{
  const m=await setup();const action=m.create();m.identity.setDemoRole('leader');
  expect(m.actions.reassignActionOwner(action.id,m.leader,m.member.id,'')).toBeUndefined();
  const reassigned=m.actions.reassignActionOwner(action.id,m.leader,m.member.id,'Shift coverage')!;
  expect(reassigned).toMatchObject({status:'Assigned',responsiblePersonId:m.member.id,sourceId:m.audit.id});
  expect(m.actions.startAssignedAction(action.id,m.leader)).toBeUndefined();m.identity.setDemoRole('responsible');
  expect(m.actions.startAssignedAction(action.id,m.member)?.status).toBe('In Progress');
 });
 it('lists a leader only once when the auditor is also the configured leader',async()=>{
  const m=await setup();const members=m.linked.getEligibleLinkedActionMembers({...m.context,zone:'Zone A'});
  expect(members.filter(item=>item.id===m.auditor.id)).toHaveLength(1);
 });
 it('does not publish a source link when Audit persistence fails and supports rolling back the newly created Action',async()=>{
  const m=await setup();const action=m.create();const original=m.audits.getFiveSAuditById(m.audit.id);const write=window.localStorage.setItem.bind(window.localStorage);
  vi.spyOn(window.localStorage,'setItem').mockImplementation((key,value)=>{if(key==='manufacturing-qms-five-s-audits-v1')throw new DOMException('quota','QuotaExceededError');write(key,value);});
  expect(m.audits.linkAuditQuestionAction(m.audit.id,'PLAN-Q',action.id,m.auditor)).toBe(false);expect(m.audits.getFiveSAuditById(m.audit.id)).toEqual(original);
  expect(m.actions.rollbackCreatedAction(action.id,m.auditor)).toBe(true);expect(m.actions.getActionById(action.id)).toBeUndefined();
 });
});
