const {Controller} = require('egg')

class TransactionController extends Controller {
  async transaction() {
    const {ctx} = this
    if (!/^[0-9a-f]{64}$/.test(ctx.params.id)) {
      ctx.throw(404)
    }
    let brief = 'brief' in ctx.query
    let id = Buffer.from(ctx.params.id, 'hex')
    let transaction = await ctx.service.transaction.getTransaction(id)
    if (!transaction) {
      ctx.throw(404)
    }
    ctx.body = await ctx.service.transaction.transformTransaction(transaction, {brief})
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
}

module.exports = TransactionController
