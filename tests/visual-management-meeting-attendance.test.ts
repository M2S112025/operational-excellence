import { describe, expect, it, vi } from "vitest";

describe("Visual Management meeting attendance", () => {
  it("tracks expected, added users and guests, then freezes the completed snapshot", async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); }, removeItem: (key: string) => { storage.delete(key); } } });
    const store = await import("@/features/visual-management/visual-management-store");
    const board = store.getVisualManagementBoard("VM-ZA-T1")!;
    const meeting = store.startVisualManagementMeeting(board.id, board.owner, {
      scheduleId: "schedule-attendance-test", occurrenceDate: "2026-10-12", scheduledTime: "09:30", durationMinutes: 30,
      attendees: [{ ...board.owner, attendance: "Absent", expected: true }, { id: "GUEST-EXPECTED", name: "Expected Guest", guest: true, attendance: "Absent", expected: true }],
    })!;
    expect(meeting.participants.filter((person) => person.attendance === "Present")).toHaveLength(0);
    expect(store.setMeetingAttendance(meeting.id, board.owner.id, "Present", { id: "USR-LAKSHMAN" })?.participants.filter((person) => person.attendance === "Present")).toHaveLength(1);
    expect(store.addMeetingAttendee(meeting.id, { id: "USR-RITIKA", name: "Ritika" }, { id: "USR-LAKSHMAN" })?.participants.find((person) => person.id === "USR-RITIKA")).toMatchObject({ attendance: "Present", manuallyAdded: true, expected: false });
    expect(store.addMeetingAttendee(meeting.id, { id: "USR-RITIKA", name: "Ritika" }, { id: "USR-LAKSHMAN" })).toBeNull();
    expect(store.addMeetingGuest(meeting.id, "  ", undefined, { id: "USR-LAKSHMAN" })).toBeNull();
    const withGuest = store.addMeetingGuest(meeting.id, "Visitor", "Supplier", { id: "USR-LAKSHMAN" })!;
    const guest = withGuest.participants.find((person) => person.name === "Visitor")!;
    expect(guest).toMatchObject({ guest: true, companyOrRole: "Supplier", attendance: "Present" });
    expect(store.removeMeetingAttendee(meeting.id, board.owner.id, { id: "USR-LAKSHMAN" })).toBeNull();
    expect(store.removeMeetingAttendee(meeting.id, guest.id, { id: "USR-LAKSHMAN" })?.participants.some((person) => person.id === guest.id)).toBe(false);
    expect(store.removeMeetingAttendee(meeting.id, "USR-RITIKA", { id: "USR-LAKSHMAN" })?.participants.some((person) => person.id === "USR-RITIKA")).toBe(false);
    const completed = store.completeVisualManagementMeeting(meeting.id, { id: "USR-LAKSHMAN" })!;
    expect(completed.participants.find((person) => person.id === board.owner.id)?.attendance).toBe("Present");
    expect(store.setMeetingAttendance(meeting.id, board.owner.id, "Absent", { id: "USR-LAKSHMAN" })).toBeNull();
    expect(store.addMeetingGuest(meeting.id, "Late Guest", undefined, { id: "USR-LAKSHMAN" })).toBeNull();
    expect(store.startVisualManagementMeeting(board.id, board.owner, { scheduleId: "schedule-attendance-test", occurrenceDate: "2026-10-12", scheduledTime: "09:30", durationMinutes: 30, attendees: [] })).toBeNull();
    expect(store.getVisualManagementMeeting(meeting.id)?.participants).toEqual(completed.participants);
    vi.unstubAllGlobals();
  });
});
