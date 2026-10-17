import { afterEach, describe, expect, it, vi } from "vitest";
import { setup, input, creator } from "./helpers/red-tag-replacement";
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
describe("Replacement storage fault boundaries",()=>{
 it.each(["five-s-red-tags-v1","ops-red-tags-5s-v2"])("blocks writes when %s is corrupt",async key=>{const {tags,values}=await setup({[key]:"not json"});expect(tags.createRedTag(input,creator)).toBeUndefined();expect(values.get(key)).toBe("not json");expect(tags.getRedTagOperationError()).toBeTruthy();});
 it("rejects colliding new and historical IDs",async()=>{const old={id:"RT-EGM-ZB-001",tagNumber:"RT-EGM-ZB-001"};const {tags,values}=await setup({"five-s-red-tags-v1":JSON.stringify([old]),"ops-red-tags-5s-v2":JSON.stringify([{...old,workflowVersion:"5s-v2"}])});expect(tags.createRedTag(input,creator)).toBeUndefined();expect(JSON.parse(values.get(tags.RED_TAG_STORAGE_KEY)!)).toEqual([old]);});
 it("does not publish a record when persistence fails",async()=>{const {tags,localStorage}=await setup();const before=tags.getRedTags();localStorage.setItem.mockImplementation(()=>{throw new Error("Quota exceeded");});expect(tags.createRedTag(input,creator)).toBeUndefined();expect(tags.getRedTags()).toEqual(before);expect(tags.getRedTagOperationError()).toBeTruthy();});
});
