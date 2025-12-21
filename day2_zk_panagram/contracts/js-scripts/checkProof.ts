import { UltraHonkBackend, UltraHonkVerifierBackend } from "@aztec/bb.js";
import { ethers } from "ethers";
// @ts-ignore
import generateProof from "./generateProof.ts";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const circuitPath = path.resolve(__dirname, "../../circuits/target/day2_zk_panagram.json");
const circuit = JSON.parse(fs.readFileSync(circuitPath, "utf8"));

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error("Usage: tsx checkProof.ts <guess> <address> <expected_hash>");
    process.exit(1);
  }

  // Reuse generateProof by temporarily setting argv to the supplied inputs
  const originalArgv = process.argv;
  process.argv = [originalArgv[0], originalArgv[1], ...args];
  const encoded = await generateProof();
  process.argv = originalArgv;

  const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["bytes", "bytes32[]"], encoded);
  const proof = ethers.getBytes(decoded[0]);
  const publicInputs = decoded[1].map((x) => x.toString());

  const backend = new UltraHonkBackend(circuit.bytecode, { threads: 1 });
  const verificationKey = await backend.getVerificationKey({ keccak: true });

  const verifier = new UltraHonkVerifierBackend({ threads: 1 });
  const verified = await verifier.verifyProof({ proof, publicInputs, verificationKey }, { keccak: true });
  console.log("local verify", verified, "publicInputs", publicInputs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
