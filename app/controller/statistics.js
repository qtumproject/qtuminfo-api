const uuidv4 = require('uuid/v4')
const {Controller} = require('egg')

class StatisticsController extends Controller {
  async dailyTransactions() {
    const {app, ctx} = this
    let nonce = uuidv4()
    app.messenger.sendToAgent('fetch-daily-transactions', nonce)
    let dailyTransactions = await new Promise(resolve => app.messenger.once(`daily-transactions-${nonce}`, resolve))
    ctx.body = dailyTransactions.map(({timestamp, transactionsCount, contractTransactionsCount}) => ({
      time: new Date(timestamp * 1000),
      transactionCount: transactionsCount,
      contractTransactionCount: contractTransactionsCount
    }))
  }

  async blockInterval() {
    const {app, ctx} = this
    let nonce = uuidv4()
    app.messenger.sendToAgent('fetch-block-interval', nonce)
    let blockInterval = await new Promise(resolve => app.messenger.once(`block-interval-${nonce}`, resolve))
    ctx.body = blockInterval
  }

  async addressGrowth() {
    const {app, ctx} = this
    let nonce = uuidv4()
    app.messenger.sendToAgent('fetch-address-growth', nonce)
    let addressGrowth = await new Promise(resolve => app.messenger.once(`address-growth-${nonce}`, resolve))
    ctx.body = addressGrowth.map(({timestamp, count}) => ({
      time: new Date(timestamp * 1000),
      addresses: count
    }))
  }
}

module.exports = StatisticsController
