const {Service} = require('egg')

class QRC20Service extends Service {
  async listQRC20Tokens() {
    const db = this.ctx.model
    const {Qrc20Statistics: QRC20Statistics} = db
    const {sql} = this.ctx.helper
    const {gt: $gt} = this.app.Sequelize.Op
    let {limit, offset} = this.ctx.state.pagination

    let totalCount = await QRC20Statistics.count({
      where: {transactions: {[$gt]: 0}},
      transaction: this.ctx.state.transaction
    })
    let list = await db.query(sql`
      SELECT
        contract.address_string AS address, contract.address AS addressHex,
        qrc20.name AS name, qrc20.symbol AS symbol, qrc20.decimals AS decimals, qrc20.total_supply AS totalSupply,
        qrc20.version AS version,
        list.holders AS holders,
        list.transactions AS transactions
      FROM (
        SELECT contract_address, holders, transactions FROM qrc20_statistics
        WHERE transactions > 0
        ORDER BY transactions DESC
        LIMIT ${offset}, ${limit}
      ) list
      INNER JOIN qrc20 USING (contract_address)
      INNER JOIN contract ON contract.address = list.contract_address
      ORDER BY transactions DESC
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})

    return {
      totalCount,
      tokens: list.map(item => ({
        address: item.addressHex.toString('hex'),
        addressHex: item.addressHex,
        name: item.name.toString(),
        symbol: item.symbol.toString(),
        decimals: item.decimals,
        totalSupply: BigInt(`0x${item.totalSupply.toString('hex')}`),
        version: item.version && item.version.toString(),
        holders: item.holders,
        transactions: item.transactions
      }))
    }
  }

  async getAllQRC20Balances(hexAddresses) {
    if (hexAddresses.length === 0) {
      return []
    }
    const {OutputScript, Solidity} = this.app.qtuminfo.lib
    const transferABI = Solidity.qrc20ABIs.find(abi => abi.name === 'transfer')
    const {
      Address, TransactionOutput,
      Contract, EvmReceipt: EVMReceipt, Qrc20: QRC20, Qrc20Balance: QRC20Balance,
      where, col
    } = this.ctx.model
    const {in: $in} = this.app.Sequelize.Op
    let list = await QRC20.findAll({
      attributes: ['contractAddress', 'name', 'symbol', 'decimals'],
      include: [{
        model: Contract,
        as: 'contract',
        required: true,
        attributes: ['addressString'],
        include: [{
          model: QRC20Balance,
          as: 'qrc20Balances',
          required: true,
          where: {address: {[$in]: hexAddresses}},
          attributes: ['balance']
        }]
      }],
      transaction: this.ctx.state.transaction
    })
    let mapping = new Map(list.map(item => [
      item.contract.addressString,
      {
        address: item.contractAddress.toString('hex'),
        addressHex: item.contractAddress,
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
        balance: item.contract.qrc20Balances.map(({balance}) => balance).reduce((x, y) => x + y),
        unconfirmed: {
          received: 0n,
          sent: 0n
        }
      }
    ]))
    let unconfirmedList = await EVMReceipt.findAll({
      where: {blockHeight: 0xffffffff},
      attributes: ['senderData'],
      include: [
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
            attributes: ['_id'],
            include: [{
              model: Contract,
              as: 'contract',
              required: true,
              attributes: ['address', 'addressString'],
              include: [{
                model: QRC20,
                as: 'qrc20',
                required: true,
                attributes: ['name', 'symbol', 'decimals']
              }]
            }]
          }]
        }
      ],
      transaction: this.ctx.state.transaction
    })
    for (let item of unconfirmedList) {
      let scriptPubKey = OutputScript.fromBuffer(item.output.scriptPubKey)
      if (![OutputScript.EVM_CONTRACT_CALL, OutputScript.EVM_CONTRACT_CALL_SENDER].includes(scriptPubKey.type)) {
        continue
      }
      let byteCode = scriptPubKey.byteCode
      if (byteCode.length === 68
        && Buffer.compare(byteCode.slice(0, 4), transferABI.id) === 0
        && Buffer.compare(byteCode.slice(4, 16), Buffer.alloc(12)) === 0
      ) {
        let data = {}
        if (mapping.has(item.output.address.contract.addressString)) {
          data = mapping.get(item.output.address.contract.addressString)
        } else {
          data = {
            address: item.output.address.contract.address.toString('hex'),
            addressHex: item.output.address.contract.address,
            name: item.output.address.contract.qrc20.name,
            symbol: item.output.address.contract.qrc20.symbol,
            decimals: item.output.address.contract.qrc20.decimals,
            balance: 0n,
            unconfirmed: {
              received: 0n,
              sent: 0n
            }
          }
          mapping.set(item.output.address.contract.addressString, data)
        }
        let from = item.senderData
        let to = byteCode.slice(16, 36)
        let value = BigInt(`0x${byteCode.slice(36).toString('hex')}`)
        let isFrom = hexAddresses.some(address => Buffer.compare(address, from) === 0)
        let isTo = hexAddresses.some(address => Buffer.compare(address, to) === 0)
        if (isFrom && !isTo) {
          data.unconfirmed.sent += value
        } else if (!isFrom && isTo) {
          data.unconfirmed.received += value
        }
      }
    }
    return [...mapping.values()]
  }

  async getQRC20Balance(rawAddresses, tokenAddress) {
    const {Address: RawAddress, OutputScript, Solidity} = this.app.qtuminfo.lib
    const transferABI = Solidity.qrc20ABIs.find(abi => abi.name === 'transfer')
    const {
      Address, TransactionOutput,
      Contract, EvmReceipt: EVMReceipt, Qrc20: QRC20, Qrc20Balance: QRC20Balance,
      where, col
    } = this.ctx.model
    const {in: $in} = this.app.Sequelize.Op
    let hexAddresses = rawAddresses
      .filter(address => [RawAddress.PAY_TO_PUBLIC_KEY_HASH, RawAddress.CONTRACT, RawAddress.EVM_CONTRACT].includes(address.type))
      .map(address => address.data)
    if (hexAddresses.length === 0) {
      return []
    }
    let token = await QRC20.findOne({
      where: {contractAddress: tokenAddress},
      attributes: ['name', 'symbol', 'decimals'],
      transaction: this.ctx.state.transaction
    })
    let list = await QRC20Balance.findAll({
      where: {contractAddress: tokenAddress, address: {[$in]: hexAddresses}},
      attributes: ['balance'],
      transaction: this.ctx.state.transaction
    })
    let unconfirmedList = await EVMReceipt.findAll({
      where: {blockHeight: 0xffffffff},
      attributes: ['senderData'],
      include: [{
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
            where: {address: tokenAddress},
            attributes: []
          }]
        }]
      }],
      transaction: this.ctx.state.transaction
    })
    let unconfirmed = {
      received: 0n,
      sent: 0n
    }
    for (let item of unconfirmedList) {
      let scriptPubKey = OutputScript.fromBuffer(item.output.scriptPubKey)
      if (![OutputScript.EVM_CONTRACT_CALL, OutputScript.EVM_CONTRACT_CALL_SENDER].includes(scriptPubKey.type)) {
        continue
      }
      let byteCode = scriptPubKey.byteCode
      if (byteCode.length === 68
        && Buffer.compare(byteCode.slice(0, 4), transferABI.id) === 0
        && Buffer.compare(byteCode.slice(4, 16), Buffer.alloc(12)) === 0
      ) {
        let from = item.senderData
        let to = byteCode.slice(16, 36)
        let value = BigInt(`0x${byteCode.slice(36).toString('hex')}`)
        let isFrom = hexAddresses.some(address => Buffer.compare(address, from) === 0)
        let isTo = hexAddresses.some(address => Buffer.compare(address, to) === 0)
        if (isFrom && !isTo) {
          unconfirmed.sent += value
        } else if (!isFrom && isTo) {
          unconfirmed.received += value
        }
      }
    }
    return {
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      balance: list.map(({balance}) => balance).reduce((x, y) => x + y, 0n),
      unconfirmed
    }
  }

  async getQRC20BalanceHistory(addresses, tokenAddress) {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    const {sql} = this.ctx.helper
    const {
      Header, Transaction,
      EvmReceipt: EVMReceipt, EvmReceiptLog: EVMReceiptLog,
      Contract, Qrc20: QRC20, Qrc20Balance: QRC20Balance,
      literal
    } = db
    const {ne: $ne, and: $and, or: $or, in: $in} = this.app.Sequelize.Op
    if (addresses.length === 0) {
      return {totalCount: 0, transactions: []}
    }
    let addressSet = new Set(addresses.map(address => address.toString('hex')))
    let topicAddresses = addresses.map(address => Buffer.concat([Buffer.alloc(12), address]))
    let {limit, offset, reversed = true} = this.ctx.state.pagination
    let order = reversed ? 'DESC' : 'ASC'
    let logFilter = [
      ...tokenAddress ? [sql`log.address = ${tokenAddress}`] : [],
      sql`log.topic1 = ${TransferABI.id}`,
      'log.topic3 IS NOT NULL',
      'log.topic4 IS NULL',
      sql`(log.topic2 IN ${topicAddresses} OR log.topic3 IN ${topicAddresses})`
    ].join(' AND ')

    let [{totalCount}] = await db.query(sql`
      SELECT COUNT(DISTINCT(receipt.transaction_id)) AS totalCount
      FROM evm_receipt receipt, evm_receipt_log log, qrc20
      WHERE receipt._id = log.receipt_id AND log.address = qrc20.contract_address AND ${{raw: logFilter}}
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    if (totalCount === 0) {
      return {totalCount: 0, transactions: []}
    }
    let ids = (await db.query(sql`
      SELECT transaction_id AS id FROM evm_receipt receipt
      INNER JOIN (
        SELECT DISTINCT(receipt.transaction_id) AS id FROM evm_receipt receipt, evm_receipt_log log, qrc20
        WHERE receipt._id = log.receipt_id AND log.address = qrc20.contract_address AND ${{raw: logFilter}}
      ) list ON list.id = receipt.transaction_id
      ORDER BY receipt.block_height ${{raw: order}}, receipt.index_in_block ${{raw: order}},
        receipt.transaction_id ${{raw: order}}, receipt.output_index ${{raw: order}}
      LIMIT ${offset}, ${limit}
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})).map(({id}) => id)

    let list = await EVMReceipt.findAll({
      where: {transactionId: {[$in]: ids}},
      attributes: ['blockHeight', 'indexInBlock'],
      include: [
        {
          model: Header,
          as: 'header',
          required: true,
          attributes: ['hash', 'timestamp']
        },
        {
          model: Transaction,
          as: 'transaction',
          required: true,
          attributes: ['id']
        },
        {
          model: EVMReceiptLog,
          as: 'logs',
          required: true,
          where: {
            ...tokenAddress ? {address: tokenAddress} : {},
            topic1: TransferABI.id,
            topic3: {[$ne]: null},
            topic4: null,
            [$or]: [
              {topic2: {[$in]: topicAddresses}},
              {topic3: {[$in]: topicAddresses}}
            ]
          },
          attributes: ['address', 'topic2', 'topic3', 'data'],
          include: [
            {
              model: Contract,
              as: 'contract',
              required: true,
              attributes: ['addressString']
            },
            {
              model: QRC20,
              as: 'qrc20',
              required: true,
              attributes: ['name', 'symbol', 'decimals']
            }
          ]
        }
      ],
      order: [['blockHeight', order], ['indexInBlock', order], ['transactionId', order], ['outputIndex', order]],
      transaction: this.ctx.state.transaction
    })

    if (!reversed) {
      list = list.reverse()
    }
    let initialBalanceMap = new Map()
    if (list.length > 0) {
      let intialBalanceList = await QRC20Balance.findAll({
        where: {
          ...tokenAddress ? {contractAddress: tokenAddress} : {},
          address: {[$in]: addresses}
        },
        attributes: ['balance'],
        include: [{
          model: Contract,
          as: 'contract',
          required: true,
          attributes: ['addressString']
        }],
        transaction: this.ctx.state.transaction
      })
      for (let {balance, contract} of intialBalanceList) {
        let address = contract.addressString
        initialBalanceMap.set(address, (initialBalanceMap.get(address) || 0n) + balance)
      }
      let {blockHeight, indexInBlock} = list[0]
      let latestLogs = await EVMReceiptLog.findAll({
        where: {
          ...tokenAddress ? {address: tokenAddress} : {},
          topic1: TransferABI.id,
          topic3: {[$ne]: null},
          topic4: null,
          [$or]: [
            {topic2: {[$in]: topicAddresses}},
            {topic3: {[$in]: topicAddresses}}
          ]
        },
        attributes: ['address', 'topic2', 'topic3', 'data'],
        include: [
          {
            model: EVMReceipt,
            as: 'receipt',
            required: true,
            where: {
              [$and]: literal(`(receipt.block_height, receipt.index_in_block) > (${blockHeight}, ${indexInBlock})`)
            }
          },
          {
            model: Contract,
            as: 'contract',
            required: true,
            attributes: ['addressString']
          }
        ],
        transaction: this.ctx.state.transaction
      })
      for (let log of latestLogs) {
        let address = log.contract.addressString
        let amount = BigInt(`0x${log.data.toString('hex')}`)
        let balance = initialBalanceMap.get(address) || 0n
        if (addressSet.has(log.topic2.slice(12).toString('hex'))) {
          balance += amount
        }
        if (addressSet.has(log.topic3.slice(12).toString('hex'))) {
          balance -= amount
        }
        initialBalanceMap.set(address, balance)
      }
    }

    let transactions = list.map(({blockHeight, header, transaction, logs}) => {
      let result = {
        id: transaction.id,
        block: {
          hash: header.hash,
          height: blockHeight,
          timestamp: header.timestamp
        },
        tokens: []
      }
      for (let log of logs) {
        let address = log.contract.addressString
        let delta = 0n
        let amount = BigInt(`0x${log.data.toString('hex')}`)
        if (addressSet.has(log.topic2.slice(12).toString('hex'))) {
          delta -= amount
        }
        if (addressSet.has(log.topic3.slice(12).toString('hex'))) {
          delta += amount
        }
        let item = result.tokens.find(token => token.address === address)
        if (item) {
          item.amount += delta
        } else {
          result.tokens.push({
            address,
            addressHex: log.address,
            name: log.qrc20.name.toString(),
            symbol: log.qrc20.symbol.toString(),
            decimals: log.qrc20.decimals,
            amount: delta
          })
        }
      }
      for (let token of result.tokens) {
        let initial = initialBalanceMap.get(token.address) || 0n
        token.balance = initial
        initial -= token.amount
        initialBalanceMap.set(token.address, initial)
        token.address = token.addressHex.toString('hex')
      }
      return result
    })
    if (!reversed) {
      transactions = transactions.reverse()
    }
    return {totalCount, transactions}
  }

  async getQRC20TokenTransactions(contractAddress) {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    const {EvmReceiptLog: EVMReceiptLog} = db
    const {sql} = this.ctx.helper
    let {limit, offset, reversed = true} = this.ctx.state.pagination
    let order = reversed ? 'DESC' : 'ASC'

    let totalCount = await EVMReceiptLog.count({
      where: {
        ...this.ctx.service.block.getBlockFilter(),
        address: contractAddress,
        topic1: TransferABI.id
      },
      transactions: this.ctx.state.transaction
    })
    let transactions = await db.query(sql`
      SELECT
        transaction.id AS transactionId,
        evm_receipt.output_index AS outputIndex,
        evm_receipt.block_height AS blockHeight,
        header.hash AS blockHash,
        header.timestamp AS timestamp,
        list.topic2 AS topic2,
        list.topic3 AS topic3,
        list.data AS data
      FROM (
        SELECT _id, receipt_id, topic2, topic3, data FROM evm_receipt_log
        WHERE address = ${contractAddress} AND topic1 = ${TransferABI.id} AND ${this.ctx.service.block.getRawBlockFilter()}
        ORDER BY _id ${{raw: order}} LIMIT ${offset}, ${limit}
      ) list
      INNER JOIN evm_receipt ON evm_receipt._id = list.receipt_id
      INNER JOIN transaction ON transaction._id = evm_receipt.transaction_id
      INNER JOIN header ON header.height = evm_receipt.block_height
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
        return {
          transactionId: transaction.transactionId,
          outputIndex: transaction.outputIndex,
          blockHeight: transaction.blockHeight,
          blockHash: transaction.blockHash,
          timestamp: transaction.timestamp,
          ...from && typeof from === 'object' ? {from: from.hex.toString('hex'), fromHex: from.hex} : {from},
          ...to && typeof to === 'object' ? {to: to.hex.toString('hex'), toHex: to.hex} : {to},
          value: BigInt(`0x${transaction.data.toString('hex')}`)
        }
      })
    }
  }

  async getQRC20TokenRichList(contractAddress) {
    const db = this.ctx.model
    const {Qrc20Balance: QRC20Balance} = db
    const {ne: $ne} = this.app.Sequelize.Op
    let {limit, offset} = this.ctx.state.pagination

    let totalCount = await QRC20Balance.count({
      where: {contractAddress, balance: {[$ne]: Buffer.alloc(32)}},
      transaction: this.ctx.state.transaction
    })
    let list = await QRC20Balance.findAll({
      where: {contractAddress, balance: {[$ne]: Buffer.alloc(32)}},
      attributes: ['address', 'balance'],
      order: [['balance', 'DESC']],
      limit,
      offset,
      transaction: this.ctx.state.transaction
    })
    let addresses = await this.ctx.service.contract.transformHexAddresses(list.map(item => item.address))
    return {
      totalCount,
      list: list.map(({balance}, index) => {
        let address = addresses[index]
        return {
          ...address && typeof address === 'object' ? {
            address: address.hex.toString('hex'),
            addressHex: address.hex.toString('hex')
          } : {address},
          balance
        }
      })
    }
  }

  async updateQRC20Statistics() {
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    const {Qrc20: QRC20, Qrc20Statistics: QRC20Statistics} = db
    const {sql} = this.ctx.helper
    let transaction = await db.transaction()
    try {
      let result = (await QRC20.findAll({attributes: ['contractAddress'], transaction})).map(
        ({contractAddress}) => ({contractAddress, holders: 0, transactions: 0})
      )
      let balanceResults = await db.query(sql`
        SELECT contract_address AS contractAddress, COUNT(*) AS count FROM qrc20_balance
        WHERE balance != ${Buffer.alloc(32)}
        GROUP BY contractAddress ORDER BY contractAddress
      `, {type: db.QueryTypes.SELECT, transaction})
      let i = 0
      for (let {contractAddress, count} of balanceResults) {
        while (true) {
          if (i >= result.length) {
            break
          }
          let comparison = Buffer.compare(contractAddress, result[i].contractAddress)
          if (comparison === 0) {
            result[i].holders = count
            break
          } else if (comparison < 0) {
            break
          } else {
            ++i
          }
        }
      }
      let transactionResults = await db.query(sql`
        SELECT address AS contractAddress, COUNT(*) AS count FROM evm_receipt_log USE INDEX (contract)
        WHERE topic1 = ${TransferABI.id}
        GROUP BY contractAddress ORDER BY contractAddress
      `, {type: db.QueryTypes.SELECT, transaction})
      let j = 0
      for (let {contractAddress, count} of transactionResults) {
        while (true) {
          if (j >= result.length) {
            break
          }
          let comparison = Buffer.compare(contractAddress, result[j].contractAddress)
          if (comparison === 0) {
            result[j].transactions = count
            break
          } else if (comparison < 0) {
            break
          } else {
            ++j
          }
        }
      }
      await db.query(sql`DELETE FROM qrc20_statistics`, {transaction})
      await QRC20Statistics.bulkCreate(result, {validate: false, transaction, logging: false})
      await transaction.commit()
    } catch (err) {
      await transaction.rollback()
    }
  }
}

module.exports = QRC20Service
