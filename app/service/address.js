const {Service} = require('egg')

class AddressService extends Service {
  async getAddressSummary(addressIds, p2pkhAddressIds, hexAddresses) {
    const {Block} = this.ctx.model
    const {balance: balanceService, qrc20: qrc20Service, qrc721: qrc721Service} = this.ctx.service
    const {in: $in, gt: $gt} = this.app.Sequelize.Op
    let [
      {totalReceived, totalSent},
      unconfirmed,
      staking,
      mature,
      qrc20Balances,
      qrc721Balances,
      ranking,
      blocksMined,
      transactionCount
    ] = await Promise.all([
      balanceService.getTotalBalanceChanges(addressIds),
      balanceService.getUnconfirmedBalance(addressIds),
      balanceService.getStakingBalance(addressIds),
      balanceService.getMatureBalance(p2pkhAddressIds),
      qrc20Service.getAllQRC20Balances(hexAddresses),
      qrc721Service.getAllQRC721Balances(hexAddresses),
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
      qrc721Balances,
      ranking,
      transactionCount,
      blocksMined
    }
  }

  async getAddressTransactionCount(addressIds, hexAddresses) {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    const {Address} = db
    const {sql} = this.ctx.helper
    let topics = hexAddresses.map(address => Buffer.concat([Buffer.alloc(12), address]))
    let [{count}] = await db.query(sql`
      SELECT COUNT(*) AS count FROM (
        SELECT transaction_id FROM balance_change WHERE address_id IN ${addressIds}
        UNION
        SELECT transaction_id FROM evm_receipt
        WHERE sender_type = ${Address.parseType('pubkeyhash')} AND sender_data IN ${hexAddresses}
        UNION
        SELECT receipt.transaction_id AS transaction_id FROM evm_receipt receipt, evm_receipt_log log, contract
        WHERE receipt._id = log.receipt_id
          AND contract.address = log.address AND contract.type IN ('qrc20', 'qrc721')
          AND log.topic1 = ${TransferABI.id}
          AND (log.topic2 IN ${topics} OR log.topic3 IN ${topics})
          AND (
            (contract.type = 'qrc20' AND log.topic3 IS NOT NULL AND log.topic4 IS NULL)
            OR (contract.type = 'qrc721' AND log.topic4 IS NOT NULL)
          )
      ) list
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    return count
  }

  async getAddressTransactions(addressIds, hexAddresses) {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    const {Address} = db
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
          SELECT block_height, index_in_block, transaction_id AS _id
          FROM evm_receipt
          WHERE sender_type = ${Address.parseType('pubkeyhash')} AND sender_data IN ${hexAddresses}
          UNION
          SELECT receipt.block_height AS block_height, receipt.index_in_block AS index_in_block, receipt.transaction_id AS _id
          FROM evm_receipt receipt, evm_receipt_log log, contract
          WHERE receipt._id = log.receipt_id
            AND contract.address = log.address AND contract.type IN ('qrc20', 'qrc721')
            AND log.topic1 = ${TransferABI.id}
            AND (log.topic2 IN ${topics} OR log.topic3 IN ${topics})
            AND (
              (contract.type = 'qrc20' AND log.topic3 IS NOT NULL AND log.topic4 IS NULL)
              OR (contract.type = 'qrc721' AND log.topic4 IS NOT NULL)
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
    const {Address, Transaction, TransactionOutput} = this.ctx.model
    const {in: $in, gt: $gt} = this.app.Sequelize.Op
    const blockHeight = this.app.blockchainInfo.tip.height
    let utxos = await TransactionOutput.findAll({
      where: {
        addressId: {[$in]: ids},
        blockHeight: {[$gt]: 0},
        inputHeight: null
      },
      attributes: ['transactionId', 'outputIndex', 'blockHeight', 'scriptPubKey', 'value', 'isStake'],
      include: [
        {
          model: Transaction,
          as: 'outputTransaction',
          required: true,
          attributes: ['id']
        },
        {
          model: Address,
          as: 'address',
          required: true,
          attributes: ['string']
        }
      ],
      transaction: this.ctx.state.transaction
    })
    return utxos.map(utxo => ({
      transactionId: utxo.outputTransaction.id,
      outputIndex: utxo.outputIndex,
      scriptPubKey: utxo.scriptPubKey,
      address: utxo.address.string,
      value: utxo.value,
      isStake: utxo.isStake,
      blockHeight: utxo.blockHeight,
      confirmations: utxo.blockHeight === 0xffffffff ? 0 : blockHeight - utxo.blockHeight + 1
    }))
  }
}

module.exports = AddressService
