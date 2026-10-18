import { expect, test } from "@playwright/test";
import routes from "./ui-batch2-routes.json";
import { widths, seed, state } from "./ui-batch2-helpers";
for (const width of widths) test(`Batch 2 routes ${width}px`,async({page},info)=>{
  test.setTimeout(600_000);
  await page.setViewportSize({width,height:width<768?844:900});await seed(page);
  let role="auditor";
  const results: Array<Record<string,unknown>>=[];const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  for(const [index,route] of routes.entries())await test.step(route.path,async()=>{
    if(route.role!==role){if(page.url()==="about:blank")await page.goto("/dashboard");await page.evaluate(r=>localStorage.setItem("five-s-demo-role",r),route.role);role=route.role;}
    const response=await page.goto(route.path,{waitUntil:"networkidle"});
    await expect(page.locator('[data-app-content]')).toContainText(/\S/);
    const representative=[320,1440].includes(width)&&["/gemba","/continuous-improvement","/visual-management","/reports","/settings/users","/profile","/super-admin/organizations"].includes(route.path);
    const g=await state(page,info,`${width}-${index}`,representative);
    results.push({requested:route.path,pattern:route.pattern,kind:route.kind,role,url:page.url(),status:response?.status(),...g});
    expect.soft(response?.status(),route.path).toBe(200);
    for(const s of g.scrollers)if(s.scrollWidth>s.width+1)expect.soft(s.scrollLeft,route.path).toBeGreaterThan(0);
  });
  await info.attach("routes.json",{body:JSON.stringify({width,results,errors},null,2),contentType:"application/json"});
  expect.soft(errors).toEqual([]);
});
