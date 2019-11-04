const {Controller} = require('egg')

class AddressController extends Controller {
  async summary() {
    let {ctx} = this
    let {address} = ctx.state
    let summary = await ctx.service.address.getAddressSummary(address.addressIds, address.p2pkhAddressIds, address.rawAddresses)
    ctx.body = {
      balance: summary.balance.toString(),
      totalReceived: summary.totalReceived.toString(),
      totalSent: summary.totalSent.toString(),
      unconfirmed: summary.unconfirmed.toString(),
      staking: summary.staking.toString(),
      mature: summary.mature.toString(),
      qrc20Balances: summary.qrc20Balances.map(item => ({
        address: item.addressHex.toString('hex'),
        addressHex: item.addressHex.toString('hex'),
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
        balance: item.balance.toString(),
        unconfirmed: {
          received: item.unconfirmed.received.toString(),
          sent: item.unconfirmed.sent.toString()
        },
        isUnconfirmed: item.isUnconfirmed
      })),
      qrc721Balances: summary.qrc721Balances.map(item => ({
        address: item.addressHex.toString('hex'),
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

  async qrc20TokenBalance() {
    let {ctx} = this
    let {address, token} = ctx.state
    if (token.type !== 'qrc20') {
      ctx.body = {}
    }
    let {name, symbol, decimals, balance, unconfirmed} = await ctx.service.qrc20.getQRC20Balance(address.rawAddresses, token.contractAddress)
    ctx.body = {
      name,
      symbol,
      decimals,
      balance: balance.toString(),
      unconfirmed: {
        received: unconfirmed.received.toString(),
        sent: unconfirmed.sent.toString()
      }
    }
  }

  async transactions() {
    let {ctx} = this
    let {address} = ctx.state
    let {totalCount, transactions} = await ctx.service.address.getAddressTransactions(address.addressIds, address.rawAddresses)
    ctx.body = {
      totalCount,
      transactions: transactions.map(id => id.toString('hex'))
    }
  }

  async basicTransactions() {
    let {ctx} = this
    let {totalCount, transactions} = await ctx.service.address.getAddressBasicTransactions(ctx.state.address.addressIds)
    ctx.body = {
      totalCount,
      transactions: transactions.map(transaction => ({
        id: transaction.id.toString('hex'),
        blockHeight: transaction.blockHeight,
        blockHash: transaction.blockHash && transaction.blockHash.toString('hex'),
        timestamp: transaction.timestamp,
        confirmations: transaction.confirmations,
        amount: transaction.amount.toString(),
        inputValue: transaction.inputValue.toString(),
        outputValue: transaction.outputValue.toString(),
        refundValue: transaction.refundValue.toString(),
        fees: transaction.fees.toString(),
        type: transaction.type
      }))
    }
  }

  async contractTransactions() {
    let {ctx} = this
    let {address, contract} = ctx.state
    let {totalCount, transactions} = await ctx.service.address.getAddressContractTransactions(address.rawAddresses, contract)
    ctx.body = {
      totalCount,
      transactions: transactions.map(transaction => ({
        transactionId: transaction.transactionId.toString('hex'),
        outputIndex: transaction.outputIndex,
        blockHeight: transaction.blockHeight,
        blockHash: transaction.blockHash && transaction.blockHash.toString('hex'),
        timestamp: transaction.timestamp,
        confirmations: transaction.confirmations,
        type: transaction.scriptPubKey.type,
        gasLimit: transaction.scriptPubKey.gasLimit,
        gasPrice: transaction.scriptPubKey.gasPrice,
        byteCode: transaction.scriptPubKey.byteCode.toString('hex'),
        outputValue: transaction.value.toString(),
        outputAddress: transaction.outputAddressHex.toString('hex'),
        outputAddressHex: transaction.outputAddressHex.toString('hex'),
        sender: transaction.sender.toString(),
        gasUsed: transaction.gasUsed,
        contractAddress: transaction.contractAddressHex.toString('hex'),
        contractAddressHex: transaction.contractAddressHex.toString('hex'),
        excepted: transaction.excepted,
        exceptedMessage: transaction.exceptedMessage,
        evmLogs: transaction.evmLogs.map(log => ({
          address: log.addressHex.toString('hex'),
          addressHex: log.addressHex.toString('hex'),
          topics: log.topics.map(topic => topic.toString('hex')),
          data: log.data.toString('hex')
        }))
      }))
    }
  }

  async qrc20TokenTransactions() {
    let {ctx} = this
    let {address, token} = ctx.state
    let {totalCount, transactions} = await ctx.service.address.getAddressQRC20TokenTransactions(address.rawAddresses, token)
    ctx.body = {
      totalCount,
      transactions: transactions.map(transaction => ({
        transactionId: transaction.transactionId.toString('hex'),
        outputIndex: transaction.outputIndex,
        blockHeight: transaction.blockHeight,
        blockHash: transaction.blockHash.toString('hex'),
        timestamp: transaction.timestamp,
        confirmations: transaction.confirmations,
        from: transaction.from,
        fromHex: transaction.fromHex && transaction.fromHex.toString('hex'),
        to: transaction.to,
        toHex: transaction.toHex && transaction.toHex.toString('hex'),
        value: transaction.value.toString(),
        amount: transaction.amount.toString()
      }))
    }
  }

  async qrc20TokenMempoolTransactions() {
    let {ctx} = this
    let {address, token} = ctx.state
    let transactions = await ctx.service.address.getAddressQRC20TokenMempoolTransactions(address.rawAddresses, token)
    ctx.body = transactions.map(transaction => ({
      transactionId: transaction.transactionId.toString('hex'),
      outputIndex: transaction.outputIndex,
      from: transaction.from,
      fromHex: transaction.fromHex && transaction.fromHex.toString('hex'),
      to: transaction.to,
      toHex: transaction.toHex && transaction.toHex.toString('hex'),
      value: transaction.value.toString(),
      amount: transaction.amount.toString()
    }))
  }

  async utxo() {
    let {ctx} = this
    let utxos = await ctx.service.address.getUTXO(ctx.state.address.addressIds)
    ctx.body = utxos.map(utxo => ({
      transactionId: utxo.transactionId.toString('hex'),
      outputIndex: utxo.outputIndex,
      scriptPubKey: utxo.scriptPubKey.toString('hex'),
      address: utxo.address,
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
    const {Address} = this.app.qtuminfo.lib
    let {ctx} = this
    let tokenAddress = null
    if (ctx.state.token) {
      if (ctx.state.token.type === 'qrc20') {
        tokenAddress = ctx.state.token.contractAddress
      } else {
        ctx.body = {
          totalCount: 0,
          transactions: []
        }
        return
      }
    }
    let hexAddresses = ctx.state.address.rawAddresses
      .filter(address => address.type === Address.PAY_TO_PUBLIC_KEY_HASH)
      .map(address => address.data)
    let {totalCount, transactions} = await ctx.service.qrc20.getQRC20BalanceHistory(hexAddresses, tokenAddress)
    ctx.body = {
      totalCount,
      transactions: transactions.map(tx => ({
        id: tx.id.toString('hex'),
        blockHash: tx.block.hash.toString('hex'),
        blockHeight: tx.block.height,
        timestamp: tx.block.timestamp,
        tokens: tx.tokens.map(item => ({
          address: item.addressHex.toString('hex'),
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
