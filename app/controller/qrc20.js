const {Controller} = require('egg')

class QRC20Controller extends Controller {
  async list() {
    const {ctx} = this
    let {totalCount, tokens} = await ctx.service.qrc20.listQRC20Tokens()
    ctx.body = {
      totalCount,
      tokens: tokens.map(item => ({
        address: item.address,
        addressHex: item.addressHex.toString('hex'),
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
        totalSupply: item.totalSupply.toString(),
        version: item.version,
        holders: item.holders,
        transactions: item.transactions
      }))
    }
  }

  async richList() {
    const {ctx} = this
    let {totalCount, list} = await ctx.service.qrc20.getQRC20TokenRichList(ctx.state.contract.contractAddress)
    ctx.body = {
      totalCount,
      list: list.map(item => ({
        address: item.address,
        addressHex: item.addressHex,
        balance: item.balance.toString()
      }))
    }
  }
}

module.exports = QRC20Controller
