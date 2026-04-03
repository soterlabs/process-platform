import type { Template } from "@/entities/template";

const SAFE_UI_URL = "https://app.safe.global/transactions/queue?safe=eth:0xa7843f843D29Ca33BA48d9D1335b774eeCc328DC";
const AMATSU_GSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1xncirxnT64rXkRMiHwm4mgM2urE5jmkW8O8MbY_FKi4/edit?gid=1282731612";
const STRATA_URL = "https://strata.amatsu.io/oea/integration-boost-payouts";

export const ibPayoutsTemplate: Template = {
  key: "ib-payouts",
  name: "IB payouts",
  firstStepKey: "execution",
  steps: [
    {
      key: "execution",
      type: "input",
      title: "Execution",
      allowedRoles: [],
      nextStepKey: "post_execution",
      inputs: [
        {
          key: "review_gsheet_intro",
          type: "string",
          title: "Review incentive amounts in Amatsu GSheet",
          readOnly: true,
          defaultValue: `Open <a href="${AMATSU_GSHEET_URL}" target="_blank" class="text-sky-400 hover:underline">Amatsu GSheet</a> and go to the latest <strong>Week ##</strong> tab. The sheet is a copy of data from <a href="${STRATA_URL}" target="_blank" class="text-sky-400 hover:underline">Strata Dashboard</a> — Integration Boost Payouts (Amatsu prepares the sheet each week).`,
        },
        {
          key: "queue_intro",
          type: "string",
          title: "Queue transactions from multisigs",
          readOnly: true,
          defaultValue: `For each multisig below, queue the right transaction in <a href="${SAFE_UI_URL}" target="_blank" class="text-sky-400 hover:underline">Safe UI</a> (Ethereum / Base) or Keel Squads (Solana). For each integrator, copy the recipient address and <strong>Total</strong> (SSR + Bonus) from the GSheet. Confirm every recipient and amount matches the sheet before sending. Run simulation: Tenderly for Safe, built-in for Squads — verify success.`,
        },
        {
          key: "multisig_integrator_list",
          type: "string",
          title: "Multisigs and integrators",
          readOnly: true,
          defaultValue: `<ul class="list-disc pl-5 space-y-2 text-left"><li><strong>Spark Safe (Ethereum mainnet):</strong> single transfer — Aave</li><li><strong>Skybase Safe (Ethereum mainnet):</strong> multisend — Morpho, Curve</li><li><strong>Skybase Safe (Base L2):</strong> single transfer — Euler</li><li><strong>Keel Squads Multisig (Solana):</strong> multisend — Drift, Huma, Juplend, Kamino, Maple, MarginFi, OnRe, OnRe Reserves, Save (Solend), Keel Pioneer</li></ul><p class="mt-2">Manifest and Figure amounts are sent to the Keel Pioneer wallet for them to distribute.</p>`,
        },
        {
          key: "spark_safe_aave_queued_verified",
          type: "bool",
          title: "Spark Safe (mainnet) → Aave: queued, addresses & amounts match GSheet, simulation successful",
        },
        {
          key: "skybase_safe_eth_queued_verified",
          type: "bool",
          title: "Skybase Safe (mainnet) → Morpho & Curve (multisend): queued, verified, simulation successful",
        },
        {
          key: "skybase_safe_base_queued_verified",
          type: "bool",
          title: "Skybase Safe (Base) → Euler: queued, verified, simulation successful",
        },
        {
          key: "keel_squads_queued_verified",
          type: "bool",
          title: "Keel Squads (Solana) → listed integrators (multisend): queued, verified, simulation successful",
        },
        {
          key: "execute_intro",
          type: "string",
          title: "Execute transactions",
          readOnly: true,
          defaultValue: `Coordinate with remaining signers to sign and execute each queued transaction.`,
        },
        {
          key: "all_transactions_executed",
          type: "bool",
          title: "Verify: All queued transactions signed and executed",
        },
      ],
    },
    {
      key: "post_execution",
      type: "input",
      title: "Post-execution",
      allowedRoles: [],
      nextStepKey: null,
      inputs: [
        {
          key: "record_hashes_intro",
          type: "string",
          title: "Record transaction hashes",
          readOnly: true,
          defaultValue: `Record each transaction hash or explorer link below (Etherscan, BaseScan, Solscan as applicable).`,
        },
        {
          key: "tx_link_spark_aave",
          type: "string",
          title: "Spark Safe → Aave (Etherscan)",
        },
        {
          key: "tx_link_skybase_eth",
          type: "string",
          title: "Skybase Safe → Morpho & Curve (Etherscan)",
        },
        {
          key: "tx_link_skybase_base",
          type: "string",
          title: "Skybase Safe (Base) → Euler (BaseScan)",
        },
        {
          key: "tx_link_keel_squads",
          type: "string",
          title: "Keel Squads → Solana integrators (Solscan)",
        },
      ],
    },
  ],
  allowedRoles: [],
  resultViewControls: [],
};
