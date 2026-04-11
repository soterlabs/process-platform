/**
 * Whitelisted helpers for template expressions: Ethereum function selector (keccak256
 * of canonical signature) and ABI-encoded call data (selector + encoded arguments).
 * Used by expression-service and client-side {{ }} evaluation.
 */
import {
  AbiCoder,
  concat,
  dataSlice,
  FunctionFragment,
  getAddress,
  id,
  keccak256 as ethersKeccak256,
  toUtf8Bytes,
} from "ethers";

export type Keccak256Tuple = [selector: string, types: string[]];

/**
 * Rate-limit key seeds used with {@link makeAddressKey}. Must match on-chain
 * `bytes32` constants (e.g. `keccak256(bytes("LIMIT_SUBSCRIBE"))`).
 */
export const LIMIT_SUBSCRIBE = id("LIMIT_SUBSCRIBE");
export const LIMIT_COLLECT = id("LIMIT_COLLECT");

/**
 * Solidity: `keccak256(abi.encode(key, a))` with `key` bytes32 and `address` `a`.
 */
export function makeAddressKey(key: unknown, address: unknown): string {
  if (typeof key !== "string" || !/^0x[0-9a-fA-F]{64}$/i.test(key)) {
    throw new Error("makeAddressKey: key must be a bytes32 hex string (0x + 64 hex digits)");
  }
  if (typeof address !== "string" || address.trim() === "") {
    throw new Error("makeAddressKey: address is required");
  }
  const addr = getAddress(address.trim());
  const encoded = AbiCoder.defaultAbiCoder().encode(["bytes32", "address"], [key, addr]);
  return ethersKeccak256(encoded);
}

/**
 * Computes the 4-byte function selector and returns it with the parsed parameter types
 * for use with {@link generatePayload}.
 *
 * Pass the canonical Solidity signature in **one string** (same string hashed for
 * `bytes4(keccak256(...))` on-chain), e.g.:
 * - `keccak256("subscribe(address)")`
 * - `keccak256("transfer(address,uint256)")`
 */
export function keccak256(signature: string): Keccak256Tuple {
  if (typeof signature !== "string" || !signature.trim()) {
    throw new Error('keccak256 requires a signature string, e.g. keccak256("subscribe(address)")');
  }
  const normalized = signature.replace(/\s+/g, " ").trim();
  if (!normalized.includes("(")) {
    throw new Error(
      'keccak256: expected a function signature such as "subscribe(address)"'
    );
  }

  const frag = FunctionFragment.from(normalized);
  const sigHash = frag.format("sighash");
  const hash = ethersKeccak256(toUtf8Bytes(sigHash));
  const selector = dataSlice(hash, 0, 4);
  const types = frag.inputs.map((input) => input.type);
  return [selector, types];
}

/**
 * ABI-encodes arguments and prefixes with the selector from {@link keccak256}.
 * First argument must be the tuple returned by `keccak256(...)`.
 */
export function generatePayload(keccakTuple: unknown, ...values: unknown[]): string {
  if (!Array.isArray(keccakTuple) || keccakTuple.length !== 2) {
    throw new Error(
      "generatePayload: first argument must be the tuple returned by keccak256(...)"
    );
  }
  const [selector, types] = keccakTuple as [unknown, unknown];
  if (typeof selector !== "string" || !/^0x[0-9a-fA-F]{8}$/.test(selector)) {
    throw new Error("generatePayload: invalid selector (expected 0x + 4 bytes)");
  }
  if (!Array.isArray(types) || !types.every((t) => typeof t === "string")) {
    throw new Error("generatePayload: invalid types tuple from keccak256");
  }
  if (types.length !== values.length) {
    throw new Error(
      `generatePayload: type count (${types.length}) does not match value count (${values.length})`
    );
  }
  for (let i = 0; i < types.length; i++) {
    const t = types[i]!;
    const v = values[i];
    if (t === "address") {
      if (v === undefined || v === null) return "";
      if (typeof v === "string" && v.trim() === "") return "";
    } else if (t.startsWith("uint") || t.startsWith("int")) {
      if (v === undefined || v === null) return "";
      if (typeof v === "string" && v.trim() === "") return "";
    }
  }
  const normalized = values.map((v, i) => {
    const t = types[i]!;
    if (t === "address") {
      if (typeof v !== "string") return v;
      return getAddress(v.trim());
    }
    if (typeof v === "string" && (t.startsWith("uint") || t.startsWith("int"))) {
      return v.trim().replace(/\s+/g, "");
    }
    return v;
  });
  const encoded = AbiCoder.defaultAbiCoder().encode(types, normalized);
  return concat([selector, encoded]);
}
