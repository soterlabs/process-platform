import type { Template } from "@/entities/template";

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
          title: "Github Commit URLs:",
          subInputs: [
            {
              key: "content_matches_description",
              type: "bool",
              title: "Content matches description",
            },
            {
              key: "no_security_changes",
              type: "bool",
              title: "No security-related changes are present in this commit.",
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
