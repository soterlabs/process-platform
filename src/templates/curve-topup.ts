import type { Template } from "@/entities/template";

const SAFE_UI_URL = "https://app.safe.global/transactions/queue?safe=eth:0xa7843f843D29Ca33BA48d9D1335b774eeCc328DC";
const TX_KEEPER_URL = "https://tx-keeper-production.up.railway.app/";
const STRATA_URL = "https://strata.amatsu.io/oea/integration-boost-payouts";
const BA_LABS_URL = "https://observatory.data.blockanalitica.com/sky/integration-boost/";
const CALLDATA_DECODER_URL = "https://calldata.swiss-knife.xyz/";
const GAUGE_ADDRESS = "0x36c2abab95f9aacd4b05d65b89890e29d6382611";
const USDS_ADDRESS = "0xdc035d45d973e3ec169d2276ddab16f1e407384f";

export const curveTopupTemplate: Template = {
  key: "curve-topup",
  name: "Curve Topup",
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
          key: "open_safe_ui",
          type: "string",
          title: "Open Multisig in Safe UI",
          readOnly: true,
          defaultValue: `Open Multisig in <a href="${SAFE_UI_URL}" target="_blank" class="text-sky-400 hover:underline">Safe UI</a> and confirm signer wallet is connected.`,
        },
        {
          key: "open_tx_keeper",
          type: "string",
          title: "Open Transaction Keeper",
          readOnly: true,
          defaultValue: `Open <a href="${TX_KEEPER_URL}" target="_blank" class="text-sky-400 hover:underline">Transaction Keeper</a> — Curve IB Rewards tool. The inline price feed is usually a little off.`,
        },
        {
          key: "review_incentive_rates",
          type: "string",
          title: "Review target incentive rates",
          readOnly: true,
          defaultValue: `Review target incentive rates from <a href="${STRATA_URL}" target="_blank" class="text-sky-400 hover:underline">Strata Dashboard</a> — Integration Boost Payouts (SSR Incentive). Can also check <a href="${BA_LABS_URL}" target="_blank" class="text-sky-400 hover:underline">BA Labs Observatory</a>. Compare both sources, take the higher amount. Enter the amount in the next step.`,
        },
        { key: "reward_amount", type: "number", title: "Reward Amount" },
        {
          key: "enter_reward_in_tk",
          type: "string",
          title: "Enter Reward Amount into Transaction Keeper",
          readOnly: true,
          defaultValue: `Enter Reward Amount into Transaction Keeper and save.`,
        },
        { key: "reward_entered_saved", type: "bool", title: "Reward Amount entered and saved in Transaction Keeper" },
        {
          key: "download_json",
          type: "string",
          title: "Download JSON payload from Transaction Keeper",
          readOnly: true,
          defaultValue: `Download JSON payload from Transaction Keeper and paste below.`,
        },
        { key: "json_payload", type: "string-multiline", title: "JSON payload from Transaction Keeper" },
        {
          key: "safe_upload",
          type: "string",
          title: "Upload JSON to Safe",
          readOnly: true,
          defaultValue: `In Safe UI, go to New Transaction → Transaction Builder → Upload. Upload JSON payload from above.`,
        },
        { key: "confirm_reward_in_json", type: "bool", title: "Verify: Reward Amount is correct in the JSON payload" },
        { key: "json_uploaded", type: "bool", title: "JSON payload uploaded to Transaction Builder" },
        {
          key: "send_batch",
          type: "string",
          title: "Send Batch",
          readOnly: true,
          defaultValue: `Click Send Batch in Transaction Builder.`,
        },
        {
          key: "validate_params_intro",
          type: "string",
          title: "Validate transaction parameters before sending",
          readOnly: true,
          defaultValue: `Validate transaction parameters in Transaction Builder before sending:`,
        },
        {
          key: "two_tx_approve_deposit",
          type: "bool",
          title: "Verify: Two transactions appear: `approve` and `deposit_reward_token`. Click to expand each transaction's details",
        },
        {
          key: "usds_allowance_matches",
          type: "bool",
          title: "Verify: USDS Allowance is the same as the Reward Amount",
        },
        {
          key: "spender_is_gauge",
          type: "bool",
          title: `Verify: Spender address is the Gauge: ${GAUGE_ADDRESS}`,
        },
        {
          key: "decode_calldata_intro",
          type: "string",
          title: "Decode and verify calldata",
          readOnly: true,
          defaultValue: `Decode and verify the second transaction calldata (deposit_reward_token multisend txn) using <a href="${CALLDATA_DECODER_URL}" target="_blank" class="text-sky-400 hover:underline">Calldata Decoder</a>. Decode the calldata, then grab the calldata in the first field and decode that again (calldata is wrapped in a Safe multisend).`,
        },
        {
          key: "first_tx_approval_address",
          type: "bool",
          title: `Verify: First transaction (approval) — address is ${GAUGE_ADDRESS}`,
        },
        {
          key: "first_tx_approval_amount",
          type: "bool",
          title: "Verify: First transaction (approval) — uint256 is Reward Amount (18 decimals)",
        },
        {
          key: "second_tx_deposit_address",
          type: "bool",
          title: `Verify: Second transaction (deposit_reward_token) — address is USDS: ${USDS_ADDRESS}`,
        },
        {
          key: "second_tx_deposit_amount",
          type: "bool",
          title: "Verify: Second transaction (deposit_reward_token) — first uint256 is Reward Amount (18 decimals)",
        },
        {
          key: "second_tx_deposit_epoch",
          type: "bool",
          title: "Verify: Second transaction (deposit_reward_token) — second uint256 is 604800 (1 week)",
        },
        {
          key: "tenderly_intro",
          type: "string",
          title: "Run Tenderly simulation",
          readOnly: true,
          defaultValue: `Run Tenderly simulation (button in Safe UI, opens in new window).`,
        },
        { key: "tenderly_successful", type: "bool", title: "Verify: Simulation shows successful" },
        { key: "tenderly_gauge_611", type: "bool", title: `Verify: Gauge contract address displayed is Gauge: ${GAUGE_ADDRESS}` },
        { key: "tenderly_reward_amount", type: "bool", title: "Verify: Reward Amount shows up as expected" },
        {
          key: "sign_tx",
          type: "string",
          title: "Sign the transaction",
          readOnly: true,
          defaultValue: `Sign the transaction. If 8pm UTC, execute now. If not, sign only and wait for execution until 8pm UTC.`,
        },
        { key: "signed", type: "bool", title: "Verify: Transaction signed" },
        {
          key: "execute_at_target",
          type: "string",
          title: "Execute at target time",
          readOnly: true,
          defaultValue: `Execute transaction at target time (currently 8 PM UTC Monday). Note: Execution can be performed by any wallet (or soon, via Lako's cron bot, once available).`,
        },
        { key: "executed", type: "bool", title: "Verify: Transaction executed" },
      ],
    },
    {
      key: "post_execution",
      type: "input",
      title: "Post-Execution",
      allowedRoles: [],
      nextStepKey: null,
      inputs: [
        { key: "tx_hash", type: "string", title: "Record Transaction Hash / Etherscan link" },
        { key: "gauge_usds_balance_updated", type: "bool", title: "Verify: gauge USDS balance updated" },
        { key: "reward_data_finish_period_correct", type: "bool", title: "Verify: reward_data finish_period correct" },
        {
          key: "communicate_execution",
          type: "bool",
          title: "Communicate execution to Sky Internal Teams (TX Hash, new gauge balance, next epoch end)",
        },
        { key: "prefill_next_checklist", type: "bool", title: "Pre-fill next checklist" },
      ],
    },
  ],
  allowedRoles: [],
  resultViewControls: [],
};
