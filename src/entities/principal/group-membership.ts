export type GroupMembership = {
  userId: string;
  groupId: string;
  addedAt: string;
  addedById: string;
};

export function groupMembershipKey(groupId: string, userId: string): string {
  return `${groupId}:${userId}`;
}
