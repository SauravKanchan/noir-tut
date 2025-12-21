import { UltraHonkBackend } from "@aztec/bb.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const circuitPath = path.resolve(__dirname, "../../circuits/target/day2_zk_panagram.json");
const outPath = path.resolve(__dirname, "../src/Verifier.sol");

async function main() {
  const circuit = JSON.parse(fs.readFileSync(circuitPath, "utf8"));
  const backend = new UltraHonkBackend(circuit.bytecode, { threads: 1 });

  // Match the keccak transcript used in generateProof.ts
  const vk = await backend.getVerificationKey({ keccak: true });
  const verifier = await backend.getSolidityVerifier(vk);

  fs.writeFileSync(outPath, verifier);
  console.log(`Wrote verifier to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
