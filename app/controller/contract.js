const {Controller} = require('egg')

class ContractController extends Controller {
  async summary() {
    const {ctx} = this
    let summary = await ctx.service.contract.getContractSummary(
      ctx.state.contract.contractAddress, ctx.state.contract.addressIds
    )
    ctx.body = {
      address: summary.address,
      addressHex: summary.addressHex.toString('hex'),
      vm: summary.vm,
      type: summary.type,
      owner: summary.owner,
      createTxId: summary.createTxId && summary.createTxId.toString('hex'),
      createHeight: summary.createHeight,
      ...summary.type === 'qrc20' ? {
        qrc20: {
          name: summary.qrc20.name,
          symbol: summary.qrc20.symbol,
          decimals: summary.qrc20.decimals,
          totalSupply: summary.qrc20.totalSupply.toString(),
          version: summary.qrc20.version,
          holders: summary.qrc20.holders
        }
      } : {},
      ...summary.type === 'qrc721' ? {
        qrc721: {
          name: summary.qrc721.name,
          symbol: summary.qrc721.symbol,
          totalSupply: summary.qrc721.totalSupply
        }
      } : {},
      balance: summary.balance.toString(),
      totalReceived: summary.totalReceived.toString(),
      totalSent: summary.totalSent.toString(),
      unconfirmed: summary.unconfirmed.toString(),
      qrc20Balances: summary.qrc20Balances.map(item => ({
        address: item.address,
        addressHex: item.addressHex.toString('hex'),
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
        balance: item.balance.toString()
      })),
      transactionCount: summary.transactionCount
    }
  }

  async transactions() {
    let {ctx} = this
    let {totalCount, transactions} = await ctx.service.contract.getContractTransactions(
      ctx.state.contract.contractAddress, ctx.state.contract.addressIds
    )
    ctx.body = {
      totalCount,
      transactions: transactions.map(id => id.toString('hex'))
    }
  }

  async balanceHistory() {
    let {ctx} = this
    let {totalCount, transactions} = await ctx.service.balance.getBalanceHistory(ctx.state.contract.addressIds, {nonZero: true})
    ctx.body = {
      totalCount,
      transactions: transactions.map(tx => ({
        id: tx.id.toString('hex'),
        ...tx.block ? {
          block: {
            hash: tx.block.hash.toString('hex'),
            height: tx.block.height,
            timestamp: tx.block.timestamp
          }
        } : {},
        amount: tx.amount.toString(),
        balance: tx.balance.toString()
      }))
    }
  }

  async qrc20BalanceHistory() {
    let {ctx} = this
    let {totalCount, transactions} = await ctx.service.qrc20.getQRC20BalanceHistory([ctx.state.contract.contractAddress], null)
    ctx.body = {
      totalCount,
      transactions: transactions.map(tx => ({
        id: tx.id.toString('hex'),
        ...tx.block ? {
          block: {
            hash: tx.block.hash.toString('hex'),
            height: tx.block.height,
            timestamp: tx.block.timestamp
          }
        } : {},
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

module.exports = ContractController
