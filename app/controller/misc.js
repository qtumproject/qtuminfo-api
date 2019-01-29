const {Controller} = require('egg')

class MiscController extends Controller {
  async richList() {
    let {ctx} = this
    let {totalCount, list} = await ctx.service.balance.getRichList(ctx.state.pagination)
    ctx.body = {
      totalCount,
      list: list.map(item => ({
        address: item.address,
        balance: item.balance.toString()
      }))
    }
  }
}

module.exports = MiscController
