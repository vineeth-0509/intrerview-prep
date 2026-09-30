import { lookup as dnsLookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";



export class UnsafeUrlError extends Error {}

const UNSAFE_RANGES = new Set([
  "private",
  "loopback",
  "linkLocal",
  "uniqueLocal",
  "reserved",
  "carrierGradeNat",
  "unspecified",
  "broadcast",
]);

/** Pure and directly testable: is this literal IP address safe to fetch? */
export function isSafeAddress(address: string): boolean {
  let parsed: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    parsed = ipaddr.parse(address);
  } catch {
    return false; // unparseable address — refuse rather than guess
  }
  return !UNSAFE_RANGES.has(parsed.range());
}


export async function assertSafeUrl(
  rawUrl: string,
  options?: { allowLocal?: boolean },
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError(`Invalid URL: ${rawUrl}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError(`Unsupported protocol: ${parsed.protocol}`);
  }

  if (options?.allowLocal) {
    return parsed; // CLI/test-fixture escape hatch only — see module docstring
  }

  const results = await dnsLookup(parsed.hostname, { all: true });
  for (const { address } of results) {
    if (!isSafeAddress(address)) {
      throw new UnsafeUrlError(
        `Refusing to fetch ${parsed.hostname}: resolves to a private/loopback/link-local address`,
      );
    }
  }

  return parsed;
}
