const {Controller} = require('egg')

class AddressController extends Controller {
  async summary() {
    let {ctx} = this
    let addressParams = await ctx.service.address.getAddressParams(ctx.params.address)
    if (!addressParams) {
      ctx.throw(400)
    }
    let summary = await ctx.service.address.getAddressSummary(
      addressParams.addressIds, addressParams.p2pkhAddressIds, addressParams.hexAddresses
    )
    ctx.body = {
      balance: summary.balance.toString(),
      totalReceived: summary.totalReceived.toString(),
      totalSent: summary.totalSent.toString(),
      unconfirmed: summary.unconfirmed.toString(),
      staking: summary.staking.toString(),
      mature: summary.mature.toString(),
      transactionCount: summary.transactionCount,
      blocksMined: summary.blocksMined
    }
  }

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

  async utxo() {
    let {ctx} = this
    let addressParams = await ctx.service.address.getAddressParams(ctx.params.address)
    if (!addressParams) {
      ctx.throw(400)
    }
    let utxos = await ctx.service.address.getUTXO(addressParams.addressIds)
    ctx.body = utxos.map(utxo => ({
      transactionId: utxo.transactionId.toString('hex'),
      outputIndex: utxo.outputIndex,
      scriptPubKey: utxo.scriptPubKey.toString('hex'),
      address: utxo.address.string,
      value: utxo.value.toString(),
      isStake: utxo.isStake,
      blockHeight: utxo.outputHeight,
      confirmations: utxo.confirmations
    }))
  }
}

module.exports = AddressController
