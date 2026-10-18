import {test,expect} from '@playwright/test';
import routes from './windows-laptop-routes.json';
import {viewports,seed,state} from './windows-helpers';
for(const viewport of viewports)test(`Laptop route matrix ${viewport.width}x${viewport.height}`,async({page},info)=>{
 test.setTimeout(600000);await page.setViewportSize(viewport);await seed(page);let role='auditor';const errors:string[]=[];const results:Array<Record<string,unknown>>=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [index,route]of routes.entries())await test.step(route.path,async()=>{
  if(route.role!==role){if(page.url()==='about:blank')await page.goto('/dashboard');await page.evaluate(r=>localStorage.setItem('five-s-demo-role',r),route.role);role=route.role;}
  const response=await page.goto(route.path,{waitUntil:'networkidle'});await expect(page.locator('[data-app-content]')).toContainText(/\S/);const g=await state(page,info,`${index}`,viewport.width===911&&['/dashboard','/reports','/visual-management'].includes(route.path));expect.soft(response?.status(),route.path).toBe(200);results.push({requested:route.path,url:page.url(),role,...g});
 });
 await info.attach('routes.json',{body:JSON.stringify({viewport,results,errors}),contentType:'application/json'});expect.soft(errors).toEqual([]);
});
