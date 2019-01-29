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

    let transactionIds
    let list
    if (ids.length === 1) {
      transactionIds = (await BalanceChange.findAll({
        where: {addressId: ids[0]},
        attributes: ['transactionId'],
        order: [['blockHeight', order], ['indexInBlock', order], ['transactionId', order]],
        limit,
        offset
      })).map(({transactionId}) => transactionId)
      list = await BalanceChange.findAll({
        where: {
          transactionId: {[$in]: transactionIds},
          addressId: ids[0]
        },
        attributes: ['transactionId', 'blockHeight', 'indexInBlock', 'value'],
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
          }
        ],
        order: [['blockHeight', order], ['indexInBlock', order], ['transactionId', order]]
      })
    } else {
      transactionIds = (await db.query(`
        SELECT _id FROM transaction WHERE EXISTS (
          SELECT * FROM balance_change
          WHERE balance_change.transaction_id = transaction._id AND address_id IN (${ids.join(', ')})
        ) AND block_height > 0
        ORDER BY block_height ${order}, index_in_block ${order}, _id ${order}
        LIMIT ${offset}, ${limit}
      `, {type: db.QueryTypes.SELECT})).map(({_id}) => _id)
      list = await BalanceChange.findAll({
        where: {
          transactionId: {[$in]: transactionIds},
          addressId: {[$in]: ids}
        },
        attributes: ['transactionId', 'blockHeight', 'indexInBlock', [fn('SUM', col('value')), 'value']],
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
          }
        ],
        group: ['_id'],
        order: [['blockHeight', order], ['indexInBlock', order], ['transactionId', order]]
      })
    }

    if (reversed) {
      list = list.reverse()
    }
    let initialBalance = 0n
    if (list.length > 0) {
      let {blockHeight, indexInBlock, transactionId} = list[0]
      let [{value}] = await db.query(`
        SELECT SUM(value) AS value FROM balance_change
        WHERE address_id IN (${ids.join(', ')})
          AND (block_height, index_in_block, transaction_id) < (${blockHeight}, ${indexInBlock}, ${transactionId})
      `, {type: db.QueryTypes.SELECT})
      initialBalance = BigInt(value || 0n)
    }
    let transactions = list.map(item => ({
      id: item.transaction.id,
      ...item.header ? {
        block: {
          hash: item.header.hash,
          height: item.blockHeight,
          timestamp: item.header.timestamp
        }
      } : {},
      amount: BigInt(item.getDataValue('value')),
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
    const transaction = await db.transaction({
      isolationLevel: this.app.Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
    })
    try {
      const blockHeight = this.app.blockchainInfo.tip.height
      await db.query(`DELETE FROM rich_list`, {transaction})
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
