import { afterEach, expect, it, vi } from 'vitest';
import { setup } from './helpers/red-tag-replacement';
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
it('does not publish or cache a relationship when real browser storage fails, and retries once',async()=>{
 const {localStorage}=await setup(); const store=await import('@/lib/relationships/relationship-store');
 const from={module:'gemba' as const,recordId:'GEM-1',childId:'OBS-1'},to={module:'continuousImprovement' as const,recordId:'CI-1'};
 localStorage.setItem.mockImplementation(()=>{throw new Error('Storage unavailable');});
 expect(store.createRelationship(from,to,'improvement')).toBeNull();expect(store.getRelationshipsForRecord(from)).toEqual([]);
 localStorage.setItem.mockImplementation(()=>{});
 const created=store.createRelationship(from,to,'improvement');expect(created).toBeTruthy();expect(store.createRelationship(from,to,'improvement')?.id).toBe(created?.id);expect(store.getRelationshipsForRecord(from)).toHaveLength(1);
});
