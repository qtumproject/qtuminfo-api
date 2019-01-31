const {Service} = require('egg')

class ContractService extends Service {
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
      qrc20: {
        address: item.contract.addressString,
        addressHex: item.contractAddress,
        name: item.name.toString(),
        symbol: item.symbol.toString(),
        decimals: item.decimals
      },
      balance: item.contract.qrc20Balances.map(({balance}) => balance).reduce((x, y) => x + y)
    })).filter(({balance}) => balance)
  }

  async getQRC20BalanceHistory(addresses, tokens, {pageSize = 100, pageIndex = 0, reversed = true} = {}) {
    if (addresses.length === 0 || tokens && tokens.length === 0) {
      return {totalCount: 0, transactions: []}
    }
    let addressSet = new Set(addresses.map(address => address.toString('hex')))
    let topicAddresses = addresses.map(address => Buffer.concat([Buffer.alloc(12), address]))
    let hexAddresses = addresses.map(address => `0x${'0'.repeat(24)}${address.toString('hex')}`)
    const TransferABI = this.app.qtuminfo.lib.Solidity.qrc20ABIs.find(abi => abi.name === 'Transfer')
    const db = this.ctx.model
    const {Header, Transaction, Receipt, ReceiptLog, Contract, Qrc20: QRC20, Qrc20Balance: QRC20Balance, literal} = db
    const {ne: $ne, and: $and, or: $or, in: $in} = this.app.Sequelize.Op
    let limit = pageSize
    let offset = pageIndex * pageSize
    let order = reversed ? 'DESC' : 'ASC'
    let logFilter = [
      ...tokens ? [`receipt_log.address IN (${tokens.map(token => `0x${token.toString('hex')}`).join(', ')})`] : [],
      `receipt_log.topic1 = 0x${TransferABI.id.toString('hex')}`,
      'receipt_log.topic3 IS NOT NULL',
      'receipt_log.topic4 IS NULL',
      `(receipt_log.topic2 IN (${hexAddresses.join(', ')}) OR receipt_log.topic3 IN (${hexAddresses.join(', ')}))`
    ].join(' AND ')

    let result = await db.query(`
      SELECT COUNT(DISTINCT(receipt.transaction_id)) AS totalCount
      FROM receipt, receipt_log, qrc20
      WHERE receipt._id = receipt_log.receipt_id AND receipt_log.address = qrc20.contract_address AND ${logFilter}
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    let totalCount = result[0].totalCount || 0
    if (totalCount === 0) {
      return {totalCount: 0, transactions: []}
    }
    let ids = (await db.query(`
      SELECT transaction_id AS id FROM receipt
      INNER JOIN (
        SELECT DISTINCT(receipt.transaction_id) AS id FROM receipt, receipt_log, qrc20
        WHERE receipt._id = receipt_log.receipt_id AND receipt_log.address = qrc20.contract_address AND ${logFilter}
      ) list ON list.id = receipt.transaction_id
      ORDER BY receipt.block_height ${order}, receipt.index_in_block ${order}
      LIMIT ${offset}, ${limit}
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})).map(({id}) => id)

    let list = await Receipt.findAll({
      where: {transactionId: {[$in]: ids}},
      attributes: ['blockHeight', 'indexInBlock'],
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
          model: ReceiptLog,
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
      let latestLogs = await ReceiptLog.findAll({
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
            model: Receipt,
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
        let item = result.tokens.find(token => token.qrc20.address === address)
        if (item) {
          item.amount += delta
        } else {
          result.tokens.push({
            qrc20: {
              address,
              addressHex: log.address,
              name: log.qrc20.name.toString(),
              symbol: log.qrc20.symbol.toString(),
              decimals: log.qrc20.decimals
            },
            amount: delta
          })
        }
      }
      for (let token of result.tokens) {
        let initial = initialBalanceMap.get(token.qrc20.address) || 0n
        token.balance = initial -= token.amount
        initialBalanceMap.set(token.qrc20.address, initial)
      }
      return result
    })
    if (!reversed) {
      transactions = transactions.reverse()
    }
    return {totalCount, transactions}
  }
}

module.exports = ContractService
