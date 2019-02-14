const {Controller} = require('egg')

class TransactionController extends Controller {
  async transaction() {
    const {ctx} = this
    if (!ctx.params.id) {
      ctx.throw(404)
    } else if (!/^[0-9a-f]{64}$/i.test(ctx.params.id)) {
      ctx.throw(400)
    }
    let brief = 'brief' in ctx.query
    let id = Buffer.from(ctx.params.id, 'hex')
    let transaction = await ctx.service.transaction.getTransaction(id)
    if (!transaction) {
      ctx.throw(404)
    }
    ctx.body = await ctx.service.transaction.transformTransaction(transaction, {brief})
  }

  async transactions() {
    const {ctx} = this
    if (!ctx.params.ids) {
      ctx.throw(404)
    }
    let ids = ctx.params.ids.split(',')
    if (ids.length > 100 || ids.some(id => !/^[0-9a-f]{64}$/i.test(id))) {
      ctx.throw(400)
    }
    let brief = 'brief' in ctx.query
    let transactions = await Promise.all(ids.map(
      id => ctx.service.transaction.getTransaction(Buffer.from(id, 'hex'))
    ))
    if (!transactions.every(Boolean)) {
      ctx.throw(404)
    }
    ctx.body = await Promise.all(transactions.map(
      tx => ctx.service.transaction.transformTransaction(tx, {brief})
    ))
  }

  async rawTransaction() {
    const {ctx} = this
    if (!/^[0-9a-f]{64}$/.test(ctx.params.id)) {
      ctx.throw(404)
    }
    let id = Buffer.from(ctx.params.id, 'hex')
    let transaction = await ctx.service.transaction.getRawTransaction(id)
    if (!transaction) {
      ctx.throw(404)
    }
    ctx.body = transaction.toBuffer().toString('hex')
  }

  async recent() {
    const {ctx} = this
    let count = Number.parseInt(ctx.query.count || 10)
    let ids = await ctx.service.transaction.getRecentTransactions(count)
    let transactions = await Promise.all(ids.map(
      id => ctx.service.transaction.getTransaction(Buffer.from(id, 'hex'))
    ))
    ctx.body = await Promise.all(transactions.map(
      tx => ctx.service.transaction.transformTransaction(tx, {brief: true})
    ))
  }
}

module.exports = TransactionController
