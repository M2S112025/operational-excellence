/** Existing canonical Gemba link plus additive provenance metadata. No new business records. */
import { getCurrentDemoUser, type DemoUser } from '@/lib/current-user';
import { canMutateGembaWalk } from '@/features/gemba/gemba-access';
import { getGembaState, getGembaSaveError, linkGembaRedTag } from '@/features/gemba/gemba-store';
import { getRedTag } from '@/features/five-s/red-tag/store';
import { createRelationship, getRelationshipSaveError } from '@/lib/relationships/relationship-store';

export function linkGembaObservationToRedTag(walkId:string,observationId:string,redTagId:string,title?:string,actor:DemoUser=getCurrentDemoUser()):void {
  const state=getGembaState(),walk=state.walks.find(w=>w.id===walkId);
  const observation=state.observations.find(o=>o.id===observationId&&o.gembaId===walkId);
  const tag=getRedTag(redTagId);
  if(!walk||!observation||observation.type!=='Issue'||walk.status==='Completed'||!canMutateGembaWalk(walk,actor)||!tag||tag.plant!==walk.plant||tag.zone!==walk.zone) throw new Error('You cannot link this Red Tag to this Gemba observation.');
  if(observation.redTagId&&observation.redTagId!==redTagId) throw new Error('This observation already has a linked Red Tag.');
  // Persist lightweight provenance first so reload can rediscover a created record even if the source array write fails.
  const relationship=createRelationship({module:'gemba',recordId:walkId,childId:observationId},{module:'redTag',recordId:redTagId},'red-tag',{title:title||observation.title});
  const sourceSaved=observation.redTagId===redTagId||linkGembaRedTag(walkId,observationId,redTagId,actor);
  if(!sourceSaved)throw new Error('The Red Tag was created, but the Gemba source link could not be saved. Retry linking the existing Red Tag. '+getGembaSaveError());
  if(!relationship)throw new Error('The Red Tag was created, but its relationship could not be saved. Retry linking the existing Red Tag. '+getRelationshipSaveError());
}
