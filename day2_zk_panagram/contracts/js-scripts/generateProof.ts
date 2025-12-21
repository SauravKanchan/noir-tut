import { UltraHonkBackend } from "@aztec/bb.js";
import { ethers } from "ethers";
import { Noir } from "@aztec/noir-noir_js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// This gets you the equivalent of __dirname in an ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const circuitPath = path.resolve(__dirname, '../../circuits/target/day2_zk_panagram.json');

const circuit = JSON.parse(fs.readFileSync(circuitPath, 'utf8'));

// Field modulus for BN254
const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const normalizeField = (value: string) => {
  const big = BigInt(value);
  const modded = ((big % FIELD_MODULUS) + FIELD_MODULUS) % FIELD_MODULUS;
  return `0x${modded.toString(16)}`;
};

export default async function generateProof() {
  const inputs = process.argv.slice(2);
  if (inputs.length < 3) {
    throw new Error("Usage: tsx generateProof.ts <guess> <address> <expected_hash>");
  }

  try {
    const noir = new Noir(circuit);
    const honk = new UltraHonkBackend(circuit.bytecode, { threads: 1 });

    const input = {
      // Private Inputs
      guess: normalizeField(inputs[0]),
      // Public Inputs
      expected_hash: normalizeField(inputs[2]),
      address: normalizeField(inputs[1]),
    };
    const { witness } = await noir.execute(input);

    const originalLog = console.log; // Save original
    // Override to silence all logs
    console.log = () => {};

    // Use keccak transcript so the proof matches the onchain verifier
    const { proof, publicInputs } = await honk.generateProof(witness, { keccak: true });

    console.log = originalLog;

    const res = ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes", "bytes32[]"],
        [proof, publicInputs]
      );
    return res;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

// Only emit the encoded proof when executed directly (so imports don't print)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateProof()
    .then((res) => {
      process.stdout.write(res);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
