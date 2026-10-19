import { expect, test } from '@playwright/test';
import { GEMBA_SEED_STATE } from '../features/gemba/gemba-store';
import { seed, settle } from './ui-batch2-helpers';

for (const viewport of [{width:320,height:640},{width:878,height:935},{width:911,height:512},{width:1024,height:600},{width:1440,height:900}]) {
  test(`Observation preview scroll and evidence ${viewport.width}x${viewport.height}`, async ({page}, info) => {
    await page.setViewportSize(viewport);
    await seed(page);
    await page.goto('/gemba/GEM-2026-014?tab=observations', {waitUntil:'domcontentloaded'});
    const card = page.locator('article').filter({has:page.getByRole('heading',{name:'Material blocking emergency exit',exact:true})});
    await card.getByRole('button',{name:'View',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Material blocking emergency exit',exact:true});
    await expect(dialog).toBeVisible(); await settle(page);
    await page.screenshot({path:info.outputPath('preview-top.png'),animations:'disabled'});
    const close=dialog.getByRole('button',{name:'Close',exact:true});
    const toolbar=close.locator('..');
    const id=toolbar.getByText('GEM-2026-014-OBS-01',{exact:true});
    const closeBox=(await close.boundingBox())!; const idBox=(await id.boundingBox())!;
    expect(idBox.x+idBox.width).toBeLessThanOrEqual(closeBox.x);
    await close.click({trial:true});
    const bounds=await dialog.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0); expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(viewport.height);
    await info.attach('scroll-geometry.json',{body:JSON.stringify(await dialog.evaluate(el=>[el,...el.querySelectorAll('div')].filter(x=>getComputedStyle(x).overflowY==='auto').map(x=>({height:x.clientHeight,content:x.scrollHeight,top:x.getBoundingClientRect().top,bottom:x.getBoundingClientRect().bottom})))),contentType:'application/json'});
    const scroll=dialog.getByRole('region',{name:'Observation details'});
    await expect(scroll).toBeVisible();
    expect(await scroll.evaluate(el=>el.scrollHeight)).toBeGreaterThan(await scroll.evaluate(el=>el.clientHeight));
    await scroll.hover(); await page.mouse.wheel(0,2000);
    await expect.poll(()=>scroll.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
    const link=dialog.getByRole('link',{name:/Action/}).last();
    await link.scrollIntoViewIfNeeded(); await link.click({trial:true});
    await page.screenshot({path:info.outputPath('preview-follow-up.png'),animations:'disabled'});
    expect(await scroll.evaluate(el=>el.scrollWidth)).toBeLessThanOrEqual(await scroll.evaluate(el=>el.clientWidth));
    await scroll.focus(); await page.keyboard.press('Home'); await page.keyboard.press('Control+Home');
    await scroll.evaluate(el=>el.scrollTop=0);
    await dialog.getByRole('button',{name:/View full size/}).first().click();
    await expect(page.getByRole('button',{name:'Zoom in',exact:true})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button',{name:'Zoom in',exact:true})).not.toBeVisible();
    await expect(dialog.getByRole('heading',{name:'Material blocking emergency exit',exact:true})).toBeVisible();
    await close.click(); await expect(dialog).not.toBeVisible();
    await expect(card.getByRole('button',{name:'View',exact:true})).toBeFocused();
    // Stress only synthetic context storage; preserve the original fixture ID and relationships.
    await page.evaluate((state) => {
      const observation=state.observations.find((item:{id:string})=>item.id==='GEM-2026-014-OBS-01');
      if (!observation) throw new Error('Missing synthetic Gemba observation fixture');
      observation.description=('Long observation context. '+ 'identifier'.repeat(35)+'\n').repeat(12);
      observation.horizontalDeployment={enabled:true,createdAt:observation.createdAt,updatedAt:observation.createdAt,targetZoneIds:['Zone A','Zone B','Zone C'],recipients:[
        {zoneId:'Zone A',zoneName:'Zone A',leaderName:'Lakshman',notificationStatus:'shared'},
        {zoneId:'Zone B',zoneName:'Zone B',leaderName:'Rumesh',notificationStatus:'shared'},
        {zoneId:'Zone C',zoneName:'Zone C',leaderName:'Synthetic final recipient',notificationStatus:'shared'}]};
      observation.evidence[0].note='Evidence description '+ 'long-caption-'.repeat(35);
      localStorage.setItem('ops-gemba-v1',JSON.stringify(state));
    }, GEMBA_SEED_STATE);
    await page.reload({waitUntil:'domcontentloaded'});
    await card.getByRole('button',{name:'View',exact:true}).click(); await settle(page);
    expect(await scroll.evaluate(el=>el.scrollWidth)).toBeLessThanOrEqual(await scroll.evaluate(el=>el.clientWidth));
    await scroll.focus(); await page.keyboard.press('End');
    await expect.poll(()=>scroll.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
    const recipient=dialog.getByText('Zone Leader · Synthetic final recipient',{exact:true});
    await recipient.scrollIntoViewIfNeeded(); await expect(recipient).toBeInViewport();
    await page.screenshot({path:info.outputPath('preview-deployment-bottom.png'),animations:'disabled'});
    const closeAfter=(await close.boundingBox())!;
    expect(closeAfter.y).toBe(closeBox.y);
    await close.click({trial:true}); await close.click();
    await expect(dialog).not.toBeVisible();
  });
}
