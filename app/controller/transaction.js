const {Controller} = require('egg')

class TransactionController extends Controller {
  async transaction() {
    const {ctx} = this
    ctx.assert(ctx.params.id && /^[0-9a-f]{64}$/i.test(ctx.params.id), 404)
    let brief = 'brief' in ctx.query
    let id = Buffer.from(ctx.params.id, 'hex')
    let transaction = await ctx.service.transaction.getTransaction(id)
    ctx.assert(transaction, 404)
    ctx.body = await ctx.service.transaction.transformTransaction(transaction, {brief})
  }

  async transactions() {
    const {ctx} = this
    ctx.assert(ctx.params.ids, 404)
    let ids = ctx.params.ids.split(',')
    ctx.assert(ids.length <= 100 && ids.every(id => /^[0-9a-f]{64}$/i.test(id)), 404)
    let brief = 'brief' in ctx.query
    let transactions = await Promise.all(ids.map(
      id => ctx.service.transaction.getTransaction(Buffer.from(id, 'hex'))
    ))
    ctx.assert(transactions.every(Boolean), 404)
    ctx.body = await Promise.all(transactions.map(
      tx => ctx.service.transaction.transformTransaction(tx, {brief})
    ))
  }

  async rawTransaction() {
    const {ctx} = this
    ctx.assert(/^[0-9a-f]{64}$/.test(ctx.params.id), 404)
    let id = Buffer.from(ctx.params.id, 'hex')
    let transaction = await ctx.service.transaction.getRawTransaction(id)
    ctx.assert(transaction, 404)
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

  async list() {
    const {ctx} = this
    let {totalCount, ids} = await ctx.service.transaction.getAllTransactions()
    let transactions = await Promise.all(ids.map(id => ctx.service.transaction.getTransaction(id)))
    ctx.body = {
      totalCount,
      transactions: await Promise.all(transactions.map(tx => ctx.service.transaction.transformTransaction(tx)))
    }
  }

  async send() {
    const {ctx} = this
    let {rawtx: data} = ctx.request.body
    if (!/^([0-9a-f][0-9a-f])+$/i.test(data)) {
      ctx.body = {status: 1, message: 'TX decode failed'}
    }
    try {
      let id = await ctx.service.transaction.sendRawTransaction(Buffer.from(data, 'hex'))
      ctx.body = {status: 0, id: id.toString('hex'), txid: id.toString('hex')}
    } catch (err) {
      ctx.body = {status: 1, message: err.message}
    }
  }
}

module.exports = TransactionController
