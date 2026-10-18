import {defineConfig} from '@playwright/test';
import baseline from './playwright.ui.config';
const phase=process.env.OPS_WINDOWS_PHASE??'final';
export default defineConfig({...baseline,testMatch:'windows-*.spec.ts',fullyParallel:true,workers:2,outputDir:`test-results/windows-${phase}`,reporter:[['list'],['json',{outputFile:`test-results/windows-${phase}-results.json`}],['html',{outputFolder:`playwright-report/windows-${phase}`,open:'never'}]]});
