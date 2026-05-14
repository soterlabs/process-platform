import type { TemplateStep } from "./template-step";

/** Auto step: posts one message in a Slack channel and @-mentions users (by email or U… id). */
export type SlackNotifyTemplateStep = TemplateStep & {
  type: "slack_notify";
  /**
   * Target channel: C…/G… id, or channel name with or without leading `#` (resolved via Slack `conversations.list`).
   * Bot must be in the channel to post; for private channels it must be a member to appear in the list.
   */
  channelId: string;
  /**
   * Workspace member emails and/or Slack user ids (U…), comma-separated in the editor.
   * Emails are resolved with users.lookupByEmail; only users who are in this channel are @-mentioned.
   */
  mentionUsers: string[];
  /** Expression → string (message body under the mentions). */
  messageExpression: string;
};
