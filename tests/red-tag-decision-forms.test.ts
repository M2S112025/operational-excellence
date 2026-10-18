import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {RedTagDecisionConfirmationForm} from '@/features/five-s/red-tag/red-tag-module';
import {RED_TAG_DECISIONS,RED_TAG_DECISION_LABELS} from '@/features/five-s/red-tag/types';
describe('Red Tag decision confirmation forms',()=>{
 it.each(RED_TAG_DECISIONS)('%s renders Back and the correct isolated confirmation input/actions',decision=>{
  const html=renderToStaticMarkup(React.createElement(RedTagDecisionConfirmationForm,{decision,comments:'Draft for '+decision,keepJustification:'Keep-only justification',error:'',onCommentsChange:()=>{},onKeepJustificationChange:()=>{},onBack:()=>{},onSubmit:()=>{}}));
  expect(html).toContain('Back / Edit Decision');expect(html).toContain(RED_TAG_DECISION_LABELS[decision]);
  if(decision==='keep'){expect(html).toContain('Keep Justification');expect(html).toContain('required=');expect(html).toContain('Confirm Keep &amp; Close');expect(html).not.toContain('Review Comments');expect(html).not.toContain('Record Decision');expect(html).not.toContain('Draft for');}
  else{expect(html).toContain('Review Comments');expect(html).toContain('Record Decision');expect(html).toContain('Draft for '+decision);expect(html).not.toContain('Keep Justification');expect(html).not.toContain('Keep-only justification');expect(html).not.toContain('Confirm Keep');}
 });
});
