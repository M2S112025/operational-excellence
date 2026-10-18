import { expect, type Page, type TestInfo } from "@playwright/test";
export const widths = process.env.OPS_B2_WIDTHS ? process.env.OPS_B2_WIDTHS.split(",").map(Number) : [320,375,390,430,768,1024,1280,1440,1920];
export async function seed(page: Page, role = "auditor") {
  await page.addInitScript((identity) => {
    if (location.origin !== "http://127.0.0.1:4179") throw new Error("Batch 2 fixtures require isolated loopback origin");
    if (!localStorage.getItem("ops-b2-seeded")) {
      localStorage.setItem("5s-auth-session", JSON.stringify({ authenticated:true, username:"admin", version:1 }));
      localStorage.setItem("five-s-demo-role", identity);
      localStorage.setItem("ops-red-tag-original-reset-v1","done");
      localStorage.setItem("ops-b2-seeded","1");
    }
  }, role);
}
export async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await Promise.race([Promise.all(document.getAnimations().filter(a=>a.playState === "running" && a.effect?.getTiming().iterations !== Infinity).map(a=>a.finished.catch(()=>undefined))), new Promise(resolve=>setTimeout(resolve,1000))]);
  });
}
export async function geometry(page: Page) {
  await settle(page);
  return page.evaluate(() => {
    const outside: Array<{text:string;tag:string;left:number;right:number;cause:string;className:string}> = [];
    const unnamed: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('h1,h2,h3,button,input,textarea,[role="combobox"]')) {
      const r=el.getBoundingClientRect();
      if (!el.checkVisibility() || !r.width || !r.height || getComputedStyle(el).visibility === "hidden" || el.closest('[inert],[aria-hidden="true"]')) continue;
      let localScroll=false, clip="";
      for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement) {
        const css=getComputedStyle(p), pr=p.getBoundingClientRect();
        if (["auto","scroll"].includes(css.overflowX)&&p.scrollWidth>p.clientWidth+1) { localScroll=true; break; }
        if (["hidden","clip"].includes(css.overflowX) && pr.width && (r.left<pr.left-1||r.right>pr.right+1)) clip=`clipped by ${p.tagName}.${p.className}`;
      }
      if (!localScroll&&(r.left< -1||r.right>innerWidth+1||clip)) outside.push({text:(el.innerText||el.getAttribute("aria-label")||"").slice(0,100),tag:el.tagName,left:r.left,right:r.right,cause:clip||"viewport",className:el.className});
      if (el.tagName==="BUTTON"&&!el.innerText.trim()&&!el.getAttribute("aria-label")&&!el.getAttribute("aria-labelledby")&&!el.getAttribute("title")&&!el.querySelector('img[alt]:not([alt=""])')&&!el.closest("label")) unnamed.push(el.outerHTML.slice(0,900));
    }
    const scrollers=[...document.querySelectorAll<HTMLElement>('[data-slot="table-container"],[role="tablist"]')].filter(el=>el.getBoundingClientRect().width&&!el.closest('[inert],[aria-hidden="true"]')).map(el=>{
      const popup=document.querySelector('[role="dialog"],[role="listbox"]');
      if(!popup)el.scrollLeft=el.scrollWidth;
      const result={width:el.clientWidth,scrollWidth:el.scrollWidth,scrollLeft:el.scrollLeft};
      if(!popup)el.scrollLeft=0;
      return result;
    });
    const header=document.querySelector<HTMLElement>('[data-app-workspace] > header');
    const crumbs=header?.querySelector<HTMLElement>('nav[aria-label="breadcrumb"]');
    const hr=header?.getBoundingClientRect(),cr=crumbs?.getBoundingClientRect();
    const headerOverflow=!!hr&&!!cr&&!!cr.width&&(cr.top<hr.top-1||cr.bottom>hr.bottom+1);
    return { width:innerWidth, documentWidth:document.documentElement.scrollWidth, outside, unnamed,scrollers,headerOverflow,headings:[...document.querySelectorAll('h1')].map(el=>el.textContent) };
  });
}
export async function state(page:Page,info:TestInfo,name:string,representative=false) {
  const g=await geometry(page);
  await info.attach(`${name}.json`,{body:JSON.stringify({url:page.url(),...g},null,2),contentType:"application/json"});
  const bad=g.documentWidth>g.width+1||g.outside.length||g.unnamed.length||g.headerOverflow;
  if(bad||representative)await page.screenshot({path:info.outputPath(`${name}.png`),fullPage:await page.locator('[role="dialog"]').count()===0,animations:"disabled"});
  expect.soft(g.documentWidth,name).toBeLessThanOrEqual(g.width+1);
  expect.soft(g.outside,`${name}: clipped controls/headings`).toEqual([]);
  expect.soft(g.unnamed,`${name}: unnamed buttons`).toEqual([]);
  expect.soft(g.headerOverflow,`${name}: breadcrumbs exceed header`).toBe(false);
  return g;
}
export async function reachable(page:Page,locator:import("@playwright/test").Locator) {
  await locator.scrollIntoViewIfNeeded();
  const r=(await locator.boundingBox())!;
  expect(r).not.toBeNull();expect(r.x).toBeGreaterThanOrEqual(-1);expect(r.x+r.width).toBeLessThanOrEqual(page.viewportSize()!.width+1);
  expect(r.y).toBeGreaterThanOrEqual(-1);expect(r.y+r.height).toBeLessThanOrEqual(page.viewportSize()!.height+1);
  await locator.click({trial:true});
}
