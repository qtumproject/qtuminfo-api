const {Service} = require('egg')

class AddressService extends Service {
  async getAddressSummary(addressIds, p2pkhAddressIds, rawAddresses) {
    const {Address} = this.ctx.app.qtuminfo.lib
    const {Block} = this.ctx.model
    const {balance: balanceService, qrc20: qrc20Service, qrc721: qrc721Service} = this.ctx.service
    const {in: $in, gt: $gt} = this.app.Sequelize.Op
    let hexAddresses = rawAddresses.filter(address => address.type === Address.PAY_TO_PUBLIC_KEY_HASH).map(address => address.data)
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
      Block.count({where: {minerId: {[$in]: p2pkhAddressIds}, height: {[$gt]: 0}}, transaction: this.ctx.state.transaction}),
      this.getAddressTransactionCount(addressIds, rawAddresses),
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

  async getAddressTransactionCount(addressIds, rawAddresses) {
    const {Address: RawAddress, Solidity} = this.app.qtuminfo.lib
    const TransferABI = Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    const {Address} = db
    const {sql} = this.ctx.helper
    let topics = rawAddresses
      .filter(address => address.type === RawAddress.PAY_TO_PUBLIC_KEY_HASH)
      .map(address => Buffer.concat([Buffer.alloc(12), address.data]))
    let [{count}] = await db.query(sql`
      SELECT COUNT(*) AS count FROM (
        SELECT transaction_id FROM balance_change
        WHERE address_id IN ${addressIds} AND ${this.ctx.service.block.getRawBlockFilter()}
        UNION
        SELECT transaction_id FROM evm_receipt
        WHERE (sender_type, sender_data) IN ${rawAddresses.map(address => [Address.parseType(address.type), address.data])}
          AND ${this.ctx.service.block.getRawBlockFilter()}
        UNION
        SELECT receipt.transaction_id AS transaction_id FROM evm_receipt receipt, evm_receipt_log log, contract
        WHERE receipt._id = log.receipt_id
          AND ${this.ctx.service.block.getRawBlockFilter('receipt.block_height')}
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

  async getAddressTransactions(addressIds, rawAddresses) {
    const {Address: RawAddress, Solidity} = this.app.qtuminfo.lib
    const TransferABI = Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    const {Address} = db
    const {sql} = this.ctx.helper
    let {limit, offset, reversed = true} = this.ctx.state.pagination
    let order = reversed ? 'DESC' : 'ASC'
    let topics = rawAddresses
      .filter(address => address.type === RawAddress.PAY_TO_PUBLIC_KEY_HASH)
      .map(address => Buffer.concat([Buffer.alloc(12), address.data]))
    let totalCount = await this.getAddressTransactionCount(addressIds, rawAddresses)
    let transactions = (await db.query(sql`
      SELECT tx.id AS id FROM (
        SELECT _id FROM (
          SELECT block_height, index_in_block, transaction_id AS _id FROM balance_change
          WHERE address_id IN ${addressIds} AND ${this.ctx.service.block.getRawBlockFilter()}
          UNION
          SELECT block_height, index_in_block, transaction_id AS _id
          FROM evm_receipt
          WHERE (sender_type, sender_data) IN ${rawAddresses.map(address => [Address.parseType(address.type), address.data])}
            AND ${this.ctx.service.block.getRawBlockFilter()}
          UNION
          SELECT receipt.block_height AS block_height, receipt.index_in_block AS index_in_block, receipt.transaction_id AS _id
          FROM evm_receipt receipt, evm_receipt_log log, contract
          WHERE receipt._id = log.receipt_id
            AND ${this.ctx.service.block.getRawBlockFilter('receipt.block_height')}
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

  async getAddressBasicTransactionCount(addressIds) {
    const {BalanceChange} = this.ctx.model
    const {in: $in} = this.app.Sequelize.Op
    return await BalanceChange.count({
      where: {
        ...this.ctx.service.block.getBlockFilter(),
        addressId: {[$in]: addressIds}
      },
      distinct: true,
      col: 'transactionId',
      transaction: this.ctx.transaction
    })
  }

  async getAddressBasicTransactions(addressIds) {
    const db = this.ctx.model
    const {sql} = this.ctx.helper
    let {limit, offset, reversed = true} = this.ctx.state.pagination
    let order = reversed ? 'DESC' : 'ASC'
    let totalCount = await this.getAddressBasicTransactionCount(addressIds)
    let transactionIds = []
    if (addressIds.length === 1) {
      transactionIds = (await db.query(sql`
        SELECT transaction_id AS _id
        FROM balance_change
        WHERE address_id = ${addressIds[0]} AND ${this.ctx.service.block.getRawBlockFilter()}
        ORDER BY block_height ${{raw: order}}, index_in_block ${{raw: order}}, transaction_id ${{raw: order}}
        LIMIT ${offset}, ${limit}
      `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})).map(({_id}) => _id)
    } else {
      transactionIds = (await db.query(sql`
        SELECT _id FROM (
          SELECT MIN(block_height) AS block_height, MIN(index_in_block) AS index_in_block, transaction_id AS _id
          FROM balance_change
          WHERE address_id IN ${addressIds} AND ${this.ctx.service.block.getRawBlockFilter()}
          GROUP BY _id
        ) list
        ORDER BY block_height ${{raw: order}}, index_in_block ${{raw: order}}, _id ${{raw: order}}
        LIMIT ${offset}, ${limit}
      `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})).map(({_id}) => _id)
    }

    let transactions = await Promise.all(transactionIds.map(async transactionId => {
      let transaction = await this.ctx.service.transaction.getBasicTransaction(transactionId)
      let amount = [
        ...transaction.outputs.filter(output => addressIds.includes(output.addressId)).map(output => output.value),
        ...transaction.inputs.filter(input => addressIds.includes(input.addressId)).map(input => -input.value)
      ].reduce((x, y) => x + y, 0n)
      return Object.assign(transaction, {
        confirmations: transaction.blockHeight == null ? 0 : this.app.blockchainInfo.tip.height - transaction.blockHeight + 1,
        amount
      })
    }))
    return {totalCount, transactions}
  }

  async getAddressContractTransactionCount(rawAddresses, contract) {
    const db = this.ctx.model
    const {Address} = db
    const {sql} = this.ctx.helper
    let contractFilter = 'TRUE'
    if (contract) {
      contractFilter = sql`contract_address = ${contract.contractAddress}`
    }
    let [{count}] = await db.query(sql`
      SELECT COUNT(DISTINCT(_id)) AS count FROM evm_receipt
      WHERE (sender_type, sender_data) IN ${rawAddresses.map(address => [Address.parseType(address.type), address.data])}
        AND ${this.ctx.service.block.getRawBlockFilter()} AND ${{raw: contractFilter}}
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    return count
  }

  async getAddressContractTransactions(rawAddresses, contract) {
    const db = this.ctx.model
    const {Address} = db
    const {sql} = this.ctx.helper
    let {limit, offset, reversed = true} = this.ctx.state.pagination
    let order = reversed ? 'DESC' : 'ASC'
    let contractFilter = 'TRUE'
    if (contract) {
      contractFilter = sql`contract_address = ${contract.contractAddress}`
    }
    let totalCount = await this.getAddressContractTransactionCount(rawAddresses, contract)
    let receiptIds = (await db.query(sql`
      SELECT _id FROM evm_receipt
      WHERE (sender_type, sender_data) IN ${rawAddresses.map(address => [Address.parseType(address.type), address.data])}
        AND ${this.ctx.service.block.getRawBlockFilter()} AND ${{raw: contractFilter}}
      ORDER BY block_height ${{raw: order}}, index_in_block ${{raw: order}}, transaction_id ${{raw: order}}, output_index ${{raw: order}}
      LIMIT ${offset}, ${limit}
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})).map(({_id}) => _id)
    let transactions = await Promise.all(receiptIds.map(async receiptId => {
      let transaction = await this.ctx.service.transaction.getContractTransaction(receiptId)
      return Object.assign(transaction, {
        confirmations: transaction.blockHeight == null ? 0 : this.app.blockchainInfo.tip.height - transaction.blockHeight + 1
      })
    }))
    return {totalCount, transactions}
  }

  async getAddressQRC20TokenTransactionCount(rawAddresses, token) {
    const {Address, Solidity} = this.app.qtuminfo.lib
    const TransferABI = Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const {EvmReceiptLog: EVMReceiptLog} = this.ctx.model
    const {or: $or, in: $in} = this.app.Sequelize.Op
    let topicAddresses = rawAddresses
      .filter(address => address.type === Address.PAY_TO_PUBLIC_KEY_HASH)
      .map(address => Buffer.concat([Buffer.alloc(12), address.data]))
    return await EVMReceiptLog.count({
      where: {
        address: token.contractAddress,
        topic1: TransferABI.id,
        [$or]: [
          {topic2: {[$in]: topicAddresses}},
          {topic3: {[$in]: topicAddresses}}
        ]
      },
      transaction: this.ctx.state.transaction
    })
  }

  async getAddressQRC20TokenTransactions(rawAddresses, token) {
    const {Address, Solidity} = this.app.qtuminfo.lib
    const TransferABI = Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    const {sql} = this.ctx.helper
    let {limit, offset, reversed = true} = this.ctx.state.pagination
    let order = reversed ? 'DESC' : 'ASC'
    let topicAddresses = rawAddresses
      .filter(address => address.type === Address.PAY_TO_PUBLIC_KEY_HASH)
      .map(address => Buffer.concat([Buffer.alloc(12), address.data]))
    let totalCount = await this.getAddressQRC20TokenTransactionCount(rawAddresses, token)
    let transactions = await db.query(sql`
      SELECT
        transaction.id AS transactionId,
        receipt.output_index AS outputIndex,
        header.height AS blockHeight,
        header.hash AS blockHash,
        header.timestamp AS timestamp,
        log.topic2 AS topic2,
        log.topic3 AS topic3,
        log.data AS data
      FROM (
        SELECT _id FROM evm_receipt_log
        WHERE address = ${token.contractAddress} AND topic1 = ${TransferABI.id}
          AND ((topic2 IN ${topicAddresses}) OR (topic3 IN ${topicAddresses}))
        ORDER BY _id ${{raw: order}}
        LIMIT ${offset}, ${limit}
      ) list
      INNER JOIN evm_receipt_log log USING (_id)
      INNER JOIN evm_receipt receipt ON receipt._id = log.receipt_id
      INNER JOIN header ON header.height = receipt.block_height
      INNER JOIN transaction ON transaction._id = receipt.transaction_id
      INNER JOIN qrc20 ON qrc20.contract_address = log.address
      ORDER BY list._id ${{raw: order}}
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})

    let addresses = await this.ctx.service.contract.transformHexAddresses(
      transactions.map(transaction => [transaction.topic2.slice(12), transaction.topic3.slice(12)]).flat()
    )
    return {
      totalCount,
      transactions: transactions.map((transaction, index) => {
        let from = addresses[index * 2]
        let to = addresses[index * 2 + 1]
        let fromAddress = rawAddresses.find(address => Buffer.compare(address.data, transaction.topic2.slice(12)) === 0)
        if (fromAddress) {
          from = fromAddress.toString()
        }
        let toAddress = rawAddresses.find(address => Buffer.compare(address.data, transaction.topic3.slice(12)) === 0)
        if (toAddress) {
          to = toAddress.toString()
        }
        let value = BigInt(`0x${transaction.data.toString('hex')}`)
        return {
          transactionId: transaction.transactionId,
          outputIndex: transaction.outputIndex,
          blockHeight: transaction.blockHeight,
          blockHash: transaction.blockHash,
          timestamp: transaction.timestamp,
          confirmations: this.app.blockchainInfo.tip.height - transaction.blockHeight + 1,
          ...from && typeof from === 'object' ? {from: from.string, fromHex: from.hex} : {from},
          ...to && typeof to === 'object' ? {to: to.string, toHex: to.hex} : {to},
          value,
          amount: BigInt(Boolean(toAddress) - Boolean(fromAddress)) * value
        }
      })
    }
  }

  async getAddressQRC20TokenMempoolTransactions(rawAddresses, token) {
    const {Address: RawAddress, OutputScript, Solidity} = this.app.qtuminfo.lib
    const transferABI = Solidity.qrc20ABIs.find(abi => abi.name === 'transfer')
    const {Address, Transaction, TransactionOutput, Contract, EvmReceipt: EVMReceipt, where, col} = this.ctx.model
    let hexAddresses = rawAddresses
      .filter(address => address.type === RawAddress.PAY_TO_PUBLIC_KEY_HASH)
      .map(address => address.data)
    let transactions = await EVMReceipt.findAll({
      where: {blockHeight: 0xffffffff},
      attributes: ['outputIndex', 'senderData'],
      include: [
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
          attributes: ['scriptPubKey'],
          include: [{
            model: Address,
            as: 'address',
            required: true,
            attributes: [],
            include: [{
              model: Contract,
              as: 'contract',
              required: true,
              where: {address: token.contractAddress, type: 'qrc20'},
              attributes: []
            }]
          }]
        },
      ],
      transaction: this.ctx.state.transaction
    })

    transactions = transactions.filter(transaction => {
      let scriptPubKey = OutputScript.fromBuffer(transaction.output.scriptPubKey)
      if (![OutputScript.EVM_CONTRACT_CALL, OutputScript.EVM_CONTRACT_CALL_SENDER].includes(scriptPubKey.type)) {
        return false
      }
      let byteCode = scriptPubKey.byteCode
      if (byteCode.length !== 68
        || Buffer.compare(byteCode.slice(0, 4), transferABI.id) !== 0
        || Buffer.compare(byteCode.slice(4, 16), Buffer.alloc(12)) !== 0
      ) {
        console.log(byteCode.length, byteCode.slice(4, 16).toString('hex'))
        return false
      }
      let from = transaction.senderData
      let to = byteCode.slice(16, 36)
      let isFrom = hexAddresses.some(address => Buffer.compare(address, from) === 0)
      let isTo = hexAddresses.some(address => Buffer.compare(address, to) === 0)
      return isFrom || isTo
    })
    return await Promise.all(transactions.map(async transaction => {
      let scriptPubKey = OutputScript.fromBuffer(transaction.output.scriptPubKey)
      let byteCode = scriptPubKey.byteCode
      let from = transaction.senderData
      let to = byteCode.slice(16, 36)
      let value = BigInt(`0x${byteCode.slice(36).toString('hex')}`)
      let isFrom = hexAddresses.some(address => Buffer.compare(address, from) === 0)
      let isTo = hexAddresses.some(address => Buffer.compare(address, to) === 0)
      let addresses = await this.ctx.service.contract.transformHexAddresses([from, to])
      return {
        transactionId: transaction.transaction.id,
        outputIndex: transaction.outputIndex,
        ...from && typeof addresses[0] === 'object' ? {from: addresses[0].string, fromHex: addresses[0].hex} : {from: addresses[0]},
        ...to && typeof addresses[1] === 'object' ? {to: addresses[1].string, toHex: addresses[1].hex} : {to: addresses[1]},
        value,
        amount: BigInt(isTo - isFrom) * value
      }
    }))
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
