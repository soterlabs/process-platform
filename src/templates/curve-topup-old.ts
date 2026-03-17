import type { Template } from "@/entities/template";

export const curveTopupTemplate: Template = {
  key: "curve-topup",
  name: "Curve Topup",
  firstStepKey: "planning",
  steps: [
    {
      key: "planning",
      type: "input",
      title: "Planning",
      allowedRoles: ["Admin"],
      nextStepKey: "pre_execution_checklist",
      inputs: [
        {
          key: "review_incentive_rates",
          type: "string",
          title: "Review incentive rates",
          readOnly: true,
          defaultValue:
            'Review target incentive rates from <a href="https://strata.amatsu.io/oea/integration-boost-payouts" target="_blank">Strata Dashboard</a> and <a href="https://observatory.data.blockanalitica.com/sky/integration-boost/" target="_blank">BA Labs Observatory</a>. Compare both sources, take the higher amount.',
        },
        { key: "incentive_amount", type: "number", title: "Weekly deposit amount (round up to whole number)" },
        {
          key: "tx_keeper_save",
          type: "string",
          title: "Enter amount into TK",
          readOnly: true,
          defaultValue:
            'Enter amount into <a href="https://tx-keeper-production.up.railway.app/" target="_blank">Transaction Keeper</a> and save.',
        },
        { key: "tx_keeper_saved", type: "bool", title: "Amount entered and saved in Transaction Keeper" },
        {
          key: "tx_keeper_export",
          type: "string",
          title: "Export json from TK",
          readOnly: true,
          defaultValue:
            'Export transaction json from <a href="https://tx-keeper-production.up.railway.app/" target="_blank">Transaction Keeper</a> and paste below.',
        },
        { key: "tx_keeper_export_json", type: "string-multiline", title: "JSON payload exported from Transaction Keeper" },
        { key: "msig_authorized", type: "bool", title: "Verify: Distributor MSIG is authorized on gauge contract" },
        { key: "approvals_sufficient", type: "bool", title: "Verify: Token approval limits are sufficient for deposit" },
        { key: "team_available", type: "bool", title: "Verify: Execution team is available" },
        { key: "current_epoch_end", type: "string", title: "Current epoch end date" },
        {
          key: "target_execution_time",
          type: "datetime",
          title: "Target execution time",
          defaultValue:
            '{{ (() => { const d = new Date(); const day = d.getUTCDay(); const daysToAdd = day === 1 ? 7 : (1 - day + 7) % 7; const mon = new Date(d); mon.setUTCDate(d.getUTCDate() + daysToAdd); mon.setUTCHours(20, 0, 0, 0); return mon.toISOString().slice(0, 16); })() }}',
        },
        { key: "new_epoch_end", type: "string", title: "New epoch end date" },
      ],
    },
    {
      key: "pre_execution_checklist",
      type: "input",
      title: "Pre-execution checklist",
      allowedRoles: ["Admin"],
      nextStepKey: "execution",
      inputs: [
        {
          key: "check_balance",
          type: "string",
          title: "Check current gauge incentive balance",
          readOnly: true,
          defaultValue:
            '<ul class="list-disc pl-5 space-y-1"><li>Use <a href="https://etherscan.io/address/0x36c2abab95f9aacd4b05d65b89890e29d6382611#readContract#F21" target="_blank" class="text-sky-400 hover:underline">Read Contract #21 <code>reward_data</code></a> with arg0 = USDS address (<code>0xdc035d45d973e3ec169d2276ddab16f1e407384f</code>). Calculate remaining balance from current epoch length and total incentives.</li></ul>',
        },
        {
          key: "balance_visible_safe_ui",
          type: "bool",
          title: "Verify: balance is visible in Safe UI",
        },
        {
          key: "review_reference_transaction",
          type: "string",
          title: "Review reference transaction and call data format",
          readOnly: true,
          defaultValue:
            '<ul class="list-disc pl-5 space-y-1"><li>Reference: <a href="https://etherscan.io/tx/0xd2baf0e0b2001962ac48de36ed23f88af67200981ac391285503230e861fe00c" target="_blank" class="text-sky-400 hover:underline">Original Gauge Top-up tx</a> and <a href="https://calldata.swiss-knife.xyz/decoder?calldata=0x33b50aed000000000000000000000000dc035d45d973e3ec169d2276ddab16f1e407384f0000000000000000000000000000000000000000000011a57db0fed7eaf40000000000000000000000000000000000000000000000000000000000000013c680" target="_blank" class="text-sky-400 hover:underline">Original raw call data (decoded)</a></li></ul>',
        },
        {
          key: "confirm_distributor_authorization",
          type: "string",
          title: "Confirm _distributor authorization for _reward_token",
          readOnly: true,
          defaultValue:
            '<ul class="list-disc pl-5 space-y-1"><li>Reference: <a href="https://etherscan.io/tx/0xa199b79afba1a983de621b25d11aacb7cf3c891293f91b4fdd0dbbc802870554" target="_blank" class="text-sky-400 hover:underline"><code>add_reward</code> transaction</a> from initial top-up</li></ul>',
        },
        {
          key: "confirm_distributor_approval",
          type: "string",
          title: "Confirm _distributor has approved gauge with sufficient spending limit",
          readOnly: true,
          defaultValue:
            '<ul class="list-disc pl-5 space-y-1"><li>Reference: <a href="https://etherscan.io/tx/0x751d37b47ac4a806d050bf35541bd5c074071db2109186327e0079744ac2eec0#eventlog" target="_blank" class="text-sky-400 hover:underline">Approval transaction</a> confirming approval &amp; spending limit</li></ul>',
        },
        {
          key: "_view_4",
          type: "string",
          title: "Upload JSON payload to TB",
          readOnly: true,
          defaultValue:
            '<p>Upload the JSON payload to Transaction Builder in Safe UI.</p>',
        },
        {
          key: "two_tx_approve_and_deposit",
          type: "bool",
          title: "Verify: two transactions appear: approve and deposit_reward_token",
        },
        {
          key: "_view_5",
          type: "string",
          title: "Validate transaction parameters in Transaction Builder before sending",
          readOnly: true,
          defaultValue:
            '<p>Confirm each of the following in Transaction Builder before sending:</p>',
        },
        {
          key: "verify_to_address",
          type: "bool",
          title: "Verify: to address correct (gauge: 0x36c2abab95f9aacd4b05d65b89890e29d6382611)",
        },
        {
          key: "verify_function_deposit_reward_token",
          type: "bool",
          title: "Verify: function is deposit_reward_token",
        },
        {
          key: "verify_reward_token_usds",
          type: "bool",
          title: "Verify: _reward_token is USDS address (0xdc035d45d973e3ec169d2276ddab16f1e407384f)",
        },
        {
          key: "verify_amount_18_decimals",
          type: "bool",
          title: "Verify: _amount has 18 decimals",
        },
        {
          key: "verify_epoch_604800",
          type: "bool",
          title: "Verify: _epoch is 604800",
        },
        {
          key: "_view_6",
          type: "string",
          title: "Run Tenderly simulation",
          readOnly: true,
          defaultValue:
            '<p>Run the simulation in Tenderly.</p>',
        },
        {
          key: "simulation_successful",
          type: "bool",
          title: "Verify: simulation successful",
        },
        {
          key: "_view_7",
          type: "string",
          title: "Verify epoch end timestamp in simulation",
          readOnly: true,
          defaultValue:
            'Check storage key <code>0xdd6a4a23a6d46638d51ed8d43be6bd25d86109e160228fc24d0c5856992027b9</code>, convert hex data to Unix time using <a href="https://calldata.swiss-knife.xyz/" target="_blank" class="text-sky-400 hover:underline">Calldata Decoder</a>, and confirm epoch end date is correct (~7 days from execution).',
        },
        {
          key: "epoch_one_week_expected",
          type: "bool",
          title: "Verify: epoch is for one week as expected",
        },
        {
          key: "_view_8",
          type: "string",
          title: "Cross-check gauge contract on Etherscan",
          readOnly: true,
          defaultValue:
            '<a href="https://etherscan.io/address/0x36c2abab95f9aacd4b05d65b89890e29d6382611" target="_blank" class="text-sky-400 hover:underline">Etherscan</a>',
        },
        {
          key: "gauge_611_confirmed",
          type: "bool",
          title: "Verify: the 611 contract is confirmed as the gauge",
        },
        {
          key: "agree_final_params",
          type: "bool",
          title: "Agree on final transaction parameters (_reward_token, _amount, _epoch)",
        },
      ],
    },
    {
      key: "execution",
      type: "input",
      title: "Execution",
      allowedRoles: ["Admin"],
      nextStepKey: "communication",
      inputs: [
        {
          key: "_exec_0",
          type: "string",
          title: "Open MSIG in Safe UI",
          readOnly: true,
          defaultValue:
            'Open MSIG in <a href="https://app.safe.global/" target="_blank" class="text-sky-400 hover:underline">Safe UI</a> and confirm signer wallet is connected.',
        },
        {
          key: "wallet_connects_balance_visible",
          type: "bool",
          title: "Verify: wallet connects successfully and balance is visible",
        },
        {
          key: "_exec_1",
          type: "string",
          title: "Spot check transaction summary",
          readOnly: true,
          defaultValue:
            "<p>Spot check transaction summary before sending (review amounts, addresses, and parameters one final time).</p>",
        },
        {
          key: "_exec_2",
          type: "string",
          title: "Send batch",
          readOnly: true,
          defaultValue:
            "<p>Click Send Batch in Transaction Builder (JSON payload was uploaded and simulated in Phase 2).</p>",
        },
        {
          key: "_exec_3",
          type: "string",
          title: "Decode and verify call data",
          readOnly: true,
          defaultValue:
            'Decode and verify call data using <a href="https://calldata.swiss-knife.xyz/" target="_blank" class="text-sky-400 hover:underline">Calldata Decoder</a> (decode twice — call data is wrapped in a Safe multisend).',
        },
        {
          key: "verify_first_tx_approval_usds",
          type: "bool",
          title: "Verify: first transaction is approval for the gauge (USDS)",
        },
        {
          key: "verify_second_tx_deposit_reward_token",
          type: "bool",
          title: "Verify: second transaction is deposit_reward_token with correct parameters",
        },
        {
          key: "_exec_4",
          type: "string",
          title: "Sign the transaction",
          readOnly: true,
          defaultValue:
            "<p>Sign the transaction. If 8pm UTC, execute now. If not, sign only and wait for execution until 8pm UTC.</p>",
        },
        {
          key: "_exec_5",
          type: "string",
          title: "Execute transaction at target time",
          readOnly: true,
          defaultValue:
            "<p>Execute transaction at target time (currently 8 PM UTC Monday). Note: Execution can be performed by any wallet or via Lako's cron bot (when available).</p>",
        },
        {
          key: "tx_hash",
          type: "string",
          title: "Record TX Hash",
        },
        {
          key: "gauge_usds_balance_updated",
          type: "bool",
          title: "Verify: gauge USDS balance updated",
        },
        {
          key: "reward_data_finish_period_correct",
          type: "bool",
          title: "Verify: reward_data finish_period correct",
        },
      ],
    },
    {
      key: "communication",
      type: "input",
      title: "Phase 4: Communication",
      allowedRoles: ["Admin"],
      nextStepKey: null,
      inputs: [
        {
          key: "communicate_execution",
          type: "bool",
          title: "Communicate execution to Sky Internal Teams (TX Hash, new gauge balance, next epoch end)",
        },
        {
          key: "schedule_prep_meeting",
          type: "bool",
          title: "Schedule next prep meeting",
        },
        {
          key: "schedule_execution_meeting",
          type: "bool",
          title: "Schedule next execution meeting",
        },
      ],
    },
  ],
  allowedRoles: ["Admin"],
  resultViewControls: [],
};
