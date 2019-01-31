const {Controller} = require('egg')

class MiscController extends Controller {
  async richList() {
    let {ctx} = this
    let {totalCount, list} = await ctx.service.balance.getRichList()
    ctx.body = {
      totalCount,
      list: list.map(item => ({
        address: item.address,
        balance: item.balance.toString()
      }))
    }
  }

  async biggestMiners() {
    let {ctx} = this
    let lastNBlocks = null
    if (ctx.query.blocks && /^[1-9]\d*$/.test(ctx.query.blocks)) {
      lastNBlocks = Number.parseInt(ctx.query.blocks)
    }
    let {totalCount, list} = await ctx.service.block.getBiggestMiners(lastNBlocks)
    ctx.body = {
      totalCount,
      list: list.map(item => ({
        address: item.address,
        blocks: item.blocks,
        balance: item.balance.toString()
      }))
    }
  }
}

module.exports = MiscController
