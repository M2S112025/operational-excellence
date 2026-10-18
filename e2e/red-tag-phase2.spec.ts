import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { seed, state as sharedState, reachable } from './windows-helpers';
async function state(page:Page,info:TestInfo,name:string,representative=false){
 await sharedState(page,info,name,representative);
 const timeline=page.locator('ol[aria-label="Red Tag workflow"]');
 if(/\/5s\/red\/RT-[^/]+$/.test(new URL(page.url()).pathname))await expect(timeline).toHaveCount(1);
 if(!await timeline.count())return;
 const geometry=await timeline.evaluate(el=>[...el.children].map(item=>{
  const label=item.querySelector<HTMLElement>(':scope > span:last-child')!;const row=item.getBoundingClientRect(),text=label.getBoundingClientRect();
  return {label:label.textContent,left:text.left,right:text.right,top:text.top,bottom:text.bottom,rowLeft:row.left,rowRight:row.right,scrollWidth:label.scrollWidth,clientWidth:label.clientWidth};
 }));
 const outside=geometry.filter(item=>item.left<item.rowLeft-1||item.right>item.rowRight+1||item.scrollWidth>item.clientWidth+1);
 const overlaps=geometry.flatMap((a,index)=>geometry.slice(index+1).filter(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1).map(b=>[a.label,b.label]));
 await info.attach(name+'-timeline-geometry.json',{body:JSON.stringify({geometry,outside,overlaps}),contentType:'application/json'});
 expect.soft(outside,name+': timeline labels fit their stages').toEqual([]);expect.soft(overlaps,name+': timeline labels do not overlap').toEqual([]);
}
const sizes=[{width:1366,height:768},{width:1280,height:720},{width:1280,height:600},{width:1024,height:600},{width:911,height:512},{width:1440,height:900}];
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
async function role(page:Page,who:string){await page.evaluate(who=>localStorage.setItem('five-s-demo-role',who),who);await page.reload({waitUntil:'networkidle'});}
async function tag(page:Page,id:string){return page.evaluate(id=>JSON.parse(localStorage.getItem('five-s-red-tags-v1')!).find((t:{id:string})=>t.id===id),id);}
async function action(page:Page,id:string){return page.evaluate(id=>JSON.parse(localStorage.getItem('standalone-5s-actions')!).find((t:{id:string})=>t.id===id),id);}
async function createTag(page:Page,info:TestInfo){
 await page.goto('/5s/red/create',{waitUntil:'networkidle'});
 await expect(page.getByRole('combobox',{name:'Department',exact:true})).toHaveText('Production');await page.getByRole('combobox',{name:'Department',exact:true}).click();await state(page,info,'department-popup');await page.getByRole('option',{name:'Production',exact:true}).click();
 const physical=page.locator('[data-slot="card"]').filter({has:page.getByRole('heading',{name:'Physical Item',exact:true})});
 await expect(physical.getByText('Category',{exact:true})).toHaveCount(0);
 await page.getByPlaceholder('e.g. Obsolete welding fixture').fill('Synthetic fixture '+ 'long title '.repeat(12));
 await page.getByPlaceholder('Describe the item and its current condition.').fill('Long identifier '+ 'UNBROKENIDENTIFIER'.repeat(12));
 await page.getByRole('button',{name:'Usage',exact:true}).click();await page.getByRole('button',{name:'Unused',exact:true}).click();
 await page.locator('input[type=file]').first().setInputFiles({name:'before.png',mimeType:'image/png',buffer:png});
 await expect(page.getByRole('img',{name:'Before item preview',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Create Red Tag',exact:true}).click();
 await expect(page).toHaveURL(/\/5s\/red\/RT-EGM-ZB-/);return decodeURIComponent(new URL(page.url()).pathname.split('/').pop()!);
}
async function addSelfAction(page:Page,another=false,leader=false,info?:TestInfo){
 await page.getByRole('button',{name:another?'Create Another Action':'Create Linked Action',exact:true}).first().click();
 const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Assign to me',exact:true}).click();
 await expect(dialog.getByRole('button',{name:'Assign to me',exact:true})).toHaveAttribute('aria-pressed','true');
 await dialog.getByRole('button',{name:'Assign to me',exact:true}).click();await expect(dialog.getByRole('button',{name:'Assign to me',exact:true})).toHaveAttribute('aria-pressed','false');
 await dialog.getByRole('button',{name:'Assign to me',exact:true}).click();
 if(!leader){await dialog.getByRole('combobox',{name:'Responsible person',exact:true}).click();await page.getByRole('option',{name:'Siva Kumar',exact:true}).click();}
 await dialog.getByRole('combobox',{name:'Action Category',exact:true}).click();if(info)await state(page,info,'linked-action-category-popup');await page.getByRole('option').first().click();
 await expect(dialog.getByLabel('Due Date',{exact:true})).toHaveAttribute('min',await page.evaluate(()=>{const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}));await dialog.getByLabel('Due Date',{exact:true}).fill('2000-01-01');await dialog.getByRole('button',{name:'Create Action',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('past');
 await dialog.getByLabel('Due Date',{exact:true}).fill('2030-12-20');if(info)await state(page,info,'editable-due-date');
 if(leader){await dialog.getByRole('combobox',{name:'Independent reviewer',exact:true}).click();await page.getByRole('option',{name:'Lakshman',exact:true}).click();}
 await dialog.getByRole('button',{name:'Create Action',exact:true}).click();await expect(dialog).toHaveCount(0);
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('standalone-5s-actions')!));return stored[0].id as string;
}
async function submitWork(page:Page,id:string,revision:number){
 await page.goto('/actions/'+encodeURIComponent(id),{waitUntil:'networkidle'});await page.getByRole('button',{name:'Start Work',exact:true}).click();await expect.poll(async()=>(await action(page,id)).status).toBe('In Progress');
 await page.getByPlaceholder('Describe the corrective work completed...').fill('Completed work revision '+revision);
 await page.getByRole('combobox',{name:'Corrective Action Category',exact:true}).click();await page.getByRole('option').first().click();
 await page.getByRole('button',{name:'Next: Evidence',exact:true}).click();
 if(revision>1)await page.getByRole('button',{name:'Remove revision-1.png',exact:true}).click();
 await page.locator('input[type=file]').nth(1).setInputFiles({name:'revision-'+revision+'.png',mimeType:'image/png',buffer:png});
 await expect.poll(async()=> (await action(page,id)).evidence.length).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Review',exact:true}).click();
 await page.getByRole('button',{name:/^(?:Re)?submit for Review$/i}).click();
 await expect.poll(async()=> (await action(page,id)).submissionRevisions.length).toBe(revision);
}
async function closeAction(page:Page,id:string){await page.goto('/actions/'+encodeURIComponent(id)+'?mode=review',{waitUntil:'networkidle'});if(await page.getByRole('button',{name:'Review',exact:true}).getAttribute('aria-expanded')!=='true')await page.getByRole('button',{name:'Review',exact:true}).click();await page.getByRole('button',{name:'Verify & Close',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Verify & Close',exact:true}).click();await expect.poll(async()=>(await action(page,id)).status).toBe('Completed');}
for(const viewport of sizes)test(`Phase 2 complete multi-Action and rework journey ${viewport.width}x${viewport.height}`,async({page},info)=>{
 test.setTimeout(240000);await page.setViewportSize(viewport);await seed(page,'responsible');
 const id=await createTag(page,info);await expect(page.getByRole('button',{name:'Handle directly',exact:true})).toHaveCount(0);
 await role(page,'leader');await page.getByRole('button',{name:'Repair',exact:true}).click();await page.getByLabel('Review Comments',{exact:true}).fill('Approved repair');await page.getByRole('button',{name:'Record Decision',exact:true}).click();
 const first=await addSelfAction(page,false,false,info);const second=await addSelfAction(page,true,false,info);expect(second).not.toBe(first);expect((await tag(page,id)).actionIds).toEqual([first,second]);await expect(page.getByRole('link',{name:first,exact:true}).first()).toHaveAttribute('href','/actions/'+encodeURIComponent(first));
 await state(page,info,'multi-actions-created',viewport.width===911||viewport.width===1440);
 const history=page.getByTestId('red-tag-history');await expect(history).not.toHaveAttribute('open');await history.locator('summary').focus();await page.keyboard.press('Enter');await expect(history).toHaveAttribute('open');await reachable(page,history.locator('summary'),info,'tag-history');
 await expect(page.getByRole('button',{name:'Complete Disposition',exact:true})).toHaveCount(0);
 await role(page,'responsible');await submitWork(page,first,1);await role(page,'leader');if(await page.getByRole('button',{name:'Review',exact:true}).getAttribute('aria-expanded')!=='true')await page.getByRole('button',{name:'Review',exact:true}).click();await page.getByRole('button',{name:'Send Back',exact:true}).click();await page.getByPlaceholder('Explain what needs correction...').fill('Replace unclear completion evidence');await state(page,info,'rework-dialog',viewport.width===1440);await page.getByRole('dialog').getByRole('button',{name:'Send Back',exact:true}).click();await expect.poll(async()=>(await action(page,first)).status).toBe('Rework Required');
 expect((await action(page,second)).status).toBe('Assigned');await page.goto('/5s/red/'+id,{waitUntil:'networkidle'});await expect(page.getByRole('region',{name:'Linked Action rework history',exact:true}).getByText('Replace unclear completion evidence',{exact:true})).toBeVisible();await state(page,info,'actual-rework-timeline');
 await role(page,'responsible');await submitWork(page,first,2);const revised=await action(page,first);expect(revised.submissionRevisions[0].observation).toBe('Completed work revision 1');expect(revised.submissionRevisions[1].observation).toBe('Completed work revision 2');expect(revised.submissionRevisions[0].evidence[0].name).toBe('revision-1.png');expect(revised.submissionRevisions[1].evidence[0].name).toBe('revision-2.png');
 await role(page,'leader');await closeAction(page,first);await page.goto('/5s/red/'+id,{waitUntil:'networkidle'});await expect(page.getByRole('button',{name:'Complete Disposition',exact:true})).toHaveCount(0);expect((await tag(page,id)).status).toBe('Decision Made');
 await role(page,'responsible');await submitWork(page,second,1);await role(page,'leader');await closeAction(page,second);await page.goto('/5s/red/'+id,{waitUntil:'networkidle'});await expect(page.getByRole('button',{name:'Complete Disposition',exact:true})).toBeVisible();await expect(page.getByRole('img',{name:'revision-2.png',exact:true}).first()).toBeVisible();await state(page,info,'imported-after-evidence',viewport.width===1440);
 const accordion=page.locator('details').filter({has:page.getByRole('link',{name:first,exact:true})}).first();await accordion.locator(':scope > summary').focus();await page.keyboard.press('Enter');await expect(accordion).toHaveAttribute('open');await accordion.getByText(/Submission revision 1/).click();await expect(accordion.getByText('Completed work revision 1',{exact:true})).toBeVisible();await expect(accordion.getByText('Replace unclear completion evidence',{exact:true})).toBeVisible();await state(page,info,'preserved-revision-accordion',viewport.width===1440);
 await page.getByPlaceholder('Describe the completed physical work.').fill('Repaired and returned to approved location');await page.getByRole('checkbox',{name:'The responsible person confirms the disposition work is complete.',exact:true}).check();await reachable(page,page.getByRole('button',{name:'Complete Disposition',exact:true}),info,'complete-tag');await page.getByRole('button',{name:'Complete Disposition',exact:true}).click();await expect.poll(async()=>(await tag(page,id)).status).toBe('Closed');
 await page.reload({waitUntil:'networkidle'});expect((await tag(page,id)).status).toBe('Closed');await page.getByRole('button',{name:'View Report',exact:true}).click();await expect(page).toHaveURL(/\/report$/);await expect(page.getByRole('heading',{name:'Red Tag Report',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:first,exact:true}).first()).toBeVisible();await expect(page.getByRole('link',{name:second,exact:true})).toBeVisible();const description=page.locator('.red-tag-report-block').first().getByText('Long identifier '+ 'UNBROKENIDENTIFIER'.repeat(12),{exact:true});expect(await description.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Report description must wrap').toBe(true);await state(page,info,'multi-action-report',viewport.width===911);
});
for(const viewport of sizes)test(`Phase 2 Keep direct closure ${viewport.width}x${viewport.height}`,async({page},info)=>{
 test.setTimeout(90000);await page.setViewportSize(viewport);await seed(page,'responsible');const id=await createTag(page,info);await role(page,'leader');await page.getByRole('button',{name:'Keep',exact:true}).click();await expect(page.getByLabel('Review Comments',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Record Decision',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Confirm Keep & Close',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Enter a justification'})).toBeVisible();await page.getByLabel('Keep Justification',{exact:true}).fill('Retain calibrated master');await state(page,info,'keep-confirmation',viewport.width===1440);await page.getByRole('button',{name:'Confirm Keep & Close',exact:true}).evaluate(el=>{(el as HTMLButtonElement).click();(el as HTMLButtonElement).click();});const closed=await tag(page,id);expect(closed.status).toBe('Closed');expect(closed.history.filter((event:{type:string})=>event.type==='closed')).toHaveLength(1);await page.reload({waitUntil:'networkidle'});expect(await tag(page,id)).toEqual(closed);await state(page,info,'keep-closed');
});
for(const width of [320,1440])test(`Phase 2 Zone Leader owns own-zone Action ${width}px`,async({page},info)=>{
 test.setTimeout(120000);await page.setViewportSize({width,height:900});await seed(page,'leader');const id=await createTag(page,info);await page.getByRole('button',{name:'Repair',exact:true}).click();await page.getByRole('button',{name:'Record Decision',exact:true}).click();const own=await addSelfAction(page,false,true,info);expect((await action(page,own)).reviewerId).toBe('USR-LAKSHMAN');await state(page,info,'leader-self-action');await submitWork(page,own,1);await expect(page.getByRole('button',{name:'Verify & Close',exact:true})).toHaveCount(0);await role(page,'auditor');await closeAction(page,own);await page.goto('/5s/red/'+id,{waitUntil:'networkidle'});await role(page,'leader');await expect.poll(async()=>(await tag(page,id)).status).toBe('Disposition In Progress');await expect(page.getByRole('img',{name:'revision-1.png',exact:true}).first()).toBeVisible();
 const linked=page.locator('details[data-linked-action="'+own+'"]');await linked.locator(':scope > summary').click();await linked.getByText(/Submission revision 1/).click();await linked.getByRole('button',{name:'View revision-1.png',exact:true}).click();await expect(page.getByRole('dialog').getByRole('img',{name:'revision-1.png',exact:true})).toBeVisible();await state(page,info,'submission-evidence-preview');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
});
for(const width of [320,1440])test(`Phase 2 long-text report ${width}px`,async({page},info)=>{
 test.setTimeout(90000);await page.setViewportSize({width,height:900});await seed(page,'responsible');const id=await createTag(page,info);await role(page,'leader');await page.getByRole('button',{name:'Keep',exact:true}).click();await page.getByLabel('Keep Justification',{exact:true}).fill('Retain long-description fixture');await page.getByRole('button',{name:'Confirm Keep & Close',exact:true}).click();await expect.poll(async()=>(await tag(page,id)).status).toBe('Closed');await page.getByRole('button',{name:'View Report',exact:true}).click();await expect(page).toHaveURL(/\/report$/);await expect(page.getByRole('heading',{name:'Red Tag Report',exact:true})).toBeVisible();const description=page.locator('.red-tag-report-block').first().getByText('Long identifier '+ 'UNBROKENIDENTIFIER'.repeat(12),{exact:true});await page.screenshot({path:info.outputPath('long-report-description.png'),fullPage:true});expect(await description.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Report description must wrap').toBe(true);await state(page,info,'long-report');
});
