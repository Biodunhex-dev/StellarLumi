import {
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  nativeToScVal,
  scValToNative,
  SorobanRpc,
} from '@stellar/stellar-sdk';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://soroban-testnet.stellar.org';
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? '';
const NETWORK_PASSPHRASE = Networks.TESTNET;

export const rpc = new SorobanRpc.Server(RPC_URL);

export async function buildTx(
  sourcePublicKey: string,
  method: string,
  args: xdr.ScVal[],
) {
  const account = await rpc.getAccount(sourcePublicKey);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(simResult.error);
  }
  return SorobanRpc.assembleTransaction(tx, simResult).build();
}

export function toScVal(value: unknown): xdr.ScVal {
  return nativeToScVal(value);
}

export function fromScVal(val: xdr.ScVal): unknown {
  return scValToNative(val);
}
