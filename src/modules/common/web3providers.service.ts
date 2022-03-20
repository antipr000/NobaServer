//TODO check why import doesn't work
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Web3 = require('web3');
import {Transaction as EthTransaction} from 'ethereumjs-tx';
import { Injectable } from "@nestjs/common";
import { Web3TransactionHandler } from './domain/Types';


// We should not store the private key of our hard wallet in code. //TODO create configs for this and inject from AWS vault
@Injectable()
export class Web3ProviderService {
    //TODO take these from configs and aws secret vault instead of hardcoding
    private readonly private_key_for_senders_account = 'da35ce7a3c27c294ef7237280074b963d5784aa1fdaa0c0c96741a660ad10708'
    private readonly public_address_of_senders_account = '0x73D20Fd99adE20aC3ae7fd36169974E2846a7Cb9'
    private readonly public_address_of_test_recipient_account = '0x59FfEC90A237BC089258c7eD4cc9B7A4283B3583'
    private readonly projectId = "586ef52d74ea4067a84f46ec1f2b45be"
    private readonly provider = "https://ropsten.infura.io/v3/" + this.projectId;
    private readonly httpProvider = new Web3.providers.HttpProvider(this.provider);
    private readonly hexPrivateKey = Buffer.from(this.private_key_for_senders_account, 'hex');
    private readonly web3  = new Web3(this.httpProvider);

    async transferEther(amount: number, destinationAddress: string, web3TransactionHandler: Web3TransactionHandler) {
        
        //TODO change this to actual destianation address
        destinationAddress = this.public_address_of_test_recipient_account;


        // construct the transaction data
        // NOTE: property 'nonce' must be merged in from web3.eth.getTransactionCount 
        // before the transaction data is passed to new Tx(); see sendRawTransaction below.

        // txCount = web3.eth.getTransactionCount(public_address_of_senders_account);

        const rawTx = {
            //TODO take this from configs??
            gasLimit: this.web3.utils.toHex(25000),
            gasPrice: this.web3.utils.toHex(10e9), 
            to: destinationAddress,
            from: this.public_address_of_senders_account,
            value: this.web3.utils.toHex(this.web3.utils.toWei(''+amount, 'ether')),
        }

        await this.sendRawTransaction(rawTx, web3TransactionHandler);
    }

    /** Signs the given transaction data and sends it. Abstracts some of the details of 
    * buffering and serializing the transaction for web3.
    * @returns A promise of an object that emits events: transactionHash, receipt, confirmaton, error
    */

    private async sendRawTransaction(rawTx, web3TransactionHandler: Web3TransactionHandler) {
        // get the number of transactions sent so far so we can create a fresh nonce

        const txCount = await this.web3.eth.getTransactionCount(rawTx.from);

        // Set a variable of transaction count for nonce
        const newNonce = this.web3.utils.toHex(txCount)

        console.log(`newNonce: ${newNonce}, txCount: ${txCount}`);

        // Add the nonce and chain info to the transaction as a new Tx()
        const transaction = new EthTransaction({ ...rawTx, nonce: newNonce }, { chain: 'ropsten' }) //TODO take chain from configs!!

        // Sign the transaction
        transaction.sign(this.hexPrivateKey)

        // Serialize it
        const serializedTx = transaction.serialize().toString('hex')

        // Return transaction along with promised steps, TODO poll the status instead of waiting here till eternity, below approach will lead to partial failures
        return this.web3.eth.sendSignedTransaction('0x' + serializedTx)
            .on('transactionHash', txHash => {
                web3TransactionHandler.onTransactionHash(txHash);
            })
            .on('receipt', receipt => {
                web3TransactionHandler.onReceipt(receipt);
            })
           /*  .on('confirmation', (confirmationNumber, receipt) => {
            if (confirmationNumber >= 1) {
                console.log('confirmations:', confirmationNumber, receipt)
            }
            }) */
            .on('error', error => {
                web3TransactionHandler.onError(error);
            });

    }
  



  

}