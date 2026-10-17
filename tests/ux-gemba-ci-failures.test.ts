import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const state=vi.hoisted(()=>({allowed:true,sourceSaved:true,relationshipSaved:true,existing:undefined as string|undefined}));
const link=vi.hoisted(()=>vi.fn(()=>state.sourceSaved));const relationship=vi.hoisted(()=>vi.fn(()=>state.relationshipSaved?{id:'REL-1'}:null));
vi.mock('@/features/gemba/gemba-access',()=>({canMutateGembaWalk:()=>state.allowed}));
vi.mock('@/features/gemba/gemba-store',()=>({getGembaSaveError:()=>"",getGembaState:()=>({walks:[{id:'GEM-1',status:'In Progress'}],observations:[{id:'OBS-1',gembaId:'GEM-1',improvementId:state.existing}]}),linkGembaImprovement:link}));
vi.mock('@/lib/relationships/relationship-store',()=>({createRelationship:relationship,getRelationshipSaveError:()=>""}));
import { linkGembaObservationToImprovement } from '@/lib/gemba/gemba-relationships';
const actor={id:'USR-LAKSHMAN',name:'Lakshman',role:'Auditor',initials:'LK',plant:'Egmore Plant',primaryZone:'Zone A',isSuperAdmin:false};
afterEach(()=>{state.allowed=true;state.sourceSaved=true;state.relationshipSaved=true;state.existing=undefined;vi.clearAllMocks();});
describe('Gemba CI error propagation and safe retry',()=>{
 it('propagates source failure without claiming a relationship exists',()=>{state.sourceSaved=false;expect(()=>linkGembaObservationToImprovement('GEM-1','OBS-1','CI-1','Title',actor)).toThrow('source link could not be saved');expect(relationship).not.toHaveBeenCalled();});
 it('propagates relationship persistence failure instead of swallowing it',()=>{state.relationshipSaved=false;expect(()=>linkGembaObservationToImprovement('GEM-1','OBS-1','CI-1','Title',actor)).toThrow('relationship could not be saved');});
 it('retries metadata for the same source link without duplicating the canonical link',()=>{state.existing='CI-1';linkGembaObservationToImprovement('GEM-1','OBS-1','CI-1','Title',actor);expect(link).not.toHaveBeenCalled();expect(relationship).toHaveBeenCalledOnce();});
 it('rejects unauthorized retries even when a matching link exists',()=>{state.allowed=false;state.existing='CI-1';expect(()=>linkGembaObservationToImprovement('GEM-1','OBS-1','CI-1','Title',actor)).toThrow('cannot link');expect(relationship).not.toHaveBeenCalled();});
 it('keeps the entered form and created ID for retry and offers explicit success navigation',()=>{const s=readFileSync('features/gemba/components/create-ci-from-observation-dialog.tsx','utf8');expect(s).toContain('pendingId ? { id: pendingId } : createImprovement');expect(s).not.toContain('router.push');expect(s).toContain('Retry linking existing improvement');expect(s).toContain('Continue Gemba walk');expect(s).toContain('OpsFeedback tone="error"');});
});
