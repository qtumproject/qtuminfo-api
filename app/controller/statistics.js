const {Controller} = require('egg')

class StatisticsController extends Controller {
  async dailyTransactions() {
    const {app, ctx} = this
    let dailyTransactions = JSON.parse(await app.redis.hget(app.name, 'daily-transactions') || '[]')
    ctx.body = dailyTransactions.map(({timestamp, transactionsCount, contractTransactionsCount}) => ({
      time: new Date(timestamp * 1000),
      transactionCount: transactionsCount,
      contractTransactionCount: contractTransactionsCount
    }))
  }

  async blockInterval() {
    const {app, ctx} = this
    let blockInterval = JSON.parse(await app.redis.hget(app.name, 'block-interval') || '[]')
    ctx.body = blockInterval
  }

  async addressGrowth() {
    const {app, ctx} = this
    let addressGrowth = JSON.parse(await app.redis.hget(app.name, 'address-growth') || '[]')
    ctx.body = addressGrowth.map(({timestamp, count}) => ({
      time: new Date(timestamp * 1000),
      addresses: count
    }))
  }
}

module.exports = StatisticsController
