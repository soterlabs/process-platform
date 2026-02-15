import type { Template } from "@/entities/template";

export const exampleTemplate: Template = {
  key: "risk_flow",
  name: "Example Risk Assessment Flow",
  firstStepKey: "collect_input",
  steps: [
    {
      key: "collect_input",
      type: "input",
      title: "Initial Questionnaire",
      user: true,
      nextStepKey: "process_input",
      inputs: [
        { key: "market_prices", type: "bool", title: "Q1: Do you have observable market prices from a verifiable source?" },
        { key: "250_days", type: "bool", title: "Q2: Do you have ≥250 business days of price data(daily or convertible)?" },
        { key: "rfet", type: "bool", title: "Q3: Do key risk factors pass RFET (or have valid proxy with R² ≥ 0.75)?"},
        { key: "backtest", type: "bool", title: "Q4: Can you run IMA governance (backtesting + P&L attribution)?"},
      ],
    },
    {
      key: "process_input",
      type: "request",
      requestType: "agent",
      title: "Input Processing",
      prompt: "Decide which path to use: if any of the answers is false, the SA path should be used. Otherwise, the IMA path can be used. Include a very short summary on why you made that decision.",
      nextStepKey: null,
      result: true,
    },
  ],
};
