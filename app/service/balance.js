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
}

module.exports = AddressService
