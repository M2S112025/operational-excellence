import { defineConfig } from '@playwright/test';
import baseline from './playwright.ui.config';
export default defineConfig({...baseline, testMatch:'red-tag-phase2.spec.ts', fullyParallel:true, workers:2,
 outputDir:'test-results/red-tag-phase2',reporter:[['list'],['json',{outputFile:'test-results/red-tag-phase2-results.json'}],['html',{outputFolder:'playwright-report/red-tag-phase2',open:'never'}]]});
