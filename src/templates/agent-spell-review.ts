import type { Template } from "@/entities/template";

/**
 * One-step review: each row is a commit URL plus checkbox + comment.
 * Saved context: `spell_review.prs` = array of `{ commit_url, spelling_ok, comment }`, plus
 * `spell_review.solc_version_verified` (bool).
 */
export const agentSpellReviewTemplate: Template = {
  key: "agent-spell-review",
  name: "Agent spell review",
  firstStepKey: "spell_review",
  permissions: [],
  steps: [
    {
      key: "spell_review",
      type: "input",
      title: "Review commit messages",
      permissions: [],
      nextStepKey: null,
      inputs: [
        {
          key: "prs",
          type: "item_list",
          title: "Commits",
          subInputs: [
            {
              key: "commit_url",
              type: "string",
              title: "GitHub commit URL",
            },
            {
              key: "spelling_ok",
              type: "bool",
              title: "Spelling / wording OK",
            },
            {
              key: "comment",
              type: "string",
              title: "Comment (optional)",
            },
          ],
        },
        {
          key: "solc_version_verified",
          type: "bool",
          title:
            "Verify solc version matches the Prime Agent protocol standard based on prior contracts.",
        },
        {
          key: "solc_version_verified_comment",
          type: "string",
          title: "Comment (optional)",
        },
      ],
    },
  ],
};
