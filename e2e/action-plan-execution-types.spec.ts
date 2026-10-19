import {test,expect,type Page} from '@playwright/test';
import {seed,state,reachable} from './ui-batch2-helpers';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const photo=(name:string)=>({name,mimeType:'image/png',buffer:png});
async function role(page:Page,who:string){await page.evaluate(who=>localStorage.setItem('five-s-demo-role',who),who);await page.reload({waitUntil:'networkidle'});}
async function stored(page:Page,id:string){return page.evaluate(id=>JSON.parse(localStorage.getItem('standalone-5s-actions')!).find((item:{id:string})=>item.id===id),id);}
for(const width of [320,1440])test(`Audit Action plan, leader execution types and reassignment ${width}px`,async({page},info)=>{
 test.setTimeout(180000);await page.setViewportSize({width,height:900});await seed(page,'auditor');
 await page.goto('/audits',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Start Audit',exact:true}).first().click();
 await page.getByRole('combobox',{name:'Zone',exact:true}).click();await page.getByRole('option',{name:/Zone B/}).click();
 await page.getByRole('button',{name:'Start Audit',exact:true}).click();await expect(page.locator('[data-audit-execution]')).toBeVisible();
 await page.getByRole('button',{name:'Add Action',exact:true}).first().click();
 const dialog=page.getByRole('dialog');await expect(dialog.getByRole('heading',{name:'Create Action from Audit',exact:true})).toBeVisible();
 await expect(dialog.getByRole('combobox',{name:'Responsible person',exact:true})).toContainText('Rumesh');
 await dialog.getByRole('combobox',{name:'Responsible person',exact:true}).click();await page.getByRole('option',{name:'Siva Kumar',exact:true}).click();
 await expect(dialog.getByRole('combobox',{name:'Responsible person',exact:true})).toContainText('Siva Kumar');
 await dialog.getByRole('combobox',{name:'Responsible person',exact:true}).click();await page.getByRole('option',{name:'Rumesh',exact:true}).click();
 await dialog.getByLabel('Action Title',{exact:true}).fill('Synthetic Audit execution');await dialog.getByLabel('Action Description',{exact:true}).fill('Remove aisle obstruction with documented evidence');
 await dialog.getByRole('combobox',{name:'Action Category',exact:true}).click();await page.getByRole('option',{name:'Safety',exact:true}).click();
 await dialog.getByLabel('Due Date',{exact:true}).fill('2030-12-20');
 await dialog.getByLabel('Initial Evidence files',{exact:true}).setInputFiles(photo('initial.png'));await expect(dialog.getByRole('img',{name:'initial.png',exact:true})).toBeVisible();
 await state(page,info,'audit-action-dialog',true);await reachable(page,dialog.getByRole('button',{name:'Create Action',exact:true}));await dialog.getByRole('button',{name:'Create Action',exact:true}).click();await expect(dialog).toHaveCount(0);
 const action=await page.evaluate(()=>JSON.parse(localStorage.getItem('standalone-5s-actions')!).find((item:{title:string})=>item.title==='Synthetic Audit execution'));
 expect(action).toMatchObject({status:'Assigned',responsiblePersonId:'USR-RUMESH',sourceModule:'audit',description:'Remove aisle obstruction with documented evidence'});expect(action.issueEvidence).toHaveLength(1);
 expect(await page.evaluate(({auditId,questionId})=>JSON.parse(localStorage.getItem('manufacturing-qms-five-s-audits-v1')!).find((item:{id:string})=>item.id===auditId).sections.flatMap((s:{questions:{id:string;actionId:string}[]})=>s.questions).find((q:{id:string})=>q.id===questionId).actionId,{auditId:action.auditId,questionId:action.questionId,id:action.id})).toBe(action.id);
 await role(page,'leader');await page.goto('/actions/'+action.id,{waitUntil:'networkidle'});
 await expect(page.getByRole('button',{name:'Reassign Action Owner',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Start Action',exact:true}).click();await expect(dialog.getByRole('radio')).toHaveCount(2);await expect(dialog.locator('input[type=radio]:checked')).toHaveCount(0);await expect(dialog.getByRole('button',{name:'Confirm & Start',exact:true})).toBeDisabled();expect((await stored(page,action.id)).status).toBe('Assigned');
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(dialog).toHaveCount(0);expect((await stored(page,action.id)).status).toBe('Assigned');
 await page.getByRole('button',{name:'Start Action',exact:true}).click();await dialog.getByRole('radio',{name:'Immediate Action',exact:true}).focus();await page.keyboard.press('Space');await page.keyboard.press('ArrowDown');await expect(dialog.getByRole('radio',{name:'Corrective Action',exact:true})).toBeChecked();await page.keyboard.press('ArrowUp');await expect(dialog.getByRole('radio',{name:'Immediate Action',exact:true})).toBeChecked();await state(page,info,'start-action-type',true);
 await dialog.getByRole('button',{name:'Confirm & Start',exact:true}).evaluate(el=>{(el as HTMLButtonElement).click();(el as HTMLButtonElement).click();});
 await expect(dialog).toHaveCount(0);expect((await stored(page,action.id)).actionType).toBe('immediate');expect((await stored(page,action.id)).activityHistory.filter((e:{type:string})=>e.type==='started')).toHaveLength(1);
 await expect(page.getByRole('combobox',{name:'Corrective Action Category',exact:true})).toBeVisible();await page.getByRole('combobox',{name:'Corrective Action Category',exact:true}).click();await page.getByRole('option').first().click();
 await page.getByPlaceholder('Describe the corrective work completed...').fill('Aisle cleared immediately');await expect(page.getByLabel('Actual Cost Saving *',{exact:true})).toHaveValue('0');
 await page.getByRole('button',{name:'Next: Evidence',exact:true}).click();await page.locator('input[type=file]').last().setInputFiles(photo('completion.png'));await expect(page.getByText('completion.png',{exact:true}).filter({visible:true})).toBeVisible();
 await page.getByRole('button',{name:'Submit',exact:true}).click();await expect.poll(async()=>(await stored(page,action.id)).status).toBe('Pending Auditor Review');
 await page.reload({waitUntil:'networkidle'});expect((await stored(page,action.id)).submissionRevisions[0]).toMatchObject({actionType:'immediate',observation:'Aisle cleared immediately'});expect((await stored(page,action.id)).costSaving).toBe(0);
 await expect(page.getByRole('button',{name:'Verify & Close',exact:true})).toHaveCount(0);
 await role(page,'auditor');await page.getByRole('button',{name:'Review',exact:true}).click();await page.getByRole('button',{name:'Verify & Close',exact:true}).click();await dialog.getByRole('button',{name:'Verify & Close',exact:true}).click();await expect.poll(async()=>(await stored(page,action.id)).status).toBe('Completed');await state(page,info,'audit-action-closed');await page.goto('/actions/'+action.id+'/report',{waitUntil:'domcontentloaded'});await expect(page.getByText('Immediate Action',{exact:true})).toBeVisible();
 // A second isolated assigned record verifies the existing reassign UI and corrective branch.
 await page.evaluate(action=>{const items=JSON.parse(localStorage.getItem('standalone-5s-actions')!);items.push({...action,id:'ACT-TYPE-SECOND',title:'Synthetic corrective reassignment',status:'Assigned',actionType:undefined,evidence:[],activityHistory:[],submissionRevisions:[]});localStorage.setItem('standalone-5s-actions',JSON.stringify(items));},action);
 await role(page,'leader');await page.goto('/actions/ACT-TYPE-SECOND',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Reassign Action Owner',exact:true}).click();
 await dialog.getByRole('combobox').click();await page.getByRole('option',{name:'Siva Kumar',exact:true}).click();await dialog.getByPlaceholder('Why is this Action being reassigned?').fill('Shift coverage');await dialog.getByRole('button',{name:'Reassign',exact:true}).click();await expect(dialog).toHaveCount(0);
 expect((await stored(page,'ACT-TYPE-SECOND')).responsiblePersonId).toBe('USR-SIVA-KUMAR');await expect(page.getByRole('button',{name:'Start Action',exact:true})).toHaveCount(0);
 await role(page,'responsible');await page.getByRole('button',{name:'Start Action',exact:true}).click();await dialog.getByRole('radio',{name:'Corrective Action',exact:true}).check();await dialog.getByRole('button',{name:'Confirm & Start',exact:true}).click();
 await expect(page.getByRole('combobox',{name:'Corrective Action Category',exact:true})).toBeVisible();await page.getByPlaceholder('Describe the corrective work completed...').fill('Permanent aisle marking installed');await page.getByRole('button',{name:'Next: Evidence',exact:true}).click();await expect(page.getByText('Corrective action category is required.',{exact:true})).toBeVisible();
 await page.getByRole('combobox',{name:'Corrective Action Category',exact:true}).click();await page.getByRole('option').first().click();await page.getByRole('button',{name:'Next: Evidence',exact:true}).click();await page.locator('input[type=file]').last().setInputFiles(photo('corrective.png'));await expect(page.getByText('corrective.png',{exact:true}).filter({visible:true})).toBeVisible();await page.getByRole('button',{name:'Submit',exact:true}).click();await expect.poll(async()=>(await stored(page,'ACT-TYPE-SECOND')).status).toBe('Pending Auditor Review');expect((await stored(page,'ACT-TYPE-SECOND')).costSaving).toBe(0);await state(page,info,'corrective-action-submitted');
});
for(const width of [320,1440])test(`Red Tag editable Action Plan ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await seed(page,'responsible');await page.goto('/5s/red/create',{waitUntil:'networkidle'});
 await page.getByPlaceholder('e.g. Obsolete welding fixture').fill('Synthetic repair fixture');await page.getByPlaceholder('Describe the item and its current condition.').fill('Loose assembly');await page.getByRole('button',{name:'Usage',exact:true}).click();await page.getByRole('button',{name:'Unused',exact:true}).click();await page.locator('input[type=file]').first().setInputFiles(photo('initial.png'));await expect(page.getByRole('img',{name:'initial.png',exact:true})).toBeVisible();await page.getByRole('button',{name:'Create Red Tag',exact:true}).click();await expect(page).toHaveURL(/\/5s\/red\/RT-\d{6}$/);
 await role(page,'leader');await page.getByRole('button',{name:'Repair',exact:true}).click();await page.getByLabel('Review Comments',{exact:true}).fill('Repair assembly');await page.getByRole('button',{name:'Record Decision',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Action Plan',exact:true})).toBeVisible();await expect(page.getByText('Optional Execution Action',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Create Linked Action',exact:true}).first().click();const dialog=page.getByRole('dialog');
 await dialog.getByLabel('Action Title',{exact:true}).fill('Tighten fixture mounting');await dialog.getByLabel('Action Description',{exact:true}).fill('Use approved torque specification');await dialog.getByRole('combobox',{name:'Action Category',exact:true}).click();await page.getByRole('option',{name:'Safety',exact:true}).click();await dialog.getByRole('combobox',{name:'Responsible person',exact:true}).click();await page.getByRole('option',{name:'Siva Kumar',exact:true}).click();await dialog.getByLabel('Due Date',{exact:true}).fill('2030-12-20');await state(page,info,'red-tag-action-plan',true);await reachable(page,dialog.getByRole('button',{name:'Create Action',exact:true}));await dialog.getByRole('button',{name:'Create Action',exact:true}).click();await expect(dialog).toHaveCount(0);
 const action=await page.evaluate(()=>JSON.parse(localStorage.getItem('standalone-5s-actions')!).find((item:{title:string})=>item.title==='Tighten fixture mounting'));expect(action).toMatchObject({description:'Use approved torque specification',status:'Assigned',sourceModule:'redTag',responsiblePersonId:'USR-SIVA-KUMAR'});
 await page.reload({waitUntil:'networkidle'});await expect(page.getByRole('link',{name:action.id,exact:true}).first()).toHaveAttribute('href','/actions/'+action.id);
});

async function seedStartFixture(page:Page,sourceModule='manual',source='Manual'){
 await seed(page,'responsible');
 await page.addInitScript(({sourceModule,source})=>{
  if(localStorage.getItem('type-start-fixture'))return;
  localStorage.setItem('type-start-fixture','1');
  localStorage.setItem('ops-organization-modules-v1',JSON.stringify({'abc-manufacturing':{visualImprovement:true}}));
  localStorage.setItem('standalone-5s-actions',JSON.stringify([{id:'ACT-START-TYPE',title:'Synthetic Start Action',description:'Retain source identity and normal completion requirements',source,sourceModule,sourceId:'SOURCE-UNCHANGED',sourceTitle:'SOURCE-UNCHANGED',plant:'Egmore Plant',area:'Zone B',department:'Production',responsiblePersonId:'USR-SIVA-KUMAR',responsiblePersonName:'Siva Kumar',assignedTo:'Siva Kumar',createdByUserId:'USR-LAKSHMAN',createdByName:'Lakshman',reviewerId:'USR-LAKSHMAN',reviewerName:'Lakshman',status:'Assigned',priority:'Medium',dueDate:'2030-12-20',createdAt:'2026-10-19T10:00:00Z',evidence:[],progressEvidence:[],activityHistory:[],submissionRevisions:[]}]));
 },{sourceModule,source});
 await page.goto('/actions/ACT-START-TYPE',{waitUntil:'networkidle'});
}
for(const [sourceModule,source] of [['manual','Manual'],['audit','Audit'],['redTag','Red Tag'],['gemba','Gemba'],['continuousImprovement','Continuous Improvement'],['visualImprovement','Visual Improvement'],['visualManagement','Visual Management']])
for(const type of ['immediate','corrective'])test(`${sourceModule} stored canonical Action selects ${type} without source-driven defaults`,async({page},info)=>{
 await page.setViewportSize(type==='immediate'?{width:1024,height:600}:{width:911,height:512});await seedStartFixture(page,sourceModule,source);
 const before=await stored(page,'ACT-START-TYPE');expect(before.actionType).toBeUndefined();
 await page.getByRole('button',{name:'Start Action',exact:true}).click();const dialog=page.getByRole('dialog');
 await expect(dialog.locator('input[type=radio]:checked')).toHaveCount(0);await expect(dialog.getByRole('button',{name:'Confirm & Start',exact:true})).toBeDisabled();
 await dialog.getByRole('radio',{name:type==='immediate'?'Immediate Action':'Corrective Action',exact:true}).check();await reachable(page,dialog.getByRole('button',{name:'Confirm & Start',exact:true}));
 await state(page,info,'source-type-dialog',true);await dialog.getByRole('button',{name:'Confirm & Start',exact:true}).click();await expect(dialog).toHaveCount(0);
 const after=await stored(page,'ACT-START-TYPE');expect(after).toMatchObject({actionType:type,status:'In Progress',sourceModule,sourceId:before.sourceId,createdAt:before.createdAt,responsiblePersonId:before.responsiblePersonId,reviewerId:before.reviewerId});
 expect(after.activityHistory.filter((event:{type:string})=>event.type==='started')).toHaveLength(1);
 await page.reload({waitUntil:'networkidle'});await page.locator('summary').filter({hasText:/^Action Summary$/}).click();await expect(page.getByText(type==='immediate'?'Immediate Action':'Corrective Action',{exact:true}).filter({visible:true})).toBeVisible();
 await expect(page.getByRole('combobox',{name:'Corrective Action Category',exact:true})).toBeVisible();await expect(page.getByLabel('Actual Cost Saving *',{exact:true})).toHaveValue('0');
});
for(const width of [320,1440])test(`Start Action cancellation, quota retry, undo/restart and stale-state rejection ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await seedStartFixture(page);
 const original=await stored(page,'ACT-START-TYPE');
 await page.getByRole('button',{name:'Start Action',exact:true}).click();const dialog=page.getByRole('dialog');
 await expect(dialog.locator('input[type=radio]:checked')).toHaveCount(0);await dialog.getByRole('radio',{name:'Immediate Action',exact:true}).check();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(dialog).toHaveCount(0);expect(await stored(page,'ACT-START-TYPE')).toEqual(original);
 await page.getByRole('button',{name:'Start Action',exact:true}).click();await expect(dialog.locator('input[type=radio]:checked')).toHaveCount(0);await dialog.getByRole('radio',{name:'Corrective Action',exact:true}).check();
 await page.evaluate(()=>{const write=Storage.prototype.setItem;let fail=true;Storage.prototype.setItem=function(key,value){if(key==='standalone-5s-actions'&&fail){fail=false;throw new DOMException('Synthetic quota','QuotaExceededError');}return write.call(this,key,value);};});
 await dialog.getByRole('button',{name:'Confirm & Start',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Unable to save');expect(await stored(page,'ACT-START-TYPE')).toEqual(original);
 await dialog.getByRole('button',{name:'Confirm & Start',exact:true}).evaluate(el=>{(el as HTMLButtonElement).click();(el as HTMLButtonElement).click();});await expect(dialog).toHaveCount(0);expect((await stored(page,'ACT-START-TYPE')).activityHistory.filter((e:{type:string})=>e.type==='started')).toHaveLength(1);
 await page.getByRole('button',{name:'Undo Start Work',exact:true}).click();const undone=await stored(page,'ACT-START-TYPE');expect(undone.status).toBe('Assigned');expect(undone.actionType).toBeUndefined();expect(undone.activityHistory[0].actionType).toBe('corrective');
 await page.getByRole('button',{name:'Start Action',exact:true}).click();await expect(dialog.locator('input[type=radio]:checked')).toHaveCount(0);await dialog.getByRole('radio',{name:'Immediate Action',exact:true}).check();
 await page.evaluate(()=>{const items=JSON.parse(localStorage.getItem('standalone-5s-actions')!);const index=items.findIndex((item:{id:string})=>item.id==='ACT-START-TYPE');if(index<0)throw new Error('Missing target Action fixture');items[index]={...items[index],status:'In Progress',actionType:'corrective',activityHistory:[...items[index].activityHistory,{id:'EXTERNAL-START',type:'started',actorId:'USR-SIVA-KUMAR',actorName:'Siva Kumar',createdAt:'2026-10-19T11:00:00Z',actionType:'corrective'}]};localStorage.setItem('standalone-5s-actions',JSON.stringify(items));});
 const newer=await stored(page,'ACT-START-TYPE');await dialog.getByRole('button',{name:'Confirm & Start',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText(/changed|refresh/i);expect(await stored(page,'ACT-START-TYPE')).toEqual(newer);await state(page,info,'stale-start-denied',true);await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.evaluate(original=>localStorage.setItem('standalone-5s-actions',JSON.stringify([original])),original);await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Start Action',exact:true}).click();await dialog.getByRole('radio',{name:'Immediate Action',exact:true}).check();await page.evaluate(()=>localStorage.setItem('five-s-demo-role','leader'));await dialog.getByRole('button',{name:'Confirm & Start',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText(/not authorized/);expect(await stored(page,'ACT-START-TYPE')).toEqual(original);
});
