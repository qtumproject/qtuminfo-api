const {Service} = require('egg')

class AddressService extends Service {
  async getBalance(ids) {
    const {TransactionOutput} = this.ctx.model
    const {in: $in, gt: $gt} = this.app.Sequelize.Op
    let result = await TransactionOutput.aggregate('value', 'SUM', {
      where: {
        addressId: {[$in]: ids},
        outputHeight: {[$gt]: 0},
        inputHeight: null
      }
    })
    return BigInt(result || 0)
  }

  async getTotalBalanceChanges(ids) {
    if (ids.length === 0) {
      return {totalReceived: 0n, totalSent: 0n}
    }

    const db = this.ctx.model
    let totalReceived
    let totalSent
    let {id: genesisTxId} = await db.Transaction.findOne({where: {blockHeight: 0}, attributes: ['id']})
    if (ids.length === 1) {
      let id = ids[0]
      let [result] = await db.query(`
        SELECT
          SUM(CAST(GREATEST(value, 0) AS DECIMAL(24))) AS totalReceived,
          SUM(CAST(GREATEST(-value, 0) AS DECIMAL(24))) AS totalSent
        FROM balance_change WHERE address_id = ${id} AND transaction_id != 0x${genesisTxId.toString('hex')}
      `, {type: db.QueryTypes.SELECT})
      totalReceived = result.totalReceived == null ? 0n : BigInt(result.totalReceived)
      totalSent = result.totalSent == null ? 0n : BigInt(result.totalSent)
    } else {
      let [result] = await db.query(`
        SELECT
          SUM(CAST(GREATEST(value, 0) AS DECIMAL(24))) AS totalReceived,
          SUM(CAST(GREATEST(-value, 0) AS DECIMAL(24))) AS totalSent
        FROM (
          SELECT SUM(value) AS value FROM balance_change
          WHERE address_id IN (${ids.join(', ')}) AND transaction_id != 0x${genesisTxId.toString('hex')}
          GROUP BY transaction_id
        ) AS temp
      `, {type: db.QueryTypes.SELECT})
      totalReceived = result.totalReceived == null ? 0n : BigInt(result.totalReceived)
      totalSent = result.totalSent == null ? 0n : BigInt(result.totalSent)
    }
    return {totalReceived, totalSent}
  }

  async getUnconfirmedBalance(ids) {
    const {TransactionOutput} = this.ctx.model
    const {in: $in} = this.app.Sequelize.Op
    let result = await TransactionOutput.aggregate('value', 'SUM', {
      where: {
        addressId: {[$in]: ids},
        outputHeight: 0xffffffff,
        inputHeight: null
      }
    })
    return BigInt(result || 0)
  }

  async getStakingBalance(ids) {
    const {TransactionOutput} = this.ctx.model
    const {in: $in, gt: $gt} = this.app.Sequelize.Op
    let result = await TransactionOutput.aggregate('value', 'SUM', {
      where: {
        addressId: {[$in]: ids},
        outputHeight: {[$gt]: this.app.blockchainInfo.tip.height - 500},
        isStake: true
      }
    })
    return BigInt(result || 0)
  }

  async getMatureBalance(ids) {
    const {TransactionOutput} = this.ctx.model
    const {in: $in, between: $between} = this.app.Sequelize.Op
    let result = await TransactionOutput.aggregate('value', 'SUM', {
      where: {
        addressId: {[$in]: ids},
        outputHeight: {[$between]: [1, this.app.blockchainInfo.tip.height - 500]},
        inputHeight: null
      }
    })
    return BigInt(result || 0)
  }

  async getBalanceHistory(ids, {pageSize = 100, pageIndex = 0, reversed = true} = {}) {
    if (ids.length === 0) {
      return []
    }
    const db = this.ctx.model
    const {Header, Transaction, BalanceChange, fn, col} = db
    const {ne: $ne, in: $in, gt: $gt} = this.app.Sequelize.Op
    let limit = pageSize
    let offset = pageIndex * pageSize
    let order = reversed ? 'DESC' : 'ASC'
    let {id: genesisTransactionId} = await Transaction.findOne({where: {blockHeight: 0}, attributes: ['id']})
    let totalCount = await BalanceChange.count({
      where: {
        addressId: {[$in]: ids},
        transactionId: {[$ne]: genesisTransactionId}
      },
      distinct: true,
      col: 'transactionId'
    })
    if (totalCount === 0) {
      return {totalCount: 0, transactions: []}
    }
    let list = await BalanceChange.findAll({
      where: {addressId: {[$in]: ids}},
      attributes: [[fn('SUM', col('value')), 'value']],
      include: [{
        model: Transaction,
        as: 'transaction',
        required: true,
        where: {blockHeight: {[$gt]: 0}},
        attributes: ['_id', 'id', 'blockHeight', 'indexInBlock'],
        include: [{
          model: Header,
          as: 'header',
          required: true,
          attributes: ['hash', 'timestamp']
        }]
      }],
      group: ['transaction._id'],
      order: [
        ['transaction', 'blockHeight', order],
        ['transaction', 'indexInBlock', order],
        ['transaction', '_id', order]
      ],
      limit,
      offset
    })
    if (reversed) {
      list = list.reverse()
    }
    let initialBalance = 0n
    if (list.length > 0) {
      let {blockHeight, indexInBlock, _id} = list[0].transaction
      let [{value}] = await db.query(`
        SELECT SUM(balance.value) AS value FROM transaction tx, balance_change balance
        WHERE tx._id = balance.transaction_id AND tx.block_height > 0 AND balance.address_id IN (${ids.join(', ')})
          AND (tx.block_height, tx.index_in_block, tx._id) < (${blockHeight}, ${indexInBlock}, ${_id})
      `, {type: db.QueryTypes.SELECT})
      initialBalance = BigInt(value || 0n)
    }
    let transactions = list.map(item => ({
      id: item.transaction.id,
      ...item.transaction.header ? {
        block: {
          hash: item.transaction.header.hash,
          height: item.transaction.blockHeight,
          timestamp: item.transaction.header.timestamp
        }
      } : {block: {height: 0xffffffff}},
      amount: item.value,
    }))
    for (let tx of transactions) {
      tx.balance = initialBalance += tx.amount
    }
    if (reversed) {
      transactions = transactions.reverse()
    }
    return {totalCount, transactions}
  }

  async updateRichList() {
    const db = this.ctx.model
    const transaction = await db.transaction()
    try {
      const blockHeight = this.app.blockchainInfo.tip.height
      await db.query(`TRUNCATE TABLE rich_list`, {transaction})
      await db.query(`
        INSERT INTO rich_list
        SELECT address_id, SUM(value) AS value FROM transaction_output
        WHERE address_id > 0 AND (input_height IS NULL OR input_height > ${blockHeight})
          AND (output_height BETWEEN 1 AND ${blockHeight}) AND value > 0
        GROUP BY address_id
      `, {transaction})
      await transaction.commit()
    } catch (err) {
      await transaction.rollback()
    }
  }
}

module.exports = AddressService
