import type { Template } from "@/entities/template";

/**
 * One-step review: paste GitHub commit URLs (one per line), then a checkbox + string per URL.
 * Saved context: `spell_review.commit_urls` (text) and `spell_review.reviews` (array of
 * `{ spelling_ok, comment }` per non-empty line).
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
      confirmationMessage: "Thanks — your spell review has been saved.",
      inputs: [
        {
          key: "commit_urls",
          type: "string-multiline",
          title: "GitHub commit URLs (one per line)",
        },
        {
          key: "reviews",
          type: "item_list",
          title: "Per commit",
          linesFromKey: "commit_urls",
          subInputs: [
            {
              key: "spelling_ok",
              type: "bool",
              title: "Spelling / wording OK",
            },
            {
              key: "comment",
              type: "string",
              title: "Comment (optional if OK)",
            },
          ],
        },
      ],
    },
  ],
};
