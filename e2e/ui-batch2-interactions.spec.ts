import { expect,test } from '@playwright/test';
import { widths,seed,state,reachable } from './ui-batch2-helpers';
for(const width of widths){
 test(`Batch 2 operational forms ${width}px`,async({page},info)=>{
  test.setTimeout(180000);await page.setViewportSize({width,height:900});await seed(page);
  await page.goto('/gemba/new',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Schedule',exact:true}).click();await state(page,info,'gemba-schedule');
  await page.getByRole('button',{name:'Schedule Walk',exact:true}).click();await expect(page.locator('p[role=alert]')).toBeVisible();await state(page,info,'gemba-validation');
  await page.getByRole('button',{name:'Add other member',exact:true}).click();await page.getByPlaceholder('Search by name...').fill('No synthetic matching member');await state(page,info,'gemba-member-empty');await page.keyboard.press('Escape');
  await page.goto('/gemba/GEM-2026-015/walk',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Add Observation',exact:true}).click();await page.getByRole('button',{name:'Enter manually',exact:false}).click();await state(page,info,'gemba-observation');
  await page.getByRole('button',{name:/^Issue(?: Needs attention)?$/}).click();await page.getByPlaceholder('What needs attention?').fill('Synthetic issue '+ 'long-context-'.repeat(18));await page.getByRole('button',{name:'Save Observation',exact:true}).click();await expect(page.locator('p[role=alert]')).toBeVisible();await state(page,info,'gemba-evidence-validation');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Complete Walk',exact:true}).click();await state(page,info,'gemba-complete-review');await reachable(page,page.getByRole('button',{name:'Continue Walking',exact:true}));await page.getByRole('button',{name:'Continue Walking',exact:true}).click();
  await page.goto('/continuous-improvement/new',{waitUntil:'networkidle'});await page.getByRole('button',{name:width<640?'Submit':'Submit for Review',exact:true}).click();await state(page,info,'ci-validation');
  await page.getByPlaceholder('Example: Reduce material movement in packing area').fill('Synthetic '+ 'LongIdentifier'.repeat(25));await state(page,info,'ci-long-proposal');
  await page.getByRole('button',{name:'Connect Record',exact:true}).click();await state(page,info,'ci-related-picker');await page.keyboard.press('Escape');
  await page.goto('/continuous-improvement/CI-2026-014?tab=review',{waitUntil:'networkidle'});await expect(page.getByRole('button',{name:'Reject',exact:true})).toBeDisabled();await page.getByPlaceholder('Optional for approval; required for rejection or on hold').fill('Synthetic review '+ 'long text '.repeat(40));await expect(page.getByRole('button',{name:'Reject',exact:true})).toBeEnabled();await state(page,info,'ci-review');
  await page.goto('/continuous-improvement/CI-2026-013?tab=implementation',{waitUntil:'networkidle'});await page.getByRole('button',{name:width<640?'Submit':'Submit Completion',exact:true}).click();await state(page,info,'ci-completion-validation');
  await page.goto('/continuous-improvement/CI-2026-012?tab=review',{waitUntil:'networkidle'});await state(page,info,'ci-completion-review');
  await page.goto('/visual-management/settings',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Create Board',exact:true}).click();await state(page,info,'vm-board-editor');await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.goto('/settings/users',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Add User',exact:true}).click();await page.getByRole('button',{name:'Save User',exact:true}).click();await state(page,info,'admin-user-validation');await reachable(page,page.getByRole('button',{name:'Cancel',exact:true}));await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.goto('/settings/organization/zones',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Add Zone',exact:true}).click();await page.getByRole('button',{name:'Save Zone',exact:true}).click();await state(page,info,'admin-zone-validation');await page.keyboard.press('Escape');
  await page.goto('/profile?tab=preferences',{waitUntil:'networkidle'});const combo=page.getByRole('combobox').first();await combo.click();await state(page,info,'profile-preferences-dropdown');await page.keyboard.press('Escape');await page.keyboard.press('Tab');
 });
 test(`Batch 2 reports and filters ${width}px`,async({page},info)=>{
  test.setTimeout(120000);await page.setViewportSize({width,height:900});await seed(page);
  for(const route of ['/gemba?tab=observations','/continuous-improvement?tab=improvements','/reports']){await page.goto(route,{waitUntil:'networkidle'});const search=page.locator('input').filter({visible:true}).first();await search.fill('NoSyntheticRecordMatches987654321');await state(page,info,route.slice(1)+'-empty');await search.fill('');const combos=page.getByRole('combobox');if(await combos.count()){await combos.first().click();await state(page,info,route.slice(1)+'-filter');await page.keyboard.press('Escape');}}
  await page.goto('/reports/summary/gembaObservationSummary',{waitUntil:'networkidle'});const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.csv$/);await state(page,info,'report-summary');
  await page.emulateMedia({media:'print'});await state(page,info,'report-print');await page.emulateMedia({media:'screen'});
  await page.goto('/settings/roles',{waitUntil:'networkidle'});const matrix=page.getByLabel('Role capability matrix');await matrix.evaluate(el=>el.scrollLeft=el.scrollWidth);if(width<1280)expect(await matrix.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await state(page,info,'role-matrix',width===320||width===1440);
  await page.goto('/visual-management/boards/VM-ZA-T1/print',{waitUntil:'networkidle'});await state(page,info,'vm-print-workspace',width===320||width===1440);
 });
}
