import yargs from 'yargs';
import { hideBin } from 'yargs/helpers'
import { DefaultProvider, Wallet, TestNetWallet } from 'mainnet-js';
import { hash160 } from '@bitauth/libauth';
import { ethers } from 'ethers';
import { HTLC } from '../lib/HTLC';
import { cashAddrToPkh, hexToBuffer, bufferToHex } from '../lib/common';

let _Wallet = Wallet;
if (!process.env.MAINNET) {
  // console.log('testnet!!!');
  _Wallet = TestNetWallet;
}

// DefaultProvider.servers.testnet = ["wss://chipnet.imaginary.cash:50004"];
DefaultProvider.servers.testnet = ["wss://chipnet.bch.ninja:50004"];

yargs(hideBin(process.argv))
  .command('gen-user', 'gen random user', (yargs) => {
    return yargs;
  }, async (argv) => {
    await genUser();
    process.exit(0);
  })
  .command('user-info', 'show user info', (yargs) => {
    return yargs
      .option('wif', { type: 'string', demandOption: true })
      ;
  }, async (argv) => {
    await showUserInfo(argv.wif);
    process.exit(0);
  })
  .command('htlc', 'show HTLC covenant info', (yargs: any) => {
    return yargs
      .option('sender-addr',   {type: 'string', required: true,                description: '20-bytes, hex'        })
      .option('recipient-addr',{type: 'string', required: true,                description: '20-bytes, hex'        })
      .option('secret',        {type: 'string', required: true,                                                    })
      .option('expiration',    {type: 'number', required: false, default: 36,  description: 'lock time, in blocks' })
      .option('penalty-bps',   {type: 'number', required: false, default: 500, description: 'penalty ratio, in BPS'})
      ;
  }, async (argv: any) => {
    await printHtlcInfo(argv.senderAddr, argv.recipientAddr, argv.secret, argv.expiration, argv.penaltyBps);
    process.exit(0);
  })
  .command('lock', 'lock BCH to HTLC', (yargs: any) => {
    return yargs
      .option('sender-wif',    {type: 'string', required: true,                                                    })
      .option('recipient-addr',{type: 'string', required: true,                description: 'cash address'         })
      .option('secret',        {type: 'string', required: true,                                                    })
      .option('expiration',    {type: 'number', required: false, default: 36,  description: 'lock time, in blocks' })
      .option('penalty-bps',   {type: 'number', required: false, default: 500, description: 'penalty ratio, in BPS'})
      .option('sbch-addr',     {type: 'string', required: true,                description: '20-bytes, hex'        })
      .option('amt',           {type: 'number', required: true,                description: 'in sats'              })
      .option('miner-fee',     {type: 'number', required: false, default:2000, description: 'in sats'              })
      .option('unsigned',      {type: 'boolean',required: false, default: false,                                   })
      ;
  }, async (argv: any) => {
    await lock(argv.senderWif, argv.recipientAddr, argv.secret, argv.expiration, argv.penaltyBps, argv.sbchAddr,
        argv.amt, argv.minerFee, argv.unsigned);
    process.exit(0);
  })
  .command('unlock', 'unlock BCH from HTLC', (yargs: any) => {
    return yargs
      .option('recipient-wif', {type: 'string', required: true,                description: '20-bytes, hex'        })
      .option('sender-addr',   {type: 'string', required: true,                description: 'cash address'         })
      .option('secret',        {type: 'string', required: true,                                                    })
      .option('expiration',    {type: 'number', required: false, default: 36,  description: 'in blocks'            })
      .option('penalty-bps',   {type: 'number', required: false, default: 500, description: 'penalty ratio, in BPS'})
      .option('miner-fee',     {type: 'number', required: false, default:2000, description: 'in sats'              })
      .option('dry-run',       {type: 'boolean',required: false, default: false,                                   })
      ;
  }, async (argv: any) => {
    await unlock(argv.recipientWif, argv.senderAddr, argv.secret, argv.expiration, argv.penaltyBps,
        argv.minerFee, argv.dryRun);
    process.exit(0);
  })
  .command('refund', 'refund BCH from HTLC', (yargs: any) => {
    return yargs
      .option('sender-wif',    {type: 'string', required: true,                                                    })
      .option('recipient-addr',{type: 'string', required: true,                description: 'cash address'         })
      .option('secret',        {type: 'string', required: true,                                                    })
      .option('expiration',    {type: 'number', required: false, default: 36,  description: 'in blocks'            })
      .option('penalty-bps',   {type: 'number', required: false, default: 500, description: 'penalty ratio, in BPS'})
      .option('miner-fee',     {type: 'number', required: false, default:2000, description: 'in sats'              })
      .option('dry-run',       {type: 'boolean',required: false, default: false,                                   })
      ;
  }, async (argv: any) => {
    await refund(argv.senderWif, argv.recipientAddr, argv.secret, argv.expiration, argv.penaltyBps,
      argv.minerFee, argv.dryRun);
    process.exit(0);
  })
  .strictCommands()
  .argv;


async function genUser() {
  const wallet = await _Wallet.newRandom();
  console.log('wif :', wallet.privateKeyWif);
  console.log('addr:', wallet.address);
}

async function showUserInfo(wif: string) {
  const wallet = await _Wallet.fromWIF(wif);
  console.log('addr :', wallet.address);
  console.log('pbk  :', Buffer.from(wallet.getPublicKeyCompressed()).toString('hex'));
  console.log('pkh  :', Buffer.from(wallet.getPublicKeyHash()).toString('hex'));
  console.log('bal  :', await wallet.getBalance());
  console.log('utxos:');
  console.table(await wallet.getAddressUtxos(wallet.address));
}

async function printHtlcInfo(senderAddr   : string,
                             recipientAddr: string,
                             secret       : string,
                             expiration   : number,
                             penaltyBPS   : number) {
  const senderPkh = cashAddrToPkh(senderAddr);
  const recipientPkh = cashAddrToPkh(recipientAddr);
  const hashLock = getHashLock(secret);

  const wallet = await _Wallet.newRandom();
  const htlc = new HTLC(wallet, expiration, penaltyBPS);
  const contract = htlc.createContract(senderPkh, recipientPkh, hashLock);

  const redeemScriptHex = (contract as any).getContractInstance().bytecode;
  const scriptHash = Buffer.from(hash160(hexToBuffer(redeemScriptHex)));
  console.log('htlc:', {
    senderPkh   : senderPkh,
    recipientPkh: recipientPkh,
    secret      : secret,
    hashLock    : hashLock,
    expiration  : expiration,
    penaltyBPS  : penaltyBPS,
    scriptHash  : bufferToHex(scriptHash),
    cashAddr    : contract.getDepositAddress(),
    redeemScript: '0x' + redeemScriptHex,
  });

  const utxos = await contract.getUtxos();
  const sum = utxos.reduce((partialSum, utxo) => partialSum + utxo.satoshis / 10 ** 8, 0);
  console.log('UTXOs:', utxos.length);
  console.log('balance:', sum);
  console.table(utxos);
}

// lock BCH to HTLC covenant
async function lock(senderWIF    : string,
                    recipientAddr: string,
                    secret       : string,
                    expiration   : number,
                    penaltyBPS   : number,
                    sbchAddr     : string,
                    amt          : number,
                    minerFee     : number,
                    unsigned     : boolean) {
  const wallet = await _Wallet.fromWIF(senderWIF);
  const htlc = new HTLC(wallet, expiration, penaltyBPS);
  const hashLock = getHashLock(secret);
  const result = await htlc.lock(recipientAddr, sbchAddr, hashLock, amt, unsigned);
  console.log('result:', result);
}

// unlock BCH from HTLC covenant
async function unlock(recipientWIF: string,
                      senderAddr  : string,
                      secret      : string,
                      expiration  : number,
                      penaltyBPS  : number,
                      minerFee    : number,
                      dryRun      : boolean) {
  const wallet = await _Wallet.fromWIF(recipientWIF);
  const htlc = new HTLC(wallet, expiration, penaltyBPS);
  const secretHex = getSecretHex(secret);
  const result = await htlc.unlock(senderAddr, secretHex, minerFee, dryRun);
  console.log('result:', result);
}

// refund BCH from HTLC
async function refund(senderWIF    : string,
                      recipientAddr: string,
                      secret       : string,
                      expiration   : number,
                      penaltyBPS   : number,
                      minerFee     : number,
                      dryRun       : boolean) {
  const wallet = await _Wallet.fromWIF(senderWIF);
  const htlc = new HTLC(wallet, expiration, penaltyBPS);
  const hashLock = getHashLock(secret);
  const result = await htlc.refund(recipientAddr, hashLock, minerFee, dryRun);
  console.log('result:', result);
}

function getHashLock(secret: string): string {
  const secretHex = getSecretHex(secret);
  return HTLC.getHashLock(secretHex);
}
function getSecretHex(secret: string): string {
  if (secret.startsWith('0x') && secret.length == 66) {
    return secret;
  } else {
    return ethers.utils.formatBytes32String(secret);
  }
}
