import { default as Web3 } from 'web3';
import { Transaction } from 'web3-core';
import { BlockTransactionObject } from 'web3-eth';

import { Inject, Injectable, Logger } from '@nestjs/common';

import { WEB3_PROVIDER_ID } from '../config/constants';
import { precisionFormat } from '../utils/precisionFormat.util';

@Injectable()
export class EthService {
  private readonly logger = new Logger(EthService.name);

  constructor(
    @Inject(WEB3_PROVIDER_ID) private readonly web3: Web3
  ) {}

  /**
   * Fetch actual balance of the addr.
   *
   * @param {string} addr
   * @returns {Promise<string>}
   *
   * @memberOf EthService
   */
  async getBalance(addr: string): Promise<string> {
    const value: string = await this.web3.eth.getBalance(addr);
    this.logger.debug(`Fetch actual balance for addr "${addr}": ${value}`);
    return precisionFormat(value);
  }

  /**
   * Fetch data from blocks with transactions and seek for transactions with value greater than zero and contains target addrs.
   * If they found - return it.
   *
   * @param {number} startBlock
   * @param {number} endBlock
   * @param {string[]} addrs
   * @returns {Promise<any[]>}
   *
   * @memberOf EthService
   */
  public async getValuedTransactionsBatchRange(startBlock: number, endBlock: number, addrs: string[]): Promise<any[]> {
    this.logger.debug(`Start seek for valued transactions from #${startBlock} to #${endBlock} with targets ${addrs.join(', ')}.`);
    const range = Array.from(Array(endBlock - startBlock + 1).keys());

    const promises = range.map((i) =>
      new Promise(async (resolve, reject) => {
        try {
          const block: BlockTransactionObject = await this.web3.eth.getBlock(i + startBlock, true);
          if (block && block.transactions.length) {
            this.logger.debug(`Fetched block #${block.number} has ${block.transactions.length} transactions.`);
            // Seek not null value transactions, contains target addrs.
            const valued = block.transactions
                            .filter((t: Transaction) => '0' !== t.value)
                            .filter((t: Transaction) => (t.to && addrs.includes(t.to)) || addrs.includes(t.from));
            resolve({
              timestamp: block.timestamp,
              transactions: valued
            });
          } else resolve([]);
        } catch(error) {
          reject(error);
        }
      })
    );

    const results = await Promise.all(promises);
    return results.filter((v: { transactions: any[] }) => ('transactions' in v) && v.transactions.length)
  }
}
