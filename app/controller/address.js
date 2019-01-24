const {Controller} = require('egg')

class AddressController extends Controller {
  async balance() {
    let {ctx} = this
    let addressParams = await ctx.service.address.getAddressParams(ctx.params.address)
    if (!addressParams) {
      ctx.throw(400)
    }
    let balance = await ctx.service.balance.getBalance(addressParams.addressIds)
    ctx.body = balance.toString()
  }

  async totalReceived() {
    let {ctx} = this
    let addressParams = await ctx.service.address.getAddressParams(ctx.params.address)
    if (!addressParams) {
      ctx.throw(400)
    }
    let {totalReceived} = await ctx.service.balance.getTotalBalanceChanges(addressParams.addressIds)
    ctx.body = totalReceived.toString()
  }

  async totalSent() {
    let {ctx} = this
    let addressParams = await ctx.service.address.getAddressParams(ctx.params.address)
    if (!addressParams) {
      ctx.throw(400)
    }
    let {totalSent} = await ctx.service.balance.getTotalBalanceChanges(addressParams.addressIds)
    ctx.body = totalSent.toString()
  }

  async unconfirmedBalance() {
    let {ctx} = this
    let addressParams = await ctx.service.address.getAddressParams(ctx.params.address)
    if (!addressParams) {
      ctx.throw(400)
    }
    let unconfirmed = await ctx.service.balance.getUnconfirmedBalance(addressParams.addressIds)
    ctx.body = unconfirmed.toString()
  }

  async stakingBalance() {
    let {ctx} = this
    let addressParams = await ctx.service.address.getAddressParams(ctx.params.address)
    if (!addressParams) {
      ctx.throw(400)
    }
    let unconfirmed = await ctx.service.balance.getStakingBalance(addressParams.addressIds)
    ctx.body = unconfirmed.toString()
  }

  async matureBalance() {
    let {ctx} = this
    let addressParams = await ctx.service.address.getAddressParams(ctx.params.address)
    if (!addressParams) {
      ctx.throw(400)
    }
    let unconfirmed = await ctx.service.balance.getMatureBalance(addressParams.p2pkhAddressIds)
    ctx.body = unconfirmed.toString()
  }
}

module.exports = AddressController
