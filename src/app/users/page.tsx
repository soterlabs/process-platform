"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { useMe } from "@/lib/use-me";
import { hasRole, ROLES } from "@/lib/roles";
import type { Group, GroupMembership, User } from "@/entities/principal";

function AddToGroupDropdown({
  userId,
  availableGroups,
  isAdding,
  onAdd,
  isOpen,
  onToggle,
  onClose,
}: {
  userId: string;
  availableGroups: Group[];
  isAdding: boolean;
  onAdd: (userId: string, groupId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (availableGroups.length === 0) return null;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        disabled={isAdding}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-stone-600 bg-stone-800/60 px-2.5 py-1 text-sm text-stone-400 transition hover:border-stone-500 hover:bg-stone-700/80 hover:text-stone-300 disabled:opacity-50"
      >
        <span aria-hidden>+</span>
        Add to group
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-stone-600 bg-stone-800 py-1 shadow-xl">
          {availableGroups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                onAdd(userId, g.id);
                onClose();
              }}
              className="block w-full px-4 py-2 text-left text-sm text-stone-200 hover:bg-stone-700 hover:text-white"
            >
              <span className="font-medium">{g.id}</span>
              {g.roles?.length ? (
                <span className="ml-1.5 text-xs text-stone-500">
                  {g.roles.join(", ")}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const { me, loading: meLoading } = useMe();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<GroupMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createId, setCreateId] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [addDropdownUserId, setAddDropdownUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!meLoading && me && !hasRole(me.roles, ROLES.ADMIN)) {
      router.replace("/");
    }
  }, [meLoading, me, router]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [uRes, gRes, mRes] = await Promise.all([
        authFetch("/api/users"),
        authFetch("/api/groups"),
        authFetch("/api/group-memberships"),
      ]);
      if (!uRes.ok) throw new Error("Failed to load users");
      if (!gRes.ok) throw new Error("Failed to load groups");
      if (!mRes.ok) throw new Error("Failed to load memberships");
      const [u, g, m] = await Promise.all([
        uRes.json() as Promise<User[]>,
        gRes.json() as Promise<Group[]>,
        mRes.json() as Promise<GroupMembership[]>,
      ]);
      setUsers(u);
      setGroups(g);
      setMemberships(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (meLoading || (me && !hasRole(me.roles, ROLES.ADMIN))) return;
    load();
  }, [meLoading, me, load]);

  const handleCreate = useCallback(async () => {
    setCreateError(null);
    const id = createId.trim();
    if (!id) {
      setCreateError("User ID is required");
      return;
    }
    setCreateSubmitting(true);
    try {
      const body: { id: string; evmWalletAddress?: string; email?: string } = { id };
      const evmWalletAddress = createAddress.trim();
      if (evmWalletAddress) body.evmWalletAddress = evmWalletAddress;
      const email = createEmail.trim();
      if (email) body.email = email;
      const res = await authFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError((data as { error?: string }).error ?? "Failed to create user");
        return;
      }
      setCreateOpen(false);
      setCreateId("");
      setCreateAddress("");
      setCreateEmail("");
      setCreateError(null);
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreateSubmitting(false);
    }
  }, [createId, createAddress, createEmail, load]);

  const addToGroup = useCallback(
    async (userId: string, groupId: string) => {
      setAddingUserId(userId);
      try {
        const res = await authFetch(`/api/users/${encodeURIComponent(userId)}/groups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert((data as { error?: string }).error ?? "Failed to add to group");
          return;
        }
        await load();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to add to group");
      } finally {
        setAddingUserId(null);
      }
    },
    [load]
  );

  const removeFromGroup = useCallback(
    async (userId: string, groupId: string) => {
      const key = `${groupId}:${userId}`;
      setRemovingKey(key);
      try {
        const res = await authFetch(
          `/api/users/${encodeURIComponent(userId)}/groups/${encodeURIComponent(groupId)}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert((data as { error?: string }).error ?? "Failed to remove from group");
          return;
        }
        await load();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to remove from group");
      } finally {
        setRemovingKey(null);
      }
    },
    [load]
  );

  const membershipsByUser = memberships.reduce<Record<string, GroupMembership[]>>((acc, m) => {
    if (!acc[m.userId]) acc[m.userId] = [];
    acc[m.userId].push(m);
    return acc;
  }, {});

  if (meLoading || (me && !hasRole(me.roles, ROLES.ADMIN)) || loading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 px-6 py-24">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-stone-500 border-t-stone-300"
          aria-hidden
        />
        <p className="text-stone-400">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-red-400">{error}</p>
        <Link href="/" className="mt-4 inline-block text-stone-400 hover:text-stone-300">
          ← Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-10 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-100">
            Users
          </h1>
          <p className="mt-1 text-stone-400">
            Create users and manage their group memberships.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-lg border border-stone-600 bg-stone-800 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-stone-500 hover:bg-stone-700"
        >
          Create user
        </button>
      </div>

      <section className="rounded-xl border border-stone-700/80 bg-stone-900/50 p-6">
        <ul className="space-y-4">
          {users.length === 0 && (
            <li className="py-8 text-center text-stone-500">
              No users yet. Create one to get started.
            </li>
          )}
          {users.map((user) => {
            const userMemberships = membershipsByUser[user.id] ?? [];
            const groupIds = new Set(userMemberships.map((m) => m.groupId));
            const availableGroups = groups.filter((g) => !groupIds.has(g.id));
            return (
              <li
                key={user.id}
                className="rounded-lg border border-stone-700/60 bg-stone-800/40 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-medium text-stone-200">{user.id}</span>
                    <p className="mt-0.5 font-mono text-xs text-stone-500">
                      {[user.email, user.evmWalletAddress, user.googleId ? "Google" : null]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 border-t border-stone-700/60 pt-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">
                    Groups
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {userMemberships.length === 0 && (
                      <span className="text-sm text-stone-500">Not in any group</span>
                    )}
                    {userMemberships.map((m) => (
                      <span
                        key={`${m.groupId}:${m.userId}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-stone-600 bg-stone-800 px-2.5 py-1 text-sm text-stone-300"
                      >
                        {m.groupId}
                        <button
                          type="button"
                          onClick={() => removeFromGroup(user.id, m.groupId)}
                          disabled={removingKey === `${m.groupId}:${user.id}`}
                          className="rounded p-0.5 text-stone-500 transition hover:bg-stone-600 hover:text-red-400 disabled:opacity-50"
                          aria-label={`Remove from ${m.groupId}`}
                        >
                          {removingKey === `${m.groupId}:${user.id}` ? (
                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-500 border-t-stone-300" />
                          ) : (
                            <span aria-hidden>×</span>
                          )}
                        </button>
                      </span>
                    ))}
                    {availableGroups.length > 0 && (
                      <AddToGroupDropdown
                        userId={user.id}
                        availableGroups={availableGroups}
                        isAdding={addingUserId === user.id}
                        onAdd={addToGroup}
                        isOpen={addDropdownUserId === user.id}
                        onToggle={() =>
                          setAddDropdownUserId((prev) => (prev === user.id ? null : user.id))
                        }
                        onClose={() => setAddDropdownUserId(null)}
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-title"
        >
          <div className="w-full max-w-md rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-xl">
            <h2 id="create-user-title" className="text-lg font-semibold text-stone-100">
              Create user
            </h2>
            <p className="mt-1 text-sm text-stone-400">
              User ID is required. Wallet and email are optional (for sign-in).
            </p>
            {createError && (
              <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {createError}
              </p>
            )}
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="create-id" className="block text-sm font-medium text-stone-300">
                  User ID
                </label>
                <input
                  id="create-id"
                  type="text"
                  value={createId}
                  onChange={(e) => setCreateId(e.target.value)}
                  placeholder="e.g. alice"
                  className="mt-1 w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-stone-200 placeholder-stone-500 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                />
              </div>
              <div>
                <label htmlFor="create-email" className="block text-sm font-medium text-stone-300">
                  Email (optional)
                </label>
                <input
                  id="create-email"
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="mt-1 w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-stone-200 placeholder-stone-500 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                />
              </div>
              <div>
                <label htmlFor="create-address" className="block text-sm font-medium text-stone-300">
                  Wallet address (optional)
                </label>
                <input
                  id="create-address"
                  type="text"
                  value={createAddress}
                  onChange={(e) => setCreateAddress(e.target.value)}
                  placeholder="0x..."
                  className="mt-1 w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 font-mono text-sm text-stone-200 placeholder-stone-500 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreateOpen(false);
                  setCreateError(null);
                }}
                className="rounded-lg border border-stone-600 px-4 py-2 text-sm text-stone-300 hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createSubmitting}
                className="rounded-lg bg-stone-600 px-4 py-2 text-sm font-medium text-stone-100 hover:bg-stone-500 disabled:opacity-50"
              >
                {createSubmitting ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
