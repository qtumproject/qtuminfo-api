const {Controller} = require('egg')

class AddressController extends Controller {
  async summary() {
    let {ctx} = this
    let summary = await ctx.service.address.getAddressSummary(
      ctx.state.address.addressIds, ctx.state.address.p2pkhAddressIds, ctx.state.address.hexAddresses
    )
    ctx.body = {
      balance: summary.balance.toString(),
      totalReceived: summary.totalReceived.toString(),
      totalSent: summary.totalSent.toString(),
      unconfirmed: summary.unconfirmed.toString(),
      staking: summary.staking.toString(),
      mature: summary.mature.toString(),
      qrc20TokenBalances: summary.qrc20TokenBalances.map(({qrc20, balance}) => ({
        qrc20: {
          address: qrc20.address,
          addressHex: qrc20.addressHex.toString('hex'),
          name: qrc20.name,
          symbol: qrc20.symbol,
          decimals: qrc20.decimals
        },
        balance: balance.toString()
      })),
      transactionCount: summary.transactionCount,
      blocksMined: summary.blocksMined
    }
  }

  async balance() {
    let {ctx} = this
    let balance = await ctx.service.balance.getBalance(ctx.state.address.addressIds)
    ctx.body = balance.toString()
  }

  async totalReceived() {
    let {ctx} = this
    let {totalReceived} = await ctx.service.balance.getTotalBalanceChanges(ctx.state.address.addressIds)
    ctx.body = totalReceived.toString()
  }

  async totalSent() {
    let {ctx} = this
    let {totalSent} = await ctx.service.balance.getTotalBalanceChanges(ctx.state.address.addressIds)
    ctx.body = totalSent.toString()
  }

  async unconfirmedBalance() {
    let {ctx} = this
    let unconfirmed = await ctx.service.balance.getUnconfirmedBalance(ctx.state.address.addressIds)
    ctx.body = unconfirmed.toString()
  }

  async stakingBalance() {
    let {ctx} = this
    let unconfirmed = await ctx.service.balance.getStakingBalance(ctx.state.address.addressIds)
    ctx.body = unconfirmed.toString()
  }

  async matureBalance() {
    let {ctx} = this
    let unconfirmed = await ctx.service.balance.getMatureBalance(ctx.state.address.p2pkhAddressIds)
    ctx.body = unconfirmed.toString()
  }

  async utxo() {
    let {ctx} = this
    let utxos = await ctx.service.address.getUTXO(ctx.state.address.addressIds)
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

  async balanceHistory() {
    let {ctx} = this
    let {totalCount, transactions} = await ctx.service.balance.getBalanceHistory(ctx.state.address.addressIds, ctx.state.pagination)
    ctx.body = {
      totalCount,
      transactions: transactions.map(tx => ({
        id: tx.id.toString('hex'),
        block: {
          height: tx.block.height,
          ...tx.block.hash ? {
            hash: tx.block.hash.toString('hex'),
            timestamp: tx.block.timestamp
          } : {}
        },
        amount: tx.amount.toString(),
        balance: tx.balance.toString()
      }))
    }
  }
}

module.exports = AddressController
