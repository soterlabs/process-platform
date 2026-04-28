const SLACK_API = "https://slack.com/api";

async function slackApiPost(
  method: string,
  token: string,
  fields: Record<string, string | number | boolean | undefined>
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (typeof v === "boolean") {
      params.set(k, v ? "true" : "false");
    } else {
      params.set(k, String(v));
    }
  }
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    },
    body: params.toString(),
  });
  return (await res.json()) as Record<string, unknown>;
}

export function isSlackChannelId(id: string): boolean {
  return /^[CG][A-Z0-9]+$/i.test(id.trim());
}

function isSlackUserId(s: string): boolean {
  return /^U[A-Z0-9]+$/i.test(s.trim());
}

/** Basic check for workspace email (not full RFC). */
function looksLikeEmail(s: string): boolean {
  const t = s.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

async function slackLookupByEmail(
  email: string,
  token: string
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const url = new URL(`${SLACK_API}/users.lookupByEmail`);
  url.searchParams.set("email", email.trim());
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { ok: boolean; error?: string; user?: { id?: string } };
  if (!data.ok || !data.user?.id) {
    return { ok: false, error: data.error ?? "users.lookupByEmail failed" };
  }
  return { ok: true, userId: data.user.id };
}

/** Paginated channel member user ids. Returns null if the list could not be loaded. */
async function listChannelMemberUserIds(
  channelId: string,
  token: string
): Promise<Set<string> | null> {
  const members = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < 50; page++) {
    const data = await slackApiPost("conversations.members", token, {
      channel: channelId.trim(),
      limit: 200,
      cursor,
    });
    if (!data.ok) {
      return null;
    }
    const batch = data.members as unknown;
    if (Array.isArray(batch)) {
      for (const m of batch) {
        if (typeof m === "string" && m.length > 0) members.add(m);
      }
    }
    const next = (data.response_metadata as { next_cursor?: string } | undefined)?.next_cursor;
    if (!next || typeof next !== "string") break;
    cursor = next;
  }
  return members;
}

export type MentionResolveError = { input: string; error: string };

/**
 * Each entry: Slack user id U…, or workspace email (resolved via users.lookupByEmail).
 */
export async function resolveMentionUserIds(
  specifiers: string[],
  token: string
): Promise<{ userIds: string[]; errors: MentionResolveError[] }> {
  const userIds: string[] = [];
  const seen = new Set<string>();
  const errors: MentionResolveError[] = [];

  for (const raw of specifiers) {
    const s = String(raw).trim();
    if (!s) continue;

    if (isSlackUserId(s)) {
      const id = s.trim();
      if (!seen.has(id)) {
        seen.add(id);
        userIds.push(id);
      }
      continue;
    }

    if (looksLikeEmail(s)) {
      const r = await slackLookupByEmail(s, token);
      if (!r.ok) {
        errors.push({ input: s, error: r.error });
        continue;
      }
      if (!seen.has(r.userId)) {
        seen.add(r.userId);
        userIds.push(r.userId);
      }
      continue;
    }

    errors.push({ input: s, error: "Not a valid email or Slack user id (U…)" });
  }

  return { userIds, errors };
}

export type PostSlackChannelNotificationResult = {
  ok: boolean;
  error?: string;
  ts?: string;
  /** User ids actually @-mentioned after channel filter */
  resolvedMentionUserIds: string[];
  resolveErrors: MentionResolveError[];
  /** User ids resolved but not in channel member list */
  skippedNotInChannel: string[];
};

/**
 * Post in a channel: resolve emails → U…, keep only members of that channel, then `<@U…>` line + body.
 * Scopes: chat:write, users:read.email, channels:read or groups:read (for conversations.members).
 */
export async function postSlackChannelNotification(opts: {
  channelId: string;
  mentionUsers: string[];
  bodyText: string;
}): Promise<PostSlackChannelNotificationResult> {
  const emptyResult = (): PostSlackChannelNotificationResult => ({
    ok: false,
    resolvedMentionUserIds: [],
    resolveErrors: [],
    skippedNotInChannel: [],
  });

  const token = process.env.SLACK_BOT_TOKEN?.trim();
  if (!token) {
    return { ...emptyResult(), error: "SLACK_BOT_TOKEN is not configured" };
  }

  const channel = opts.channelId.trim();
  if (!channel) {
    return { ...emptyResult(), error: "Channel id is empty" };
  }
  if (!isSlackChannelId(channel)) {
    return { ...emptyResult(), error: "Invalid channel id (use C… or G… from Slack)" };
  }

  const specifiers = (opts.mentionUsers ?? []).map((x) => String(x).trim()).filter(Boolean);
  const { userIds: resolvedIds, errors: resolveErrors } = await resolveMentionUserIds(
    specifiers,
    token
  );

  const channelMembers = await listChannelMemberUserIds(channel, token);
  let finalIds: string[];
  const skippedNotInChannel: string[] = [];

  if (channelMembers && channelMembers.size > 0) {
    finalIds = [];
    for (const id of resolvedIds) {
      if (channelMembers.has(id)) finalIds.push(id);
      else skippedNotInChannel.push(id);
    }
  } else {
    finalIds = resolvedIds;
  }

  const mentions = finalIds.map((u) => `<@${u}>`).join(" ");
  const body = (opts.bodyText ?? "").trim();
  let text: string;
  if (mentions && body) {
    text = `${mentions}\n\n${body}`;
  } else if (mentions) {
    text = mentions;
  } else if (body) {
    text = body;
  } else {
    text = " ";
  }

  const fullText = text.length > 40000 ? `${text.slice(0, 39997)}…` : text;
  const post = await slackApiPost("chat.postMessage", token, {
    channel,
    text: fullText,
    /** Enables `<https://…|label>` link text and other mrkdwn in `text`. */
    mrkdwn: true,
  });

  if (!post.ok) {
    return {
      ok: false,
      error: String(post.error ?? "chat.postMessage failed"),
      resolvedMentionUserIds: finalIds,
      resolveErrors,
      skippedNotInChannel,
    };
  }

  return {
    ok: true,
    ts: typeof post.ts === "string" ? post.ts : undefined,
    resolvedMentionUserIds: finalIds,
    resolveErrors,
    skippedNotInChannel,
  };
}
