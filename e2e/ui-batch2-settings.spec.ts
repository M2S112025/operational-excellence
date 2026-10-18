import {test,expect} from '@playwright/test';
import {widths,seed,state,reachable} from './ui-batch2-helpers';
for(const width of widths)test(`Batch 2 settings and secondary views ${width}px`,async({page},info)=>{
 test.setTimeout(120000);await page.setViewportSize({width,height:900});await seed(page);
 await page.goto('/gemba?tab=walks',{waitUntil:'networkidle'});await state(page,info,'gemba-walk-list');await page.getByPlaceholder('Search walks, zone, or lead...').fill('No synthetic walk');await state(page,info,'gemba-walk-empty');
 await page.goto('/continuous-improvement?tab=improvements',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Pipeline view',exact:true}).click();await state(page,info,'ci-pipeline');
 await page.goto('/continuous-improvement?tab=completed',{waitUntil:'networkidle'});await state(page,info,'ci-completed');
 await page.goto('/visual-management/settings',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Edit',exact:true}).first().click();await state(page,info,'vm-board-edit');await page.getByRole('button',{name:'Add Metric',exact:true}).click();await state(page,info,'vm-inline-metric');await page.getByRole('dialog').getByRole('combobox').last().click();await state(page,info,'vm-inline-metric-popup');await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await page.goto('/settings/organization/plant',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Edit Plant',exact:true}).first().click();await state(page,info,'admin-plant-edit');await reachable(page,page.getByRole('button',{name:'Cancel',exact:true}));await page.keyboard.press('Escape');
 await page.goto('/profile?tab=security',{waitUntil:'networkidle'});await page.getByLabel('Current Password',{exact:true}).fill('synthetic-invalid');await page.getByRole('button',{name:'Update Password',exact:true}).click();await state(page,info,'profile-password-validation');
 if(width===1440){await page.goto('/reports/summary/gembaObservationSummary',{waitUntil:'networkidle'});const pdf=await page.pdf({path:info.outputPath('gemba-summary.pdf'),format:'A4',printBackground:true});expect(pdf.subarray(0,4).toString()).toBe('%PDF');expect(pdf.length).toBeGreaterThan(1000);await info.attach('summary-pdf',{path:info.outputPath('gemba-summary.pdf'),contentType:'application/pdf'});}
});
