import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sha256 } from "../src/db/sha256";
import { texteGraine } from "./helpers";

describe("SHA-256 pur TypeScript", () => {
  it("vecteurs de référence FIPS 180-4", () => {
    expect(sha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")).toBe("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
  });
  it("identique à node:crypto sur la graine réelle (UTF-8 accentué)", () => {
    const t = texteGraine();
    expect(sha256(t)).toBe(createHash("sha256").update(t, "utf8").digest("hex"));
    expect(sha256("é€😀")).toBe(createHash("sha256").update("é€😀", "utf8").digest("hex"));
  });
});
