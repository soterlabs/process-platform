import type { Template } from "@/entities/template";

const VERIFY_POST_FREEZE_SOURCE = `
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const OFT_STORE_PDA = "BEvTHkTyXooyaJzP8egDUC7WQK8cyRrq5WvERZNWhuah";
const OFT_PROGRAM = "SKYTAiJRkgexqQqFoqhXdCANyfziwrVrzjhBaCzdbKW";
const EXPECTED_OWNER = OFT_PROGRAM;
const EXPECTED_SIZE = 223;
const OFFSET_ADMIN = 122;
const OFFSET_PAUSED = 156;
const OFFSET_PAUSER = 157;
const OFFSET_UNPAUSER = 190;
const HEX_ADMIN = "8dc412529f876c9f3bc01d7c3095bcd6cd1d6d5177b59aa03f04e5c5b422147b";
const HEX_PAUSER = "45b8a18662de389469a6e6e4ca0f392a8abfb04dc67d2fdf239387f4627a181c";

async function jsonRpc(method, params) {
  const res = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error("RPC HTTP " + res.status);
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || JSON.stringify(j.error));
  return j.result;
}

function hexSliceOk(buf, offset, hex) {
  const want = Buffer.from(hex, "hex");
  return buf.length >= offset + want.length && buf.subarray(offset, offset + want.length).equals(want);
}

/** Solana tx id is base58 (~87–88 chars). Reject EVM 0x… and obvious junk before calling RPC. */
function looksLikeSolanaBase58TxSig(s) {
  if (!s) return false;
  if (/^0x/i.test(s)) return false;
  if (s.length < 80 || s.length > 100) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(s);
}

const sig = String(context.record_freeze_tx?.transactionSignature ?? "").trim();

const oft = await jsonRpc("getAccountInfo", [OFT_STORE_PDA, { encoding: "base64" }]);
if (!oft?.value?.data?.[0]) {
  return { ok: false, message: "OFT store account missing" };
}
const data = Buffer.from(oft.value.data[0], "base64");
let ok = true;
const parts = [];
if (oft.value.owner !== EXPECTED_OWNER) {
  ok = false;
  parts.push("owner mismatch");
}
if (data.length !== EXPECTED_SIZE) {
  ok = false;
  parts.push("bad data length " + data.length);
}
if (data[OFFSET_PAUSED] !== 1) {
  ok = false;
  parts.push("not paused");
}
if (!hexSliceOk(data, OFFSET_ADMIN, HEX_ADMIN)) {
  ok = false;
  parts.push("admin bytes");
}
if (data[OFFSET_PAUSER] !== 1 || !hexSliceOk(data, OFFSET_PAUSER + 1, HEX_PAUSER)) {
  ok = false;
  parts.push("pauser");
}
if (data[OFFSET_UNPAUSER] !== 1 || !hexSliceOk(data, OFFSET_UNPAUSER + 1, HEX_ADMIN)) {
  ok = false;
  parts.push("unpauser");
}

if (!sig) {
  return { ok, message: parts.length ? parts.join("; ") : ok ? "frozen (tx not checked)" : "failed" };
}

if (!looksLikeSolanaBase58TxSig(sig)) {
  ok = false;
  parts.push(
    "not a Solana base58 transaction signature (paste the sig from Solana Explorer or your Solana wallet; not a 0x EVM hash)"
  );
  return { ok, message: parts.join("; ") };
}

let tx;
try {
  tx = await jsonRpc("getTransaction", [
    sig,
    { encoding: "json", maxSupportedTransactionVersion: 0, commitment: "finalized" },
  ]);
} catch (e) {
  ok = false;
  const m = e instanceof Error ? e.message : String(e);
  parts.push(
    m.toLowerCase().includes("invalid")
      ? "Solana RPC rejected the signature (expected base58 Solana tx id)"
      : m
  );
  return { ok, message: parts.join("; ") };
}

if (tx == null) {
  ok = false;
  parts.push("tx not found at finalized");
} else if (tx.meta?.err != null) {
  ok = false;
  parts.push("tx meta.err");
} else {
  const logs = tx.meta?.logMessages || [];
  const invoke = "Program " + OFT_PROGRAM + " invoke";
  const success = "Program " + OFT_PROGRAM + " success";
  if (!logs.some((l) => typeof l === "string" && l.startsWith(invoke))) {
    ok = false;
    parts.push("missing invoke log");
  }
  if (!logs.some((l) => l === success)) {
    ok = false;
    parts.push("missing success log");
  }
}

return { ok, message: parts.length ? parts.join("; ") : "Verified" };
`.trim();

const SQUADS_TX_URL =
  "https://app.squads.so/squads/5hARLsT1VA2AmuGL2AXUeSyyFG6o2Fcpb9S6aKXNsbeK/transactions";

const SKY_OFT_TOOLING_URL = "https://sky-oft-tooling.vercel.app/";

const RO_SQUADS_BUILD = `1. Open <a href="${SQUADS_TX_URL}" target="_blank" rel="noopener noreferrer">Squads</a>, then go to Developers → Tx Builder → Create Transaction
2. Click Add Instruction → Import from base58
3. Use <a href="${SKY_OFT_TOOLING_URL}" target="_blank" rel="noopener noreferrer">sky-oft-tooling.vercel.app</a> to generate the Base58 Instruction Data`;

const RO_AFTER_SIMULATE = `After clicking Simulate, confirm each item below.`;

const RO_SIGN_REJECT = `1. Sign the transaction (this initiates it and adds your approval)
2. Immediately reject your own approval on the transaction`;

const PREPARE_NEXT_COMPLETE_EXPR =
  "prepare_next_freeze_tx.v_program_id === true && " +
  "prepare_next_freeze_tx.v_account_1 === true && " +
  "prepare_next_freeze_tx.v_account_2 === true && " +
  "prepare_next_freeze_tx.v_ix_data === true && " +
  "prepare_next_freeze_tx.v_single_ix_two_accts === true && " +
  "prepare_next_freeze_tx.v_sim_success === true && " +
  "prepare_next_freeze_tx.v_sim_logs === true && " +
  "prepare_next_freeze_tx.v_no_extra_transfers === true && " +
  "prepare_next_freeze_tx.v_small_fee === true && " +
  "prepare_next_freeze_tx.v_rejected_approval === true";

export const freezeSolanaBridgeTemplate: Template = {
  key: "freeze-solana-bridge",
  name: "Freeze Solana Bridge",
  description:
    "Record a set_pause(true) Solana transaction, verify on-chain and via RPC, then branch: retry the signature or follow Squads steps to queue the next freeze.",
  firstStepKey: "record_freeze_tx",
  permissions: [],
  steps: [
    {
      key: "record_freeze_tx",
      type: "input",
      title: "Record freeze transaction",
      permissions: [],
      nextStepKey: "verify_post_freeze",
      inputs: [
        {
          key: "transactionSignature",
          type: "string",
          title: "Solana transaction signature (base58 from explorer or wallet, not 0x)",
        },
      ],
    },
    {
      key: "verify_post_freeze",
      type: "script",
      title: "Verifying bridge frozen by transaction",
      source: VERIFY_POST_FREEZE_SOURCE,
      nextStepKey: "view_verification_result",
    },
    {
      key: "view_verification_result",
      type: "input",
      title: "Verification result",
      permissions: [],
      nextStepKey: "after_verification_branch",
      inputs: [
        {
          key: "verification_summary",
          type: "string-multiline",
          title: "Outcome",
          readOnly: true,
          defaultValue: "${verify_post_freeze.message}",
        },
      ],
    },
    {
      key: "after_verification_branch",
      type: "condition",
      title: "Post-verification checks",
      expression: "verify_post_freeze.ok === true",
      thenStepKey: "prepare_next_freeze_tx",
      elseStepKey: "record_freeze_tx",
      nextStepKey: null,
    },
    {
      key: "prepare_next_freeze_tx",
      type: "input",
      title: "Prepare next freeze (Squads)",
      permissions: [],
      nextStepKey: null,
      completeExpression: PREPARE_NEXT_COMPLETE_EXPR,
      inputs: [
        {
          key: "ro_squads_build",
          type: "string-multiline",
          title: "Build the transaction",
          readOnly: true,
          defaultValue: RO_SQUADS_BUILD,
        },
        {
          key: "v_program_id",
          type: "bool",
          title:
            "Verify: Program ID matches: SKYTAiJRkgexqQqFoqhXdCANyfziwrVrzjhBaCzdbKW",
        },
        {
          key: "v_account_1",
          type: "bool",
          title:
            "Verify: Account 1 is the pauser multisig: 5hARLsT1VA2AmuGL2AXUeSyyFG6o2Fcpb9S6aKXNsbeK [Signer, Writable]",
        },
        {
          key: "v_account_2",
          type: "bool",
          title:
            "Verify: Account 2 is the OFT Store PDA: BEvTHkTyXooyaJzP8egDUC7WQK8cyRrq5WvERZNWhuah [Writable]",
        },
        {
          key: "v_ix_data",
          type: "bool",
          title:
            "Verify: Instruction data is oc55b1rv7Bb6 (base58) = 3f209a0238674f2d01 (hex) = set_pause(true)",
        },
        {
          key: "v_single_ix_two_accts",
          type: "bool",
          title: "Verify: Only 1 instruction, only 2 accounts — nothing extra",
        },
        {
          key: "ro_after_simulate",
          type: "string-multiline",
          title: "Simulate",
          readOnly: true,
          defaultValue: RO_AFTER_SIMULATE,
        },
        {
          key: "v_sim_success",
          type: "bool",
          title: 'Verify: Status shows "Success"',
        },
        {
          key: "v_sim_logs",
          type: "bool",
          title:
            "Verify: Logs show Program SKYTAiJR… invoke [1] and Program SKYTAiJR… success",
        },
        {
          key: "v_no_extra_transfers",
          type: "bool",
          title: "Verify: No unexpected token transfers or additional instructions",
        },
        {
          key: "v_small_fee",
          type: "bool",
          title: "Verify: Only a small SOL transaction fee applies",
        },
        {
          key: "ro_sign_reject",
          type: "string-multiline",
          title: "Sign then reject your approval",
          readOnly: true,
          defaultValue: RO_SIGN_REJECT,
        },
        {
          key: "v_rejected_approval",
          type: "bool",
          title: "Verify: I have rejected my own approval on the transaction",
        },
      ],
    },
  ],
  resultViewControls: [
    {
      title: "Verification",
      plainText: true,
      data: "${verify_post_freeze.message}",
    },
  ],
};
