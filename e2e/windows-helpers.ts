import {expect,type Page,type TestInfo,type Locator} from '@playwright/test';
import {state as horizontalState,settle,seed} from './ui-batch2-helpers';
export {seed,settle};
export const viewports=[{width:1366,height:768},{width:1280,height:720},{width:1280,height:600},{width:1024,height:600},{width:1024,height:768},{width:1440,height:900},{width:1093,height:614},{width:911,height:512}].filter(v=>!process.env.OPS_WINDOWS_SIZES||process.env.OPS_WINDOWS_SIZES.split(',').includes(`${v.width}x${v.height}`));
export async function reachable(page:Page,control:Locator,info?:TestInfo,name='control'){
 if(await control.getAttribute('role')==='listbox'){
  const r=(await control.boundingBox())!;const size=page.viewportSize()!;expect(r).not.toBeNull();expect.soft(r.y).toBeGreaterThanOrEqual(-1);expect.soft(r.y+r.height).toBeLessThanOrEqual(size.height+1);expect.soft(r.x).toBeGreaterThanOrEqual(-1);expect.soft(r.x+r.width).toBeLessThanOrEqual(size.width+1);return;
 }
 await control.scrollIntoViewIfNeeded();
 await page.evaluate(async()=>{const visible=[...document.querySelectorAll<HTMLImageElement>('[role="dialog"] img')].filter(img=>{const r=img.getBoundingClientRect();return img.complete||(r.top<innerHeight&&r.bottom>0);});await Promise.race([Promise.all(visible.map(img=>img.decode().catch(()=>undefined))),new Promise(resolve=>setTimeout(resolve,1500))]);});
 await control.scrollIntoViewIfNeeded();await control.focus();await settle(page);
 const result=await control.evaluate(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {text:el.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,hit:hit?.outerHTML.slice(0,300),focused:document.activeElement===el,unobscured:!!hit&&(el===hit||el.contains(hit))};});
 const size=page.viewportSize()!;const bad=result.left< -1||result.right>size.width+1||result.top< -1||result.bottom>size.height+1||!result.unobscured;
 if(info){await info.attach(`${name}-reachability.json`,{body:JSON.stringify({url:page.url(),...result}),contentType:'application/json'});if(bad)await page.screenshot({path:info.outputPath(`${name}-obscured.png`),animations:'disabled'});}
 expect.soft(result.left,name).toBeGreaterThanOrEqual(-1);expect.soft(result.right,name).toBeLessThanOrEqual(size.width+1);expect.soft(result.top,name).toBeGreaterThanOrEqual(-1);expect.soft(result.bottom,name).toBeLessThanOrEqual(size.height+1);expect.soft(result.unobscured,`${name}: focused control hit test`).toBe(true);
 await control.click({trial:true,timeout:5000});
}
export async function state(page:Page,info:TestInfo,name:string,representative=false){
 const g=await horizontalState(page,info,name,representative);
 const popups=await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>('[role="dialog"],[role="alertdialog"],[role="listbox"],[role="menu"],[data-slot="popover-content"]')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&!el.closest('[inert],[aria-hidden="true"]')&&getComputedStyle(el).visibility!=='hidden';}).map(el=>{const r=el.getBoundingClientRect();return {role:el.getAttribute('role'),text:el.textContent?.slice(0,80),left:r.left,right:r.right,top:r.top,bottom:r.bottom,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight};}));
 const size=page.viewportSize()!;const bad=popups.filter(r=>r.left< -1||r.right>size.width+1||r.top< -1||r.bottom>size.height+1);
 await info.attach(`${name}-height.json`,{body:JSON.stringify({url:page.url(),viewport:size,popups}),contentType:'application/json'});
 if(bad.length)await page.screenshot({path:info.outputPath(`${name}-height.png`),animations:'disabled'});
 expect.soft(bad,`${name}: popup viewport boundaries`).toEqual([]);
 if(await page.locator('[role="listbox"]').count()===0){
  const dialog=page.getByRole('dialog').last();if(await dialog.count()){
   const fields=dialog.locator('input:not([disabled]):not([type="hidden"]):not([type="file"]):not([aria-hidden="true"]):not([tabindex="-1"]),textarea:not([disabled]),[role="combobox"]:not([disabled])').filter({visible:true});
   if(await fields.count())await reachable(page,fields.last(),info,name+'-last-field');
   const actions=dialog.locator('[data-slot="dialog-footer"] button:not([disabled])').filter({visible:true});
   if(await actions.count())await reachable(page,actions.last(),info,name+'-footer');
  }
 }
 return g;
}
