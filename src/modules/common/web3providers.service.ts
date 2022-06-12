//TODO check why import doesn't work
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Web3 = require("web3");
import { Injectable } from "@nestjs/common";
import { bech32 } from "bech32";
import { Transaction as EthTransaction } from "ethereumjs-tx";
import { Web3TransactionHandler } from "./domain/Types";

// We should not store the private key of our hard wallet in code. //TODO create configs for this and inject from AWS vault
@Injectable()
export class EthereumWeb3ProviderService {
  //TODO take these from configs and aws secret vault instead of hardcoding
  private readonly private_key_for_senders_account = "da35ce7a3c27c294ef7237280074b963d5784aa1fdaa0c0c96741a660ad10708";
  private readonly public_address_of_senders_account = "0x73D20Fd99adE20aC3ae7fd36169974E2846a7Cb9";
  private readonly public_address_of_test_recipient_account = "0x59FfEC90A237BC089258c7eD4cc9B7A4283B3583";
  private readonly projectId = "586ef52d74ea4067a84f46ec1f2b45be";
  private readonly provider = "https://ropsten.infura.io/v3/" + this.projectId;
  private readonly httpProvider = new Web3.providers.HttpProvider(this.provider);
  private readonly hexPrivateKey = Buffer.from(this.private_key_for_senders_account, "hex");
  private readonly web3 = new Web3(this.httpProvider);

  isValidAddress(address: string) {
    return this.web3.utils.isAddress(address);
  }

  async transferEther(amount: number, destinationAddress: string, web3TransactionHandler: Web3TransactionHandler) {
    //TODO change this to actual destianation address
    destinationAddress = this.public_address_of_test_recipient_account;

    // construct the transaction data
    // NOTE: property 'nonce' must be merged in from web3.eth.getTransactionCount
    // before the transaction data is passed to new Tx(); see sendRawTransaction below.

    // txCount = web3.eth.getTransactionCount(public_address_of_senders_account);

    // console.log("ether amount", amount);

    const rawTx = {
      //TODO take this from configs??
      gasLimit: this.web3.utils.toHex(250000),
      gasPrice: this.web3.utils.toHex(10e11),
      to: destinationAddress,
      from: this.public_address_of_senders_account,
      value: this.web3.utils.toHex(this.web3.utils.toWei("" + amount, "ether")),
    };

    await this.sendRawTransaction(rawTx, web3TransactionHandler);
  }

  /** Signs the given transaction data and sends it. Abstracts some of the details of
   * buffering and serializing the transaction for web3.
   * @returns A promise of an object that emits events: transactionHash, receipt, confirmaton, error
   */

  private async sendRawTransaction(rawTx, web3TransactionHandler: Web3TransactionHandler) {
    // get the number of transactions sent so far so we can create a fresh nonce

    // console.log("Raw transaction", rawTx);

    const txCount = await this.web3.eth.getTransactionCount(rawTx.from);

    // Set a variable of transaction count for nonce
    const newNonce = this.web3.utils.toHex(txCount);

    // console.log(`newNonce: ${newNonce}, txCount: ${txCount}`);

    // Add the nonce and chain info to the transaction as a new Tx()
    const transaction = new EthTransaction({ ...rawTx, nonce: newNonce }, { chain: "ropsten" }); //TODO take chain from configs!!

    // Sign the transaction
    transaction.sign(this.hexPrivateKey);

    // Serialize it
    const serializedTx = transaction.serialize().toString("hex");

    // Return transaction along with promised steps, TODO poll the status instead of waiting here till eternity, below approach will lead to partial failures
    return (
      this.web3.eth
        .sendSignedTransaction("0x" + serializedTx)
        .on("transactionHash", txHash => {
          web3TransactionHandler.onTransactionHash(txHash);
        })
        .on("receipt", receipt => {
          web3TransactionHandler.onReceipt(receipt);
        })
        /*  .on('confirmation', (confirmationNumber, receipt) => {
            if (confirmationNumber >= 1) {
                console.log('confirmations:', confirmationNumber, receipt)
            }
            }) */
        .on("error", error => {
          web3TransactionHandler.onError(error);
        })
    );
  }
}

@Injectable()
export class TerraWeb3ProviderService {
  private readonly chain_ids = {
    "terra-main": "columbus-5",
    "terra-test": "bombay-12",
  };

  private readonly provider =
    "https://restless-aged-grass.terra-testnet.quiknode.pro/ebb527319a9f248f0e3840a10a61487b5a0bf850/";

  // Throwaway Wallets (Created via Terra Station)
  // MENMONICS SHOULD NEVER BE AVAILABLE IN OUR CODE
  // TODO: Setup AWS Vault to store these later on
  // THESE ARE THROWAWAYS
  // Wallet 1
  // Monitor: https://finder.terra.money/testnet/address/terra1trrnqzkyef3wv78y745wnjy0re905gthxm4jy0
  private readonly wallet_1_mnemonic =
    "double sort claw reform negative manage swift aspect people bulk huge library orient divorce battle first dignity truth coin hill wealth stone twice invest";

  // We can find this dynamically
  // private readonly wallet_1_address = "terra1trrnqzkyef3wv78y745wnjy0re905gthxm4jy0";

  // Wallet 2
  // Monitor: https://finder.terra.money/testnet/address/terra13wfl4kq7yd6lpmyym4tlhl5wu3rmhe3devtfgc
  // const wallet_2_mnemonic = "base nurse velvet author egg yard repair rival champion street awesome music tunnel silent lava climb scheme tornado gaze unaware lizard top easily parrot";
  // no need of above mnemonic
  // private readonly wallet_2_address = "terra13wfl4kq7yd6lpmyym4tlhl5wu3rmhe3devtfgc";
  // Wallet 2 can be used for testing purposes and so please do not delete this comment

  // check whether it is a valid terra address
  // advanced address validation, it verify also the bech32 checksum
  isValidAddress(address) {
    try {
      const { prefix: decodedPrefix } = bech32.decode(address); // throw error if checksum is invalid
      // verify address prefix
      return decodedPrefix === "terra";
    } catch {
      // invalid checksum
      return false;
    }
  }

  async transferTerra(
    amount: number,
    destinationAddress: string,
    web3TransactionHandler: Web3TransactionHandler,
    coinID: string,
  ) {
    // Inline import to make sure we don't have to install the Terra package for other providers
    // todo ask ankit if there is a way to do this at class level, it didnt seem to work for me
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MsgSend, MnemonicKey, LCDClient } = require("@terra-money/terra.js");
    const terra = new LCDClient({
      URL: this.provider,
      chainID: this.chain_ids["terra-test"],
    });

    // Sender and Recipient Details
    const senderMnemonic = new MnemonicKey({
      mnemonic: this.wallet_1_mnemonic,
    });

    const senderWallet = terra.wallet(senderMnemonic);
    const senderAddress = senderWallet.key.accAddress;
    const ucoinID = coinID === "terrausd" ? "uusd" : "uluna";
    const send = new MsgSend(senderAddress, destinationAddress, { [ucoinID]: amount * 1e6 });

    // console.log(send);

    const broadcastResult = await senderWallet
      .createAndSignTx({
        msgs: [send],
        memo: "test!",
      })
      .then(tx => terra.tx.broadcast(tx))
      .then(broadcastResult => web3TransactionHandler.onTransactionHash(broadcastResult.txHash)) // TODO: even though i update txHash, it is not getting set as cryptoTx id in response. Ask Ankit what am I missing here in code review
      .catch(web3TransactionHandler.onError);

    // console.log(signedTx);
    // const broadcastResult = await terra.tx.broadcast(signedTx);
    // console.log('txhash is: ', broadcastResult.txhash);
  }
}
