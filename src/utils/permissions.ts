import { User, Event } from "../types";

export function isSuperAdmin(user?: User | null): boolean {
  return user?.role === "super_admin";
}

export function isOwnerClub(user?: User | null, clubId?: string): boolean {
  if (!user || !clubId) return false;
  const userClubId = user.clubId || user.assignedClubId;
  return user.role === "club_admin" && userClubId === clubId;
}

export function canCreateEvent(user?: User | null, clubId?: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return isOwnerClub(user, clubId);
}

export function canEditEvent(user?: User | null, event?: Event | null): boolean {
  if (!user || !event) return false;
  if (isSuperAdmin(user)) return true;
  const eventClubId = event.hostingClubId || event.clubId;
  return isOwnerClub(user, eventClubId);
}

export function canDeleteEvent(user?: User | null, event?: Event | null): boolean {
  if (!user || !event) return false;
  if (isSuperAdmin(user)) return true;
  const eventClubId = event.hostingClubId || event.clubId;
  return isOwnerClub(user, eventClubId);
}
