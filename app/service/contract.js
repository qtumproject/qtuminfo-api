const {Service} = require('egg')

class ContractService extends Service {
  async getContractAddresses(list) {
    const {Address} = this.app.qtuminfo.lib
    const chain = this.app.chain
    const {Contract} = this.ctx.model

    let result = []
    for (let item of list) {
      let rawAddress
      try {
        rawAddress = Address.fromString(item, chain)
      } catch (err) {
        this.ctx.throw(400)
      }
      let filter
      if (rawAddress.type === Address.CONTRACT) {
        filter = {address: Buffer.from(item, 'hex')}
      } else if (rawAddress.type === Address.EVM_CONTRACT) {
        filter = {addressString: item}
      } else {
        this.ctx.throw(400)
      }
      let contractResult = await Contract.findOne({
        where: filter,
        attributes: ['address', 'addressString', 'vm', 'type'],
        transaction: this.ctx.state.transaction
      })
      this.ctx.assert(contractResult, 404)
      result.push(contractResult.address)
    }
    return result
  }

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

  async searchLogs({fromBlock, toBlock, contract, topic1, topic2, topic3, topic4} = {}) {
    const db = this.ctx.model
    const {Header, Transaction, Receipt, ReceiptLog, Contract} = db
    const {in: $in, gte: $gte, lte: $lte, between: $between} = this.ctx.app.Sequelize.Op
    const {sql} = this.ctx.helper
    let {limit, offset} = this.ctx.state.pagination
    let idFilter = {}
    if (fromBlock != null && toBlock != null) {
      let idResult = await db.query(sql`
        SELECT MIN(_id) AS min, MAX(_id) AS max FROM receipt
        WHERE block_height BETWEEN ${fromBlock} AND ${toBlock}
      `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
      if (idResult.length === 0) {
        return {totalCount: 0, logs: []}
      }
      idFilter.receiptId = {[$between]: [idResult[0].min, idResult[0].max]}
    } else if (fromBlock != null) {
      let idResult = await db.query(sql`
        SELECT MIN(_id) AS min FROM receipt
        WHERE block_height >= ${fromBlock}
      `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
      if (idResult.length === 0) {
        return {totalCount: 0, logs: []}
      }
      idFilter.receiptId = {[$gte]: [idResult[0].min]}
    } else if (toBlock != null) {
      let idResult = await db.query(sql`
        SELECT MAX(_id) AS max FROM receipt
        WHERE block_height <= ${toBlock}
      `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
      if (idResult.length === 0) {
        return {totalCount: 0, logs: []}
      }
      idFilter.receiptId = {[$lte]: [idResult[0].max]}
    }

    await Receipt.findAll({
      attributes: ['_id'],
      limit: 10
    })

    let totalCount = await ReceiptLog.count({
      where: {
        ...idFilter,
        ...contract ? {address: contract} : {},
        ...topic1 ? {topic1} : {},
        ...topic2 ? {topic2} : {},
        ...topic3 ? {topic3} : {},
        ...topic4 ? {topic4} : {}
      },
      transaction: this.ctx.state.transaction
    })
    let ids = await ReceiptLog.findAll({
      where: {
        ...idFilter,
        ...contract ? {address: contract} : {},
        ...topic1 ? {topic1} : {},
        ...topic2 ? {topic2} : {},
        ...topic3 ? {topic3} : {},
        ...topic4 ? {topic4} : {}
      },
      attributes: ['_id'],
      order: [['receiptId', 'ASC'], ['logIndex', 'ASC']],
      limit,
      offset,
      transaction: this.ctx.state.transaction
    })
    let logs = await ReceiptLog.findAll({
      where: {_id: {[$in]: ids.map(item => item._id)}},
      attributes: ['topic1', 'topic2', 'topic3', 'topic4', 'data'],
      include: [
        {
          model: Receipt,
          as: 'receipt',
          required: true,
          attributes: ['transactionId', 'blockHeight'],
          include: [
            {
              model: Transaction,
              as: 'transaction',
              required: true,
              attributes: ['id'],
              include: [{
                model: Header,
                as: 'header',
                required: true,
                attributes: ['hash', 'height', 'timestamp']
              }]
            },
            {
              model: Contract,
              as: 'contract',
              required: true,
              attributes: ['address', 'addressString']
            }
          ]
        },
        {
          model: Contract,
          as: 'contract',
          required: true,
          attributes: ['address', 'addressString']
        }
      ],
      order: [['_id', 'ASC']],
      transaction: this.ctx.state.transaction
    })

    return {
      totalCount,
      logs: logs.map(log => ({
        blockHash: log.receipt.transaction.header.hash,
        blockHeight: log.receipt.transaction.header.height,
        timestamp: log.receipt.transaction.header.timestamp,
        transactionId: log.receipt.transaction.id,
        contractAddress: log.receipt.contract.addressString,
        contractAddressHex: log.receipt.contract.address,
        address: log.contract.addressString,
        addressHex: log.contract.address,
        topic1: log.topic1,
        topic2: log.topic2,
        topic3: log.topic3,
        topic4: log.topic4,
        data: log.data
      }))
    }
  }

  async transformHexAddresses(addresses) {
    if (addresses.length === 0) {
      return []
    }
    const {Contract} = this.ctx.model
    const {in: $in} = this.app.Sequelize.Op
    const {Address} = this.app.qtuminfo.lib
    let result = addresses.map(address => Buffer.compare(address, Buffer.alloc(20)) === 0 ? null : address)

    let contracts = await Contract.findAll({
      where: {address: {[$in]: addresses.filter(address => Buffer.compare(address, Buffer.alloc(20)) !== 0)}},
      attributes: ['address', 'addressString'],
      transaction: this.ctx.state.transaction
    })
    let mapping = new Map(contracts.map(({address, addressString}) => [address.toString('hex'), addressString]))
    for (let i = 0; i < result.length; ++i) {
      if (result[i]) {
        let string = mapping.get(result[i].toString('hex'))
        if (string) {
          result[i] = {string, hex: result[i]}
        } else {
          result[i] = new Address({
            type: Address.PAY_TO_PUBLIC_KEY_HASH,
            data: result[i],
            chain: this.app.chain
          }).toString()
        }
      }
    }
    return result
  }
}

module.exports = ContractService
