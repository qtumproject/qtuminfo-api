module.exports = app => {
  app.blockchainInfo = {
    tip: null,
    stakeWeight: null,
    feeRate: null
  }
  const namespace = app.io.of('/')

  app.messenger.on('egg-ready', () => {
    app.messenger.sendToAgent('blockchain-info')
  })

  app.messenger.on('update-richlist', async () => {
    let ctx = app.createAnonymousContext()
    await ctx.service.balance.updateRichList()
  })

  app.messenger.on('update-daily-transactions', async () => {
    let ctx = app.createAnonymousContext()
    let dailyTransactions = await ctx.service.statistics.getDailyTransactions()
    app.messenger.sendToAgent('daily-transactions', dailyTransactions)
  })

  app.messenger.on('update-block-interval', async () => {
    let ctx = app.createAnonymousContext()
    let blockInterval = await ctx.service.statistics.getBlockIntervalStatistics()
    app.messenger.sendToAgent('block-interval', blockInterval)
  })

  app.messenger.on('update-address-growth', async () => {
    let ctx = app.createAnonymousContext()
    let addressGrowth = await ctx.service.statistics.getAddressGrowth()
    app.messenger.sendToAgent('address-growth', addressGrowth)
  })

  app.messenger.on('update-stakeweight', async () => {
    let ctx = app.createAnonymousContext()
    let stakeWeight = await ctx.service.info.getStakeWeight()
    app.messenger.sendToAgent('stakeweight', stakeWeight)
  })

  app.messenger.on('update-feerate', async () => {
    let ctx = app.createAnonymousContext()
    let feeRate = await ctx.service.info.getFeeRate()
    app.messenger.sendToAgent('feerate', feeRate)
  })

  app.messenger.on('blockchain-info', info => {
    app.blockchainInfo = info
  })
  app.messenger.on('block-tip', tip => {
    app.blockchainInfo.tip = tip
  })
  app.messenger.on('new-block', block => {
    app.blockchainInfo.tip = block
  })
  app.messenger.on('reorg-to-block', block => {
    app.blockchainInfo.tip = block
  })
  app.messenger.on('stakeweight', stakeWeight => {
    app.blockchainInfo.stakeWeight = stakeWeight
  })
  app.messenger.on('feerate', feeRate => {
    app.blockchainInfo.feeRate = feeRate
  })

  app.messenger.on('socket/block-tip', async tip => {
    app.blockchainInfo.tip = tip
    namespace.emit('tip', tip)
    let ctx = app.createAnonymousContext()
    let transactions = (await ctx.service.block.getBlockTransactions(tip.height)).map(id => id.toString('hex'))
    for (let id of transactions) {
      namespace.to(`transaction/${id}`).emit('transaction/confirm', id)
    }
    let list = await ctx.service.block.getBlockAddressTransactions(tip.height)
    for (let i = 0; i < transactions.length; ++i) {
      for (let address of list[i] || []) {
        namespace.to(`address/${address}`).emit('address/transaction', {address, id: transactions[i]})
      }
    }
  })

  app.messenger.on('socket/reorg/block-tip', tip => {
    app.blockchainInfo.tip = tip
    namespace.emit('reorg', tip)
  })

  app.messenger.on('socket/mempool-transaction', async id => {
    id = Buffer.from(id)
    let ctx = app.createAnonymousContext()
    let transaction = await ctx.service.transaction.getTransaction(id)
    if (!transaction) {
      return
    }
    namespace.to('mempool').emit('mempool/transaction', await ctx.service.transaction.transformTransaction(transaction, {brief: true}))
    let addresses = await ctx.service.transaction.getMempoolTransactionAddresses(id)
    for (let address of addresses) {
      namespace.to(`address/${address}`).emit('address/transaction', {address, id: id.toString('hex')})
    }
  })

  app.messenger.on('socket/stakeweight', stakeWeight => {
    namespace.to('blockchain').emit('stakeweight', stakeWeight)
  })

  app.messenger.on('socket/feerate', feeRate => {
    namespace.to('blockchain').emit('feerate', feeRate)
  })
}
