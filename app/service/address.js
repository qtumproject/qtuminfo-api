const {Service} = require('egg')

class AddressService extends Service {
  async getAddressSummary(addressIds, p2pkhAddressIds, hexAddresses) {
    const {Block} = this.ctx.model
    const {balance: balanceService, contract: contractService} = this.ctx.service
    const {in: $in, gt: $gt} = this.app.Sequelize.Op
    let [
      {totalReceived, totalSent},
      unconfirmed,
      staking,
      mature,
      qrc20Balances,
      ranking,
      blocksMined,
      transactionCount
    ] = await Promise.all([
      balanceService.getTotalBalanceChanges(addressIds),
      balanceService.getUnconfirmedBalance(addressIds),
      balanceService.getStakingBalance(addressIds),
      balanceService.getMatureBalance(p2pkhAddressIds),
      contractService.getAllQRC20Balances(hexAddresses),
      balanceService.getBalanceRanking(addressIds),
      Block.count({where: {minerId: {[$in]: p2pkhAddressIds}, height: {[$gt]: 0}}}),
      this.getAddressTransactionCount(addressIds, hexAddresses),
    ])
    return {
      balance: totalReceived - totalSent,
      totalReceived,
      totalSent,
      unconfirmed,
      staking,
      mature,
      qrc20Balances,
      ranking,
      transactionCount,
      blocksMined
    }
  }

  async getAddressTransactionCount(addressIds, hexAddresses) {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    let addressQuery = addressIds.join(', ') || 'NULL'
    let topicQuery = hexAddresses.map(address => `0x${'0'.repeat(24) + address.toString('hex')}`).join(', ') || 'NULL'
    let [{count}] = await db.query(`
      SELECT COUNT(*) AS count FROM (
        SELECT transaction_id FROM balance_change WHERE address_id IN (${addressQuery})
        UNION
        SELECT receipt.transaction_id AS transaction_id FROM receipt, receipt_log, contract
        WHERE receipt._id = receipt_log.receipt_id
          AND contract.address = receipt_log.address AND contract.type IN ('qrc20', 'qrc721')
          AND receipt_log.topic1 = 0x${TransferABI.id.toString('hex')}
          AND (receipt_log.topic2 IN (${topicQuery}) OR receipt_log.topic3 IN (${topicQuery}))
      ) AS list
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    return count
  }

  async getAddressTransactions(addressIds, hexAddresses, {pageSize = 10, pageIndex = 0, reversed = true} = {}) {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    let limit = pageSize
    let offset = pageIndex * pageSize
    let order = reversed ? 'DESC' : 'ASC'
    let addressQuery = addressIds.join(', ') || 'NULL'
    let topicQuery = hexAddresses.map(address => `0x${'0'.repeat(24) + address.toString('hex')}`).join(', ') || 'NULL'
    let totalCount = await this.getAddressTransactionCount(addressIds, hexAddresses)
    let transactions = (await db.query(`
      SELECT tx.id FROM (
        SELECT transaction_id AS id FROM balance_change WHERE address_id IN (${addressQuery})
        UNION
        SELECT receipt.transaction_id AS id FROM receipt, receipt_log, contract
        WHERE receipt._id = receipt_log.receipt_id
          AND contract.address = receipt_log.address AND contract.type IN ('qrc20', 'qrc721')
          AND receipt_log.topic1 = 0x${TransferABI.id.toString('hex')}
          AND (receipt_log.topic2 IN (${topicQuery}) OR receipt_log.topic3 IN (${topicQuery}))
      ) AS list INNER JOIN transaction tx ON tx._id = list.id
      ORDER BY tx.block_height ${order}, tx.index_in_block ${order}, tx._id ${order}
      LIMIT ${offset}, ${limit}
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})).map(({id}) => id)
    return {totalCount, transactions}
  }

  async getUTXO(ids) {
    const {Address, TransactionOutput} = this.ctx.model
    const {in: $in, gt: $gt} = this.app.Sequelize.Op
    const blockHeight = this.app.blockchainInfo.tip.height
    let utxos = await TransactionOutput.findAll({
      where: {
        addressId: {[$in]: ids},
        outputHeight: {[$gt]: 0},
        inputHeight: null
      },
      attributes: ['outputTxId', 'outputIndex', 'outputHeight', 'scriptPubKey', 'value', 'isStake'],
      include: [{
        model: Address,
        as: 'address',
        required: true,
        attributes: ['string']
      }],
      transaction: this.ctx.state.transaction
    })
    return utxos.map(utxo => ({
      transactionId: utxo.outputTxId,
      outputIndex: utxo.outputIndex,
      scriptPubKey: utxo.scriptPubKey,
      address: utxo.address.string,
      value: utxo.value,
      isStake: utxo.isStake,
      blockHeight: utxo.outputHeight,
      confirmations: utxo.outputHeight === 0xffffffff ? 0 : blockHeight - utxo.outputHeight + 1
    }))
  }
}

module.exports = AddressService
