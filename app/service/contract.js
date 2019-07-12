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
    const {Contract, Qrc20: QRC20, Qrc20Statistics: QRC20Statistics, Qrc721: QRC721} = this.ctx.model
    const {balance: balanceService, qrc20: qrc20Service, qrc721: qrc721Service} = this.ctx.service
    let contract = await Contract.findOne({
      where: {address: contractAddress},
      attributes: ['addressString', 'vm', 'type'],
      include: [
        {
          model: QRC20,
          as: 'qrc20',
          required: false,
          attributes: ['name', 'symbol', 'decimals', 'totalSupply', 'version'],
          include: [{
            model: QRC20Statistics,
            as: 'statistics',
            required: true
          }]
        },
        {
          model: QRC721,
          as: 'qrc721',
          required: false,
          attributes: ['name', 'symbol', 'totalSupply']
        }
      ],
      transaction: this.ctx.state.transaction
    })
    let [
      {totalReceived, totalSent},
      unconfirmed,
      qrc20Balances,
      qrc721Balances,
      transactionCount
    ] = await Promise.all([
      balanceService.getTotalBalanceChanges(addressIds),
      balanceService.getUnconfirmedBalance(addressIds),
      qrc20Service.getAllQRC20Balances([contractAddress]),
      qrc721Service.getAllQRC721Balances([contractAddress]),
      this.getContractTransactionCount(contractAddress, addressIds)
    ])
    return {
      address: contract.addressString,
      addressHex: contractAddress,
      vm: contract.vm,
      type: contract.type,
      ...contract.type === 'qrc20' ? {
        qrc20: {
          name: contract.qrc20.name,
          symbol: contract.qrc20.symbol,
          decimals: contract.qrc20.decimals,
          totalSupply: contract.qrc20.totalSupply,
          version: contract.qrc20.version,
          holders: contract.qrc20.statistics.holders,
          transactions: contract.qrc20.statistics.transactions
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
      qrc721Balances,
      transactionCount
    }
  }

  async getContractTransactionCount(contractAddress, addressIds) {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    let {sql} = this.ctx.helper
    let topic = Buffer.concat([Buffer.alloc(12), contractAddress])
    let [{count}] = await db.query(sql`
      SELECT COUNT(*) AS count FROM (
        SELECT transaction_id FROM balance_change
        WHERE address_id IN ${addressIds} AND ${this.ctx.service.block.getRawBlockFilter()}
        UNION
        SELECT transaction_id FROM evm_receipt
        WHERE contract_address = ${contractAddress} AND ${this.ctx.service.block.getRawBlockFilter()}
        UNION
        SELECT receipt.transaction_id AS transaction_id FROM evm_receipt receipt, evm_receipt_log log
        WHERE log.receipt_id = receipt._id AND log.address = ${contractAddress}
          AND ${this.ctx.service.block.getRawBlockFilter('receipt.block_height')}
        UNION
        SELECT receipt.transaction_id AS transaction_id FROM evm_receipt receipt, evm_receipt_log log, contract
        WHERE log.receipt_id = receipt._id
          AND ${this.ctx.service.block.getRawBlockFilter('receipt.block_height')}
          AND contract.address = log.address AND contract.type IN ('qrc20', 'qrc721')
          AND log.topic1 = ${TransferABI.id}
          AND (log.topic2 = ${topic} OR log.topic3 = ${topic})
          AND (
            (contract.type = 'qrc20' AND log.topic3 IS NOT NULL AND log.topic4 IS NULL)
            OR (contract.type = 'qrc721' AND log.topic4 IS NOT NULL)
          )
      ) list
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    return count
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
          SELECT block_height, index_in_block, transaction_id AS _id FROM balance_change
          WHERE address_id IN ${addressIds} AND ${this.ctx.service.block.getRawBlockFilter()}
          UNION
          SELECT block_height, index_in_block, transaction_id AS _id FROM evm_receipt
          WHERE contract_address = ${contractAddress} AND ${this.ctx.service.block.getRawBlockFilter()}
          UNION
          SELECT receipt.block_height AS block_height, receipt.index_in_block AS index_in_block, receipt.transaction_id AS _id
          FROM evm_receipt receipt, evm_receipt_log log
          WHERE log.receipt_id = receipt._id AND log.address = ${contractAddress}
            AND ${this.ctx.service.block.getRawBlockFilter('receipt.block_height')}
          UNION
          SELECT receipt.block_height AS block_height, receipt.index_in_block AS index_in_block, receipt.transaction_id AS _id
          FROM evm_receipt receipt, evm_receipt_log log, contract
          WHERE log.receipt_id = receipt._id
            AND ${this.ctx.service.block.getRawBlockFilter('receipt.block_height')}
            AND contract.address = log.address AND contract.type IN ('qrc20', 'qrc721')
            AND log.topic1 = ${TransferABI.id}
            AND (log.topic2 = ${topic} OR log.topic3 = ${topic})
            AND (
              (contract.type = 'qrc20' AND log.topic3 IS NOT NULL AND log.topic4 IS NULL)
              OR (contract.type = 'qrc721' AND log.topic4 IS NOT NULL)
            )
        ) list
        ORDER BY block_height ${{raw: order}}, index_in_block ${{raw: order}}, _id ${{raw: order}}
        LIMIT ${offset}, ${limit}
      ) list, transaction tx
      WHERE tx._id = list._id
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction}).map(({id}) => id)
    return {totalCount, transactions}
  }

  async getContractBasicTransactionCount(contractAddress) {
    const {EvmReceipt: EVMReceipt} = this.ctx.model
    return await EVMReceipt.count({
      where: {
        contractAddress,
        ...this.ctx.service.block.getBlockFilter()
      },
      transaction: this.ctx.state.transaction
    })
  }

  async getContractBasicTransactions(contractAddress) {
    const {Address, OutputScript} = this.app.qtuminfo.lib
    const {
      Header, Transaction, TransactionOutput, Contract, EvmReceipt: EVMReceipt, EvmReceiptLog: EVMReceiptLog,
      where, col
    } = this.ctx.model
    const {in: $in} = this.app.Sequelize.Op
    let {limit, offset, reversed = true} = this.ctx.state.pagination
    let order = reversed ? 'DESC' : 'ASC'
    let totalCount = await this.getContractBasicTransactionCount(contractAddress)
    let receiptIds = (await EVMReceipt.findAll({
      where: {
        contractAddress,
        ...this.ctx.service.block.getBlockFilter()
      },
      attributes: ['_id'],
      order: [['blockHeight', order], ['indexInBlock', order], ['transactionId', order], ['outputIndex', order]],
      limit,
      offset,
      transaction: this.ctx.state.transaction
    })).map(receipt => receipt._id)
    let receipts = await EVMReceipt.findAll({
      where: {_id: {[$in]: receiptIds}},
      include: [
        {
          model: Header,
          as: 'header',
          required: false,
          attributes: ['hash', 'timestamp']
        },
        {
          model: Transaction,
          as: 'transaction',
          required: true,
          attributes: ['id']
        },
        {
          model: TransactionOutput,
          as: 'output',
          on: {
            transactionId: where(col('output.transaction_id'), '=', col('evm_receipt.transaction_id')),
            outputIndex: where(col('output.output_index'), '=', col('evm_receipt.output_index'))
          },
          required: true,
          attributes: ['scriptPubKey', 'value']
        },
        {
          model: EVMReceiptLog,
          as: 'logs',
          required: false,
          include: [{
            model: Contract,
            as: 'contract',
            required: true,
            attributes: ['addressString']
          }]
        },
        {
          model: Contract,
          as: 'contract',
          required: true,
          attributes: ['addressString']
        }
      ],
      order: [['blockHeight', order], ['indexInBlock', order], ['transactionId', order], ['outputIndex', order]],
      transaction: this.ctx.state.transaction
    })
    let transactions = receipts.map(receipt => ({
      transactionId: receipt.transaction.id,
      outputIndex: receipt.outputIndex,
      ...receipt.header ? {
        blockHeight: receipt.blockHeight,
        blockHash: receipt.header.hash,
        timestamp: receipt.header.timestamp,
        confirmations: this.app.blockchainInfo.tip.height - receipt.blockHeight + 1
      } : {confirmations: 0},
      scriptPubKey: OutputScript.fromBuffer(receipt.output.scriptPubKey),
      value: receipt.output.value,
      sender: new Address({type: receipt.senderType, data: receipt.senderData, chain: this.app.chain}),
      gasUsed: receipt.gasUsed,
      contractAddress: receipt.contract.addressString,
      contractAddressHex: receipt.contractAddress,
      excepted: receipt.excepted,
      exceptedMessage: receipt.exceptedMessage,
      evmLogs: receipt.logs.sort((x, y) => x.logIndex - y.logIndex).map(log => ({
        address: log.contract.addressString,
        addressHex: log.address,
        topics: this.ctx.service.transaction.transformTopics(log),
        data: log.data
      }))
    }))
    return {totalCount, transactions}
  }

  async callContract(contract, data, sender) {
    let client = new this.app.qtuminfo.rpc(this.app.config.qtuminfo.rpc)
    return await client.callcontract(
      contract.toString('hex'),
      data.toString('hex'),
      ...sender == null ? [] : [sender.toString('hex')]
    )
  }

  async searchLogs({contract, topic1, topic2, topic3, topic4} = {}) {
    const {Address} = this.app.qtuminfo.lib
    const db = this.ctx.model
    const {Header, Transaction, EvmReceipt: EVMReceipt, EvmReceiptLog: EVMReceiptLog, Contract} = db
    const {in: $in} = this.ctx.app.Sequelize.Op
    const {sql} = this.ctx.helper
    let {limit, offset} = this.ctx.state.pagination

    let blockFilter = this.ctx.service.block.getRawBlockFilter('receipt.block_height')
    let contractFilter = contract ? sql`log.address = ${contract}` : 'TRUE'
    let topic1Filter = topic1 ? sql`log.topic1 = ${topic1}` : 'TRUE'
    let topic2Filter = topic2 ? sql`log.topic2 = ${topic2}` : 'TRUE'
    let topic3Filter = topic3 ? sql`log.topic3 = ${topic3}` : 'TRUE'
    let topic4Filter = topic4 ? sql`log.topic4 = ${topic4}` : 'TRUE'

    let [{count: totalCount}] = await db.query(sql`
      SELECT COUNT(DISTINCT(log._id)) AS count from evm_receipt receipt, evm_receipt_log log
      WHERE receipt._id = log.receipt_id AND ${blockFilter} AND ${{raw: contractFilter}}
        AND ${{raw: topic1Filter}} AND ${{raw: topic2Filter}} AND ${{raw: topic3Filter}} AND ${{raw: topic4Filter}}
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.transaction})
    if (totalCount === 0) {
      return {totalCount, logs: []}
    }

    let ids = (await db.query(sql`
      SELECT log._id AS _id from evm_receipt receipt, evm_receipt_log log
      WHERE receipt._id = log.receipt_id AND ${blockFilter} AND ${{raw: contractFilter}}
        AND ${{raw: topic1Filter}} AND ${{raw: topic2Filter}} AND ${{raw: topic3Filter}} AND ${{raw: topic4Filter}}
      ORDER BY log._id ASC
      LIMIT ${offset}, ${limit}
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.transaction})).map(log => log._id)

    let logs = await EVMReceiptLog.findAll({
      where: {_id: {[$in]: ids}},
      attributes: ['topic1', 'topic2', 'topic3', 'topic4', 'data'],
      include: [
        {
          model: EVMReceipt,
          as: 'receipt',
          required: true,
          attributes: ['transactionId', 'outputIndex', 'blockHeight', 'senderType', 'senderData'],
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
        transactionId: log.receipt.transaction.id,
        outputIndex: log.receipt.outputIndex,
        blockHeight: log.receipt.transaction.header.height,
        blockHash: log.receipt.transaction.header.hash,
        timestamp: log.receipt.transaction.header.timestamp,
        sender: new Address({type: log.receipt.senderType, data: log.receipt.senderData, chain: this.app.chain}),
        contractAddress: log.receipt.contract.addressString,
        contractAddressHex: log.receipt.contract.address,
        address: log.contract.addressString,
        addressHex: log.contract.address,
        topics: this.ctx.service.transaction.transformTopics(log),
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
