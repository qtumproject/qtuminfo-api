const {Service} = require('egg')

class QRC20Service extends Service {
  async listQRC20Tokens() {
    const db = this.ctx.model
    const {sql} = this.ctx.helper
    let {limit, offset} = this.ctx.state.pagination

    let result = await db.query(sql`
      SELECT COUNT(DISTINCT(qrc20_balance.contract_address)) AS count FROM qrc20_balance
      INNER JOIN qrc20 USING (contract_address)
      WHERE balance != ${Buffer.alloc(32)}
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    let totalCount = result[0].count || 0
    let list = await db.query(sql`
      SELECT
        contract.address_string AS address, contract.address AS addressHex,
        qrc20.name AS name, qrc20.symbol AS symbol, qrc20.decimals AS decimals, qrc20.total_supply AS totalSupply,
        qrc20.version AS version,
        list.holders AS holders
      FROM (
        SELECT contract_address, COUNT(*) AS holders FROM qrc20_balance
        INNER JOIN qrc20 USING (contract_address)
        WHERE balance != ${Buffer.alloc(32)}
        GROUP BY contract_address
        ORDER BY holders DESC
        LIMIT ${offset}, ${limit}
      ) list
      INNER JOIN qrc20 USING (contract_address)
      INNER JOIN contract ON contract.address = list.contract_address
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})

    return {
      totalCount,
      tokens: list.map(item => ({
        address: item.address,
        addressHex: item.addressHex,
        name: item.name.toString(),
        symbol: item.symbol.toString(),
        decimals: item.decimals,
        totalSupply: BigInt(`0x${item.totalSupply.toString('hex')}`),
        version: item.version && item.version.toString(),
        holders: item.holders
      }))
    }
  }

  async getAllQRC20Balances(hexAddresses) {
    if (hexAddresses.length === 0) {
      return []
    }
    const {Contract, Qrc20: QRC20, Qrc20Balance: QRC20Balance} = this.ctx.model
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
    return list.map(item => ({
      address: item.contract.addressString,
      addressHex: item.contractAddress,
      name: item.name,
      symbol: item.symbol,
      decimals: item.decimals,
      balance: item.contract.qrc20Balances.map(({balance}) => balance).reduce((x, y) => x + y)
    })).filter(({balance}) => balance)
  }

  async getQRC20BalanceHistory(addresses, tokens) {
    if (addresses.length === 0 || tokens && tokens.length === 0) {
      return {totalCount: 0, transactions: []}
    }
    let addressSet = new Set(addresses.map(address => address.toString('hex')))
    let topicAddresses = addresses.map(address => Buffer.concat([Buffer.alloc(12), address]))
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
    let {limit, offset, reversed = true} = this.ctx.state.pagination
    let order = reversed ? 'DESC' : 'ASC'
    let logFilter = [
      ...tokens ? [sql`log.address IN ${tokens}`] : [],
      sql`log.topic1 = ${TransferABI.id}`,
      'log.topic3 IS NOT NULL',
      'log.topic4 IS NULL',
      sql`(log.topic2 IN ${topicAddresses} OR log.topic3 IN ${topicAddresses})`
    ].join(' AND ')

    let result = await db.query(sql`
      SELECT COUNT(DISTINCT(receipt.transaction_id)) AS totalCount
      FROM evm_receipt receipt, evm_receipt_log log, qrc20
      WHERE receipt._id = log.receipt_id AND log.address = qrc20.contract_address AND ${{raw: logFilter}}
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    let totalCount = result[0].totalCount || 0
    if (totalCount === 0) {
      return {totalCount: 0, transactions: []}
    }
    let ids = (await db.query(sql`
      SELECT transaction_id AS id FROM evm_receipt receipt
      INNER JOIN (
        SELECT DISTINCT(receipt.transaction_id) AS id FROM evm_receipt receipt, evm_receipt_log log, qrc20
        WHERE receipt._id = log.receipt_id AND log.address = qrc20.contract_address AND ${{raw: logFilter}}
      ) list ON list.id = receipt.transaction_id
      ORDER BY receipt.block_height ${{raw: order}}, receipt.index_in_block ${{raw: order}}
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
            ...tokens ? {address: {[$in]: tokens}} : {},
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
      order: [['blockHeight', order], ['indexInBlock', order]],
      transaction: this.ctx.state.transaction
    })

    if (!reversed) {
      list = list.reverse()
    }
    let initialBalanceMap = new Map()
    if (list.length > 0) {
      let intialBalanceList = await QRC20Balance.findAll({
        where: {
          ...tokens ? {contractAddress: {[$in]: tokens}} : {},
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
          ...tokens ? {address: {[$in]: tokens}} : {},
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
      }
      return result
    })
    if (!reversed) {
      transactions = transactions.reverse()
    }
    return {totalCount, transactions}
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
            address: address.string,
            addressHex: address.hex.toString('hex')
          } : {address},
          balance
        }
      })
    }
  }
}

module.exports = QRC20Service
