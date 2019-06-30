const {Controller} = require('egg')

class AddressController extends Controller {
  async summary() {
    let {ctx} = this
    let {address} = ctx.state
    let summary = await ctx.service.address.getAddressSummary(address.addressIds, address.p2pkhAddressIds, address.hexAddresses)
    ctx.body = {
      balance: summary.balance.toString(),
      totalReceived: summary.totalReceived.toString(),
      totalSent: summary.totalSent.toString(),
      unconfirmed: summary.unconfirmed.toString(),
      staking: summary.staking.toString(),
      mature: summary.mature.toString(),
      qrc20Balances: summary.qrc20Balances.map(item => ({
        address: item.address,
        addressHex: item.addressHex.toString('hex'),
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
        balance: item.balance.toString()
      })),
      qrc721Balances: summary.qrc721Balances.map(item => ({
        address: item.address,
        addressHex: item.addressHex.toString('hex'),
        name: item.name,
        symbol: item.symbol,
        count: item.count
      })),
      ranking: summary.ranking,
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

  async transactions() {
    let {ctx} = this
    let {address} = ctx.state
    let {totalCount, transactions} = await ctx.service.address.getAddressTransactions(address.addressIds, address.hexAddresses)
    ctx.body = {
      totalCount,
      transactions: transactions.map(id => id.toString('hex'))
    }
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
      blockHeight: utxo.blockHeight,
      confirmations: utxo.confirmations
    }))
  }

  async balanceHistory() {
    let {ctx} = this
    let {totalCount, transactions} = await ctx.service.balance.getBalanceHistory(ctx.state.address.addressIds)
    ctx.body = {
      totalCount,
      transactions: transactions.map(tx => ({
        id: tx.id.toString('hex'),
        ...tx.block ? {
          blockHash: tx.block.hash.toString('hex'),
          blockHeight: tx.block.height,
          timestamp: tx.block.timestamp
        } : {},
        amount: tx.amount.toString(),
        balance: tx.balance.toString()
      }))
    }
  }

  async qrc20BalanceHistory() {
    let {ctx} = this
    let {totalCount, transactions} = await ctx.service.qrc20.getQRC20BalanceHistory(ctx.state.address.hexAddresses, null)
    ctx.body = {
      totalCount,
      transactions: transactions.map(tx => ({
        id: tx.id.toString('hex'),
        blockHash: tx.block.hash.toString('hex'),
        blockHeight: tx.block.height,
        timestamp: tx.block.timestamp,
        tokens: tx.tokens.map(item => ({
          address: item.address,
          addressHex: item.addressHex.toString('hex'),
          name: item.name,
          symbol: item.symbol,
          decimals: item.decimals,
          amount: item.amount.toString(),
          balance: item.balance.toString()
        }))
      }))
    }
  }
}

module.exports = AddressController
