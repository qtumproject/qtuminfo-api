const {Service} = require('egg')

class ContractService extends Service {
  async getContractSummary(contractAddress, addressIds) {
    const {Address, Contract, Qrc20: QRC20, Qrc20Balance: QRC20Balance, Qrc721: QRC721} = this.ctx.model
    const {balance: balanceService, qrc20: qrc20Service} = this.ctx.service
    const {ne: $ne} = this.app.Sequelize.Op
    let contract = await Contract.findOne({
      where: {address: contractAddress},
      attributes: ['addressString', 'vm', 'type', 'createTxId', 'createHeight'],
      include: [
        {
          model: QRC20,
          as: 'qrc20',
          required: false,
          attributes: ['name', 'symbol', 'decimals', 'totalSupply', 'version']
        },
        {
          model: QRC721,
          as: 'qrc721',
          required: false,
          attributes: ['name', 'symbol', 'totalSupply']
        },
        {
          model: Address,
          as: 'owner',
          required: false,
          attributes: ['string']
        }
      ],
      transaction: this.ctx.state.transaction
    })
    if (contract.type === 'qrc20') {
      contract.qrc20.holders = await QRC20Balance.count({
        where: {
          contractAddress,
          address: {[$ne]: Buffer.alloc(20)},
          balance: {[$ne]: Buffer.alloc(32)}
        },
        transaction: this.ctx.state.transaction
      })
    }
    let [
      {totalReceived, totalSent},
      unconfirmed,
      qrc20Balances,
      transactionCount
    ] = await Promise.all([
      balanceService.getTotalBalanceChanges(addressIds),
      balanceService.getUnconfirmedBalance(addressIds),
      qrc20Service.getAllQRC20Balances([contractAddress]),
      this.getContractTransactionCount(contractAddress, addressIds)
    ])
    return {
      address: contract.addressString,
      addressHex: contractAddress,
      vm: contract.vm,
      type: contract.type,
      owner: contract.owner && contract.owner.string,
      createTxId: contract.createTxId,
      createHeight: contract.createHeight,
      ...contract.type === 'qrc20' ? {
        qrc20: {
          name: contract.qrc20.name,
          symbol: contract.qrc20.symbol,
          decimals: contract.qrc20.decimals,
          totalSupply: contract.qrc20.totalSupply,
          version: contract.qrc20.version,
          holders: contract.qrc20.holders
        }
      } : {},
      ...contract.type === 'qrc721' ? {
        qrc721: {
          name: contract.qrc721.name,
          symbol: contract.qrc721.symbol,
          totalSupply: contract.qrc721.totalSupply
        }
      } : {},
      balance: totalReceived - totalSent,
      totalReceived,
      totalSent,
      unconfirmed,
      qrc20Balances,
      transactionCount
    }
  }

  async getContractTransactionCount(contractAddress, addressIds) {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    let {sql} = this.ctx.helper
    let topic = Buffer.concat([Buffer.alloc(12), contractAddress])
    let result = await db.query(sql`
      SELECT COUNT(*) AS count FROM (
        SELECT transaction_id FROM balance_change WHERE address_id IN ${addressIds}
        UNION
        SELECT transaction_id FROM receipt WHERE contract_address = ${contractAddress}
        UNION
        SELECT receipt.transaction_id AS transaction_id FROM receipt, receipt_log
        WHERE receipt_log.receipt_id = receipt._id AND receipt_log.address = ${contractAddress}
        UNION
        SELECT receipt.transaction_id AS transaction_id FROM receipt, receipt_log, contract
        WHERE receipt_log.receipt_id = receipt._id
          AND contract.address = receipt_log.address AND contract.type IN ('qrc20', 'qrc721')
          AND receipt_log.topic1 = ${TransferABI.id}
          AND (receipt_log.topic2 = ${topic} OR receipt_log.topic3 = ${topic})
          AND (
            (contract.type = 'qrc20' AND receipt_log.topic3 IS NOT NULL AND receipt_log.topic4 IS NULL)
            OR (contract.type = 'qrc721' AND receipt_log.topic4 IS NOT NULL)
          )
      ) list
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    return result[0].count || 0
  }

  async getContractTransactions(contractAddress, addressIds) {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    let {sql} = this.ctx.helper
    let {limit, offset, reversed = true} = this.ctx.state.pagination
    let order = reversed ? 'DESC' : 'ASC'
    let topic = Buffer.concat([Buffer.alloc(12), contractAddress])
    let totalCount = await this.getContractTransactionCount(contractAddress, addressIds)
    let transactions = await db.query(sql`
      SELECT tx.id AS id FROM (
        SELECT _id FROM (
          SELECT block_height, index_in_block, transaction_id AS _id FROM balance_change WHERE address_id IN ${addressIds}
          UNION
          SELECT block_height, index_in_block, transaction_id AS _id FROM receipt WHERE contract_address = ${contractAddress}
          UNION
          SELECT receipt.block_height AS block_height, receipt.index_in_block AS index_in_block, receipt.transaction_id AS _id
          FROM receipt, receipt_log
          WHERE receipt_log.receipt_id = receipt._id AND receipt_log.address = ${contractAddress}
          UNION
          SELECT receipt.block_height AS block_height, receipt.index_in_block AS index_in_block, receipt.transaction_id AS _id
          FROM receipt, receipt_log, contract
          WHERE receipt_log.receipt_id = receipt._id
            AND contract.address = receipt_log.address AND contract.type IN ('qrc20', 'qrc721')
            AND receipt_log.topic1 = ${TransferABI.id}
            AND (receipt_log.topic2 = ${topic} OR receipt_log.topic3 = ${topic})
            AND (
              (contract.type = 'qrc20' AND receipt_log.topic3 IS NOT NULL AND receipt_log.topic4 IS NULL)
              OR (contract.type = 'qrc721' AND receipt_log.topic4 IS NOT NULL)
            )
        ) list
        ORDER BY block_height ${{raw: order}}, index_in_block ${{raw: order}}, _id ${{raw: order}}
        LIMIT ${offset}, ${limit}
      ) list, transaction tx
      WHERE tx._id = list._id
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction}).map(({id}) => id)
    return {totalCount, transactions}
  }

  async transformHexAddress(address) {
    if (Buffer.compare(address, Buffer.alloc(20)) === 0) {
      return null
    }
    const {Contract} = this.ctx.model
    const {Address} = this.app.qtuminfo.lib
    let contract = await Contract.findOne({
      where: {address},
      attributes: ['addressString'],
      transaction: this.ctx.state.transaction
    })
    if (contract) {
      return {string: contract.addressString, hex: address.toString('hex')}
    } else {
      return new Address({
        type: Address.PAY_TO_PUBLIC_KEY_HASH,
        data: address,
        chain: this.app.chain
      }).toString()
    }
  }
}

module.exports = ContractService
