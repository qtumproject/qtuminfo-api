const {Service} = require('egg')

class AddressService extends Service {
  async getAddressSummary(addressIds, p2pkhAddressIds, hexAddresses) {
    const {Block} = this.ctx.model
    const {balance: balanceService, qrc20: qrc20Service} = this.ctx.service
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
      qrc20Service.getAllQRC20Balances(hexAddresses),
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
    const {sql} = this.ctx.helper
    let topics = hexAddresses.map(address => Buffer.concat([Buffer.alloc(12), address]))
    let [{count}] = await db.query(sql`
      SELECT COUNT(*) AS count FROM (
        SELECT transaction_id FROM balance_change WHERE address_id IN ${addressIds}
        UNION
        SELECT receipt.transaction_id AS transaction_id FROM receipt, receipt_log, contract
        WHERE receipt._id = receipt_log.receipt_id
          AND contract.address = receipt_log.address AND contract.type IN ('qrc20', 'qrc721')
          AND receipt_log.topic1 = ${TransferABI.id}
          AND (receipt_log.topic2 IN ${topics} OR receipt_log.topic3 IN ${topics})
          AND (
            (contract.type = 'qrc20' AND receipt_log.topic3 IS NOT NULL AND receipt_log.topic4 IS NULL)
            OR (contract.type = 'qrc721' AND receipt_log.topic4 IS NOT NULL)
          )
      ) list
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    return count
  }

  async getAddressTransactions(addressIds, hexAddresses) {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    const {sql} = this.ctx.helper
    let {limit, offset, reversed = true} = this.ctx.state.pagination
    let order = reversed ? 'DESC' : 'ASC'
    let topics = hexAddresses.map(address => Buffer.concat([Buffer.alloc(12), address]))
    let totalCount = await this.getAddressTransactionCount(addressIds, hexAddresses)
    let transactions = (await db.query(sql`
      SELECT tx.id AS id FROM (
        SELECT _id FROM (
          SELECT block_height, index_in_block, transaction_id AS _id FROM balance_change
          WHERE address_id IN ${addressIds}
          UNION
          SELECT receipt.block_height AS block_height, receipt.index_in_block AS index_in_block, receipt.transaction_id AS _id
          FROM receipt, receipt_log, contract
          WHERE receipt._id = receipt_log.receipt_id
            AND contract.address = receipt_log.address AND contract.type IN ('qrc20', 'qrc721')
            AND receipt_log.topic1 = ${TransferABI.id}
            AND (receipt_log.topic2 IN ${topics} OR receipt_log.topic3 IN ${topics})
            AND (
              (contract.type = 'qrc20' AND receipt_log.topic3 IS NOT NULL AND receipt_log.topic4 IS NULL)
              OR (contract.type = 'qrc721' AND receipt_log.topic4 IS NOT NULL)
            )
        ) list
        ORDER BY block_height ${{raw: order}}, index_in_block ${{raw: order}}, _id ${{raw: order}}
        LIMIT ${offset}, ${limit}
      ) list, transaction tx
      WHERE tx._id = list._id
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
