module.exports = app => {
  app.blockchainInfo = {
    tip: null,
    stakeWeight: null,
    feeRate: null
  }
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
  app.messenger.on('egg-ready', () => {
    app.messenger.sendToAgent('blockchain-info')
  })

  app.messenger.on('update-richlist', async () => {
    let ctx = app.createAnonymousContext()
    await ctx.service.balance.updateRichList()
  })

  app.messenger.on('get-stakeweight', async () => {
    let ctx = app.createAnonymousContext()
    let stakeWeight = await ctx.service.info.getStakeWeight()
    app.messenger.sendToAgent('stakeweight', stakeWeight)
  })
}
