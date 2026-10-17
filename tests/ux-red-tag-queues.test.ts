import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import type { NewRedTag } from '@/features/five-s/red-tag/types';
const fixture=vi.hoisted(()=>({query:'',role:'responsible' as 'responsible'|'leader',tags:[] as NewRedTag[]}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()}),usePathname:()=>'/5s/red'}));
vi.mock('@/lib/navigation/use-url-state',()=>({useUrlState:()=>({path:'/5s/red?'+fixture.query,params:new URLSearchParams(fixture.query),update:vi.fn()})}));
vi.mock('@/lib/current-user',async original=>{const actual=await original<typeof import('@/lib/current-user')>();return {...actual,useCurrentUser:()=>actual.DEMO_USERS[fixture.role]};});
vi.mock('@/features/five-s/red-tag/store',async original=>({...await original<typeof import('@/features/five-s/red-tag/store')>(),useRedTags:()=>fixture.tags}));
vi.mock('@/features/five-s/administration/store',async original=>{const actual=await original<typeof import('@/features/five-s/administration/store')>();return {...actual,useAdminUsers:()=>actual.ADMIN_USER_SEEDS};});
import { RedTagListPage } from '@/features/five-s/red-tag/red-tag-module';
import { UiPreferencesProvider } from '@/components/preferences/ui-preferences-provider';
function record(id:string,changes:Partial<NewRedTag>={}):NewRedTag{return {id,tagNumber:id,workflowVersion:'5s-v2',plant:'Egmore Plant',zone:'Zone B',section:'Production',itemName:id,quantity:1,reason:'Waste',remarks:'Fixture',requiredAction:'Remove waste',status:'Open',createdById:'USR-LAKSHMAN',createdByName:'Lakshman',createdAt:'2026-10-17T10:00:00Z',history:[],...changes};}
function render(){return renderToStaticMarkup(React.createElement(UiPreferencesProvider,null,React.createElement(RedTagListPage)));}
afterEach(()=>{fixture.query='';fixture.role='responsible';fixture.tags=[];});
it('defaults member queue to assigned records while retaining an explicit all-visible option',()=>{fixture.tags=[record('OWN',{responsiblePersonId:'USR-SIVA-KUMAR'}),record('OTHER',{responsiblePersonId:'USR-MADAVAN'})];expect(render()).toContain('OWN');expect(render()).not.toContain('>OTHER<');fixture.query='queue=all';expect(render()).toContain('>OTHER<');});
it('leader planning queue excludes other Zones and unauthorized Plants',()=>{fixture.role='leader';fixture.query='queue=planning';fixture.tags=[record('PLAN-B'),record('PLAN-C',{zone:'Zone C'}),record('FOREIGN',{plant:'Other Plant'})];const html=render();expect(html).toContain('PLAN-B');expect(html).not.toContain('PLAN-C');expect(html).not.toContain('FOREIGN');expect(html).toContain('plan work and assign a member');});
it('review queue and URL status/search filters agree without changing records',()=>{fixture.role='leader';fixture.query='queue=review&status=Awaiting+Review&search=READY';fixture.tags=[record('READY',{status:'Awaiting Review'}),record('RAISED')];const before=structuredClone(fixture.tags);const html=render();expect(html).toContain('READY');expect(html).not.toContain('>RAISED<');expect(fixture.tags).toEqual(before);});

it('opens all-visible KPI queues independently of the member personal default',()=>{fixture.tags=[record('RAISED-UNASSIGNED')];fixture.query='queue=all&status=Raised';const html=render();expect(html).toContain('RAISED-UNASSIGNED');expect(html).toContain('/5s/red?queue=all&amp;status=Raised');});
