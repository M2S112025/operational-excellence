import type { VisualManagementBoard, VisualManagementMeeting } from "./types";

export interface VisualManagementAccessUser {
  id: string;
  plant: string;
  primaryZone: string;
  isSuperAdmin: boolean;
}

export function canViewVisualManagementBoard(board: VisualManagementBoard, user: VisualManagementAccessUser, roles: readonly string[] | undefined) {
  if (getAdminUser(user.id)?.status !== "Active") return false;
  if (user.isSuperAdmin || roles?.some((role) => role === "Admin" || role === "Auditor")) return true;
  if (board.owner.id === user.id || board.members.some((member) => member.id === user.id)) return true;
  return board.plant === user.plant && Boolean(board.zone) && board.zone === user.primaryZone;
}

export function canManageVisualManagementSchedule(board: VisualManagementBoard, user: VisualManagementAccessUser, _roles: readonly string[] | undefined) {
  void _roles; // Authority comes from the current directory, not caller-supplied roles.
  return canOperateVisualManagementBoard(board, user, true);
}

export function visibleVisualManagementBoards(boards: VisualManagementBoard[], user: VisualManagementAccessUser, roles: readonly string[] | undefined) {
  return boards.filter((board) => canViewVisualManagementBoard(board, user, roles));
}

export function canViewVisualManagementMeeting(meeting: VisualManagementMeeting, boards: VisualManagementBoard[], user: VisualManagementAccessUser, roles: readonly string[] | undefined) {
  const board = boards.find((item) => item.id === meeting.boardId);
  return Boolean(board && canViewVisualManagementBoard(board, user, roles));
}

export function visibleVisualManagementMeetings(meetings: VisualManagementMeeting[], boards: VisualManagementBoard[], user: VisualManagementAccessUser, roles: readonly string[] | undefined) {
  const visibleIds = new Set(visibleVisualManagementBoards(boards, user, roles).map((board) => board.id));
  return meetings.filter((meeting) => visibleIds.has(meeting.boardId));
}

import { getAdminUser } from "@/features/five-s/administration/store";
import { getOrganizationPlants, getOrganizationZones } from "@/lib/organization-store";
import type { VisualManagementBoardConfiguration } from "./visual-management-configuration-store";
export type VisualManagementActor = { id: string };

export function canManageVisualManagementConfiguration(actor: VisualManagementActor | undefined) {
  const user = actor ? getAdminUser(actor.id) : undefined;
  return Boolean(user?.status === "Active" && user.permissions.includes("administration.manage_configuration"));
}

export function canOperateVisualManagementBoard(board: VisualManagementBoard | VisualManagementBoardConfiguration | undefined, actor: VisualManagementActor | undefined, manage = false) {
  const user = actor ? getAdminUser(actor.id) : undefined;
  if (!board || user?.status !== "Active" || board.status !== "Active") return false;
  const configured = "plantId" in board;
  const plant = configured ? getOrganizationPlants().find(item => item.id === board.plantId)?.name : board.plant;
  const zone = configured ? getOrganizationZones().find(item => item.id === board.zoneId)?.name : board.zone;
  if (user.plant !== plant && user.plant !== "All organizations") return false;
  if (user.roles.includes("Admin")) return true;
  if (user.id === (configured ? board.ownerId : board.owner.id)) return true;
  if (user.roles.includes("Zone Leader") && getOrganizationZones().some(item => item.name === zone && item.leaderId === user.id)) return true;
  return !manage && (configured ? board.memberIds.includes(user.id) : board.members.some(member => member.id === user.id));
}
