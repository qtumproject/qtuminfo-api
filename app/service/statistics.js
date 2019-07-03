const {Service} = require('egg')

class StatisticsService extends Service {
  async getDailyTransactions() {
    const db = this.ctx.model
    const {sql} = this.ctx.helper
    let result = await db.query(sql`
      SELECT
        FLOOR(header.timestamp / 86400) AS date,
        SUM(block.transactions_count) AS transactionsCount,
        SUM(block.contract_transactions_count) AS contractTransactionsCount
      FROM header, block
      WHERE header.height = block.height
      GROUP BY date
      ORDER BY date ASC
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    return result.map(({date, transactionsCount, contractTransactionsCount}) => ({
      timestamp: date * 86400,
      transactionsCount,
      contractTransactionsCount
    }))
  }

  async getBlockIntervalStatistics() {
    const db = this.ctx.model
    const {sql} = this.ctx.helper
    let result = await db.query(sql`
      SELECT header.timestamp - prev_header.timestamp AS blockInterval, COUNT(*) AS count FROM header
      INNER JOIN header prev_header ON prev_header.height = header.height - 1
      WHERE header.height > 5001
      GROUP BY blockInterval
      ORDER BY blockInterval ASC
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    let total = this.app.blockchainInfo.tip.height - 5001
    return result.map(({blockInterval, count}) => ({interval: blockInterval, count, percentage: count / total}))
  }

  async getAddressGrowth() {
    const db = this.ctx.model
    const {Address} = db
    const {sql} = this.ctx.helper
    let result = await db.query(sql`
      SELECT FLOOR(header.timestamp / 86400) AS date, COUNT(*) AS count FROM address, header
      WHERE address.create_height = header.height AND address.type < ${Address.parseType('contract')}
      GROUP BY date
      ORDER BY date ASC
    `, {type: db.QueryTypes.SELECT, transaction: this.ctx.state.transaction})
    let sum = 0
    return result.map(({date, count}) => {
      sum += count
      return {
        timestamp: date * 86400,
        count: sum
      }
    })
  }
}

module.exports = StatisticsService
