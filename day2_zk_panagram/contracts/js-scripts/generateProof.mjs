import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@aztec/noir-noir_js";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const circuitPath = path.resolve(__dirname, "../../circuits/target/day2_zk_panagram.json");
const circuit = JSON.parse(fs.readFileSync(circuitPath, "utf8"));

const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const normalizeField = (value) => {
  const big = BigInt(value);
  const modded = ((big % FIELD_MODULUS) + FIELD_MODULUS) % FIELD_MODULUS;
  return `0x${modded.toString(16)}`;
};

async function generateProof(args) {
  const inputs = args ?? process.argv.slice(2);
  if (inputs.length < 3) {
    throw new Error("Usage: node generateProof.mjs <guess> <address> <expected_hash>");
  }

  const noir = new Noir(circuit);
  const honk = new UltraHonkBackend(circuit.bytecode, { threads: 1 });

  const input = {
    guess: normalizeField(inputs[0]),
    address: normalizeField(inputs[1]),
    expected_hash: normalizeField(inputs[2]),
  };

  const { witness } = await noir.execute(input);

  const originalLog = console.log;
  console.log = () => {};
  // Match the onchain verifier transcript
  const { proof, publicInputs } = await honk.generateProof(witness, { keccak: true });
  console.log = originalLog;

  return ethers.AbiCoder.defaultAbiCoder().encode(["bytes", "bytes32[]"], [proof, publicInputs]);
}

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

export default generateProof;
