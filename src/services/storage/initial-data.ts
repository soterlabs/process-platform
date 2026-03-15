import type { Group, GroupMembership, User } from "@/entities/principal";
import { groupMembershipKey } from "@/entities/principal";

export const initialGroups: Record<string, Group> = {
  soter: { id: "soter", type: "group", roles: ["Admin"] },
};

export const initialUsers: Record<string, User> = {
  "soter-filip": {
    id: "soter-filip",
    type: "user",
    email: "filip@soterlabs.com",
    evmWalletAddress: "0x5160c1f6423a1500a73e065298b0145d532b55A2",
  },
};

const _addedAt = new Date().toISOString();

export const initialGroupMemberships: Record<string, GroupMembership> = {
  [groupMembershipKey("soter", "soter-filip")]: {
    groupId: "soter",
    userId: "soter-filip",
    addedAt: _addedAt,
    addedById: "soter-filip",
  }
};
