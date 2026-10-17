import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { OpsDataTable } from '@/components/ops/ops-data-table';
import { OpsFilterBar } from '@/components/ops/ops-filter-bar';
import { OpsFormField } from '@/components/ops/ops-form-field';
import { StatusBadge } from '@/components/ui/status-badge';
import { LinkedRecordsPanel } from '@/components/ops/ops-linked-records';
import { OpsRecordLoading } from '@/components/ops/ops-loading';
import { ReturnBanner, BackLink } from '@/components/ops/ops-return-link';
const render=(node:React.ReactElement)=>renderToStaticMarkup(node);
it('shares semantic desktop tables and tablet/mobile cards without duplicating row state',()=>{const html=render(React.createElement(OpsDataTable,{label:'Records',headers:['ID','Status'],mobile:React.createElement('button',null,'Open RT-1')} as unknown as React.ComponentProps<typeof OpsDataTable>,React.createElement('tr',null,React.createElement('td',null,'RT-1'),React.createElement('td',null,'Awaiting Review'))));expect(html).toContain('aria-label="Records"');expect(html).toContain('<thead');expect(html).toContain('<tbody');expect(html).toContain('lg:hidden');expect(html).toContain('hidden min-w-0 lg:block');expect(html).toContain('Open RT-1');});
it('collapses extra filters without clearing primary fields and announces expansion state',()=>{const props={primary:React.createElement('input',{'aria-label':'Search',defaultValue:'fixture'}),extra:React.createElement('input',{'aria-label':'Zone',defaultValue:'Zone B'}),onToggle:()=>{}};const closed=render(React.createElement(OpsFilterBar,{...props,expanded:false}));expect(closed).toContain('aria-expanded="false"');expect(closed).toContain('fixture');expect(closed).not.toContain('aria-label="Zone"');expect(render(React.createElement(OpsFilterBar,{...props,expanded:true}))).toContain('aria-label="Zone"');});
it('associates native field labels and announces required validation',()=>{const html=render(React.createElement(OpsFormField,{label:'Item',required:true,error:'Enter item'} as React.ComponentProps<typeof OpsFormField>,React.createElement('input',{onChange:()=>{}})));expect(html).toContain('for=');expect(html).toContain('aria-describedby=');expect(html).toContain('aria-label="required"');expect(html).toContain('role="alert"');expect(html).toContain('Enter item');});
it('retains each domain vocabulary and selected tone',()=>{for(const status of ['Raised','Awaiting Review','Pending Auditor Review','Completed'])expect(render(React.createElement(StatusBadge,{status,variant:'warning'}))).toContain(status);});
it('announces saved details and refuses an unsafe back link',()=>{expect(render(React.createElement(ReturnBanner,{message:'Details saved — submit when ready'}))).toContain('role="status"');expect(render(React.createElement(BackLink,{href:'https://evil.example'}))).toBe('');expect(render(React.createElement(BackLink,{href:'/5s/red/RT-1'}))).toContain('/5s/red/RT-1');});

it("opens confirmation before the canonical Red Tag closure command",()=>{const source=readFileSync("features/five-s/red-tag/red-tag-module.tsx","utf8");expect(source).toContain("onClick={() => setApproveOpen(true)}");expect(source).not.toContain("onClick={() => { result(approveAndCloseRedTag");expect(source).toContain("const saved = approveAndCloseRedTag(tag.id, user)");});

it('retains caller-supplied canonical links in a semantic linked-record panel',()=>{const html=render(React.createElement(LinkedRecordsPanel,{title:'Linked Action'} as React.ComponentProps<typeof LinkedRecordsPanel>,React.createElement('a',{href:'/actions/ACT-1'},'ACT-1')));expect(html).toContain('aria-label="Linked Action"');expect(html).toContain('/actions/ACT-1');});
it('uses the existing accessible record-loading state for the migrated module',()=>{const html=render(React.createElement(OpsRecordLoading,{label:'Red Tags'}));expect(html).toContain('aria-busy="true"');expect(html).toContain('Loading Red Tags');});
