import {test,expect,type Page} from '@playwright/test';
import {seed,state,reachable} from './ui-batch2-helpers';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
function section(page:Page,title:string){return page.locator('details[data-slot="card"]').filter({has:page.locator(`:scope > summary[aria-label="${title}"]`)});}
async function toggle(page:Page,title:string){const summary=section(page,title).locator(':scope > summary');await summary.scrollIntoViewIfNeeded();await summary.focus();await summary.press('Enter');}
for(const width of [320,1440])test(`Red Tag independent accordions retain drafts ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await seed(page,'responsible');await page.goto('/5s/red/create',{waitUntil:'networkidle'});
 await page.getByPlaceholder('e.g. Obsolete welding fixture').fill('Accordion fixture');await page.getByPlaceholder('Describe the item and its current condition.').fill('Long description '.repeat(20));await page.getByRole('button',{name:'Usage',exact:true}).click();await page.getByRole('button',{name:'Unused',exact:true}).click();await page.getByLabel('Attach Red Tag images',{exact:true}).setInputFiles({name:'initial.png',mimeType:'image/png',buffer:png});await expect(page.getByRole('img',{name:'initial.png',exact:true})).toBeVisible();await page.getByRole('button',{name:'Create Red Tag',exact:true}).click();await expect(page).toHaveURL(/\/5s\/red\/RT-\d{6}$/);
 await page.evaluate(()=>localStorage.setItem('five-s-demo-role','leader'));await page.reload({waitUntil:'networkidle'});
 const saved=()=>page.evaluate(()=>localStorage.getItem('five-s-red-tags-v1'));const original=await saved();
 for(const title of ['Workflow','Item Details','Identification Images','Linked Records','Review and Decision']){
  const panel=section(page,title);await expect(panel).toHaveCount(1);await expect(panel).toHaveAttribute('open','');await toggle(page,title);await expect(panel).not.toHaveAttribute('open');
 }
 await state(page,info,'collapsed-sections',true);
 const history=page.getByTestId('red-tag-history');await expect(history).not.toHaveAttribute('open');await history.locator(':scope > summary').press('Enter');await expect(history).toHaveAttribute('open','');await history.locator(':scope > summary').press('Space');await expect(history).not.toHaveAttribute('open');
 for(const title of ['Workflow','Item Details','Identification Images','Linked Records','Review and Decision']){await toggle(page,title);await expect(section(page,title)).toHaveAttribute('open','');}
 expect(await saved()).toBe(original);
 await page.getByRole('button',{name:'Repair',exact:true}).click();await page.getByLabel('Review Comments',{exact:true}).fill('Unsaved review draft');
 await toggle(page,'Review and Decision');await expect(page.getByLabel('Review Comments',{exact:true})).not.toBeVisible();await toggle(page,'Review and Decision');await expect(page.getByLabel('Review Comments',{exact:true})).toHaveValue('Unsaved review draft');expect(await saved()).toBe(original);
 await reachable(page,page.getByRole('button',{name:'Record Decision',exact:true}));await page.getByRole('button',{name:'Record Decision',exact:true}).click();
 await expect(section(page,'How will this be handled?')).toHaveAttribute('open','');await toggle(page,'How will this be handled?');await expect(page.getByRole('button',{name:'Handle directly',exact:true})).not.toBeVisible();await toggle(page,'How will this be handled?');
 await expect(section(page,'Action Plan')).toHaveAttribute('open','');await toggle(page,'Action Plan');await expect(section(page,'Action Plan')).not.toHaveAttribute('open');await toggle(page,'Action Plan');
 await page.getByRole('button',{name:'Handle directly',exact:true}).click();await expect(section(page,'Disposition')).toHaveAttribute('open','');
 await page.locator('input[type=date]').fill('2030-12-20');await page.getByPlaceholder('Describe how this disposition will be executed.').fill('Unsaved execution draft');const recorded=await saved();
 await toggle(page,'Disposition');await toggle(page,'Disposition');await expect(page.locator('input[type=date]')).toHaveValue('2030-12-20');await expect(page.getByPlaceholder('Describe how this disposition will be executed.')).toHaveValue('Unsaved execution draft');expect(await saved()).toBe(recorded);
 await state(page,info,'expanded-drafts',true);await expect(page.getByRole('button',{name:'View QR',exact:true})).toHaveCount(1);
});
