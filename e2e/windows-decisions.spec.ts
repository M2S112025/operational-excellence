import {test,expect,type Page} from '@playwright/test';
import {state,reachable} from './windows-helpers';
import {RED_TAG_DECISIONS,RED_TAG_DECISION_LABELS,type RedTagDecision} from '../features/five-s/red-tag/types';
async function fixture(page:Page){
 await page.addInitScript(decisions=>{
  if(location.origin!=='http://127.0.0.1:4179')throw new Error('Isolated synthetic fixture only');if(localStorage.getItem('ops-decision-ui-seeded'))return;
  localStorage.setItem('ops-decision-ui-seeded','1');localStorage.setItem('5s-auth-session',JSON.stringify({authenticated:true,username:'admin',version:1}));localStorage.setItem('five-s-demo-role','auditor');localStorage.setItem('ops-red-tag-original-reset-v1','done');
  localStorage.setItem('five-s-red-tags-v1',JSON.stringify(decisions.map(decision=>({id:'RT-UI-'+decision,tagNumber:'RT-UI-'+decision,plant:'Egmore Plant',zone:'Zone A',section:'Stores',department:'Stores',category:'Tools',itemName:'Synthetic '+decision,reason:'Unused',remarks:'Decision UI verification',imageUrl:'/demo-5s/not-good-example.png',createdById:'USR-LAKSHMAN',createdByName:'Lakshman',createdAt:'2026-10-18T09:00:00Z',status:'Open',history:[]}))));
 },RED_TAG_DECISIONS);
}
async function record(page:Page,decision:RedTagDecision){return page.evaluate(id=>JSON.parse(localStorage.getItem('five-s-red-tags-v1')!).find((t:{id:string})=>t.id===id),'RT-UI-'+decision);}
for(const {width,height} of [{width:1280,height:600},{width:1024,height:600},{width:911,height:512},{width:1440,height:900}])test(`All seven decision forms, Back and submission at ${width}x${height}`,async({page},info)=>{
 test.setTimeout(180000);await page.setViewportSize({width,height});await fixture(page);
 await page.goto('/5s/red/RT-UI-keep',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Submit for Review',exact:true}).click();const baseline=await record(page,'keep');
 await page.evaluate(()=>localStorage.setItem('five-s-demo-role','responsible'));await page.reload({waitUntil:'networkidle'});for(const name of RED_TAG_DECISIONS)await expect(page.getByRole('button',{name:RED_TAG_DECISION_LABELS[name],exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Record Decision',exact:true})).toHaveCount(0);expect(await record(page,'keep')).toEqual(baseline);await page.evaluate(()=>localStorage.setItem('five-s-demo-role','auditor'));await page.reload({waitUntil:'networkidle'});

 for(const decision of RED_TAG_DECISIONS){
  for(const name of RED_TAG_DECISIONS)await expect(page.getByRole('button',{name:RED_TAG_DECISION_LABELS[name],exact:true})).toBeVisible();
  await page.getByRole('button',{name:RED_TAG_DECISION_LABELS[decision],exact:true}).click();const form=page.getByRole('region',{name:RED_TAG_DECISION_LABELS[decision]+' confirmation'});await expect(form).toBeVisible();
  for(const name of RED_TAG_DECISIONS)await expect(page.getByRole('button',{name:RED_TAG_DECISION_LABELS[name],exact:true})).toHaveCount(0);
  const input=page.getByLabel(decision==='keep'?'Keep Justification':'Review Comments',{exact:true});await expect(input).toHaveValue('');await input.fill('Draft exclusively for '+decision);
  const back=page.getByRole('button',{name:'Back / Edit Decision',exact:true});const submit=page.getByRole('button',{name:decision==='keep'?'Confirm Keep & Close':'Record Decision',exact:true});
  for(const control of [back,submit]){await reachable(page,control,info,decision+'-confirmation');const r=(await control.boundingBox())!;expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(width);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await back.click();expect(await record(page,'keep')).toEqual(baseline);await expect(page.getByRole('button',{name:RED_TAG_DECISION_LABELS[decision],exact:true})).toHaveAttribute('aria-pressed','true');
 }
 for(const decision of RED_TAG_DECISIONS){await page.getByRole('button',{name:RED_TAG_DECISION_LABELS[decision],exact:true}).click();await expect(page.getByLabel(decision==='keep'?'Keep Justification':'Review Comments',{exact:true})).toHaveValue('Draft exclusively for '+decision);await page.getByRole('button',{name:'Back / Edit Decision',exact:true}).click();expect(await record(page,'keep')).toEqual(baseline);}
 for(const decision of RED_TAG_DECISIONS){
  if(decision!=='keep'){await page.goto('/5s/red/RT-UI-'+decision,{waitUntil:'networkidle'});await page.getByRole('button',{name:'Submit for Review',exact:true}).click();}
  await page.getByRole('button',{name:RED_TAG_DECISION_LABELS[decision],exact:true}).click();const input=page.getByLabel(decision==='keep'?'Keep Justification':'Review Comments',{exact:true});if(decision==='keep'){await input.fill(' ');await page.getByRole('button',{name:'Confirm Keep & Close',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Enter a justification'})).toBeVisible();expect((await record(page,decision)).status).toBe('Under Review');}await input.fill('Final '+decision+' input');await state(page,info,decision+'-final-form');
  await page.screenshot({path:info.outputPath(decision+'-confirmation.png'),fullPage:true});const submit=page.getByRole('button',{name:decision==='keep'?'Confirm Keep & Close':'Record Decision',exact:true});await submit.evaluate(el=>{(el as HTMLButtonElement).click();(el as HTMLButtonElement).click();});
  const saved=await record(page,decision);expect(saved.status).toBe(decision==='keep'?'Closed':'Decision Made');expect(saved.decisionRecord.type).toBe(decision);expect(saved.history.filter((e:{type:string})=>e.type==='decision_recorded')).toHaveLength(1);await expect(page.getByRole('button',{name:'Back / Edit Decision',exact:true})).toHaveCount(0);
  if(decision==='keep'){expect(saved.keepConfirmation.justification).toBe('Final keep input');expect(saved.keepConfirmation.confirmedAt).toBe(saved.closedAt);expect(saved.keepConfirmation.confirmedByUserId).toBe('USR-LAKSHMAN');await expect(page.getByText('Kept · Closed',{exact:true})).toBeVisible();}
  else{expect(saved.decisionRecord.comments).toBe('Final '+decision+' input');await expect(page.getByRole('heading',{name:decision==='further_evaluation'?'Further Evaluation':'How will this be handled?',exact:true})).toBeVisible();}
  await page.reload({waitUntil:'networkidle'});expect(await record(page,decision)).toEqual(saved);await expect(page.getByRole('button',{name:'Back / Edit Decision',exact:true})).toHaveCount(0);
 }
});
