import type { Template } from "@/entities/template";

export const keelIbTemplate: Template = {
  key: "keel-ib",
  name: "Keel IB Amounts",
  permissions: [],
  firstStepKey: "values",
  steps: [
    {
      key: "values",
      type: "input",
      title: "Input Values",
      permissions: [],
      completeExpression: 'hasPermission("soter-l1:operate")',
      nextStepKey: null,
      inputs: [
        {
          key: "huma",
          type: "number",
          title: "Huma",
          visibleExpression: 'hasPermission("incentives:huma:enter")',
        },
        {
          key: "huma-reserve",
          type: "number",
          title: "Huma: Reserve",
          visibleExpression: 'hasPermission("incentives:huma:enter")',
        },
        {
          key: "juplend",
          type: "number",
          title: "Juplend",
          visibleExpression: 'hasPermission("incentives:juplend:enter")',
        },
        {
          key: "kamino",
          type: "number",
          title: "Kamino",
          visibleExpression: 'hasPermission("incentives:kamino:enter")',
        },
        {
          key: "keel-pioneer",
          type: "number",
          title: "Keel Pioneer",
          visibleExpression: 'hasPermission("incentives:keel-pioneer:enter")',
        },
        {
          key: "maple",
          type: "number",
          title: "Maple",
          visibleExpression: 'hasPermission("incentives:maple:enter")',
        },
        {
          key: "onre",
          type: "number",
          title: "Onre",
          visibleExpression: 'hasPermission("incentives:onre:enter")',
        },
        {
          key: "onre-reserve",
          type: "number",
          title: "Onre Reserve",
          visibleExpression: 'hasPermission("incentives:onre:enter")',
        },
      ],
    },
  ],
  resultViewControls: [
    { data: "${values.huma}", title: "Huma" },
    { data: "${values.huma-reserve}", title: "Huma Reserve" },
    { data: "${values.juplend}", title: "Juplend" },
    { data: "${values.kamino}", title: "Kamino" },
    { data: "${values.keel-pioneer}", title: "Keel Pioneer" },
    { data: "${values.maple}", title: "Maple" },
    { data: "${values.onre}", title: "Onre" },
    { data: "${values.onre-reserve}", title: "Onre Reserve" },
  ],
};
