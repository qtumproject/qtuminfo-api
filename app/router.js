module.exports = app => {
  const {router, controller, io, middleware} = app
  const addressMiddleware = middleware.address()
  const contractMiddleware = middleware.contract()
  const paginationMiddleware = middleware.pagination()

  router.get('/info', controller.info.index)
  router.get('/supply', controller.info.supply)
  router.get('/circulating-supply', controller.info.circulatingSupply)

  router.get('/blocks', controller.block.list)
  router.get('/block/:block', controller.block.block)
  router.get('/raw-block/:block', controller.block.rawBlock)
  router.get('/recent-blocks', controller.block.recent)

  router.get('/tx/:id', controller.transaction.transaction)
  router.get('/txs/:ids', controller.transaction.transactions)
  router.get('/raw-tx/:id', controller.transaction.rawTransaction)
  router.get('/recent-txs', controller.transaction.recent)
  router.post('/tx/send', controller.transaction.send)

  router.get(
    '/address/:address',
    addressMiddleware,
    controller.address.summary
  )
  router.get(
    '/address/:address/balance',
    addressMiddleware,
    controller.address.balance
  )
  router.get(
    '/address/:address/balance/total-received',
    addressMiddleware,
    controller.address.totalReceived
  )
  router.get(
    '/address/:address/balance/total-sent',
    addressMiddleware,
    controller.address.totalSent
  )
  router.get(
    '/address/:address/balance/unconfirmed',
    addressMiddleware,
    controller.address.unconfirmedBalance
  )
  router.get(
    '/address/:address/balance/staking',
    addressMiddleware,
    controller.address.stakingBalance
  )
  router.get(
    '/address/:address/balance/mature',
    addressMiddleware,
    controller.address.matureBalance
  )
  router.get(
    '/address/:address/txs',
    addressMiddleware, paginationMiddleware,
    controller.address.transactions
  )
  router.get(
    '/address/:address/utxo',
    addressMiddleware,
    controller.address.utxo
  )
  router.get(
    '/address/:address/balance-history',
    addressMiddleware, paginationMiddleware,
    controller.address.balanceHistory
  )
  router.get(
    '/address/:address/qrc20-balance-history',
    addressMiddleware, paginationMiddleware,
    controller.address.qrc20BalanceHistory
  )

  router.get(
    '/contract/:contract',
    contractMiddleware,
    controller.contract.summary
  )
  router.get(
    '/contract/:contract/txs',
    contractMiddleware, paginationMiddleware,
    controller.contract.transactions
  )
  router.get(
    '/contract/:contract/balance-history',
    contractMiddleware, paginationMiddleware,
    controller.contract.balanceHistory
  )
  router.get(
    '/contract/:contract/qrc20-balance-history',
    contractMiddleware, paginationMiddleware,
    controller.contract.qrc20BalanceHistory
  )
  router.get(
    '/qrc20',
    paginationMiddleware,
    controller.qrc20.list
  )
  router.get(
    '/qrc20/:contract/rich-list',
    contractMiddleware, paginationMiddleware,
    controller.qrc20.richList
  )

  router.get(`/search`, controller.misc.classify)
  router.get(
    '/misc/rich-list',
    paginationMiddleware,
    controller.misc.richList
  )
  router.get(
    '/misc/biggest-miners',
    paginationMiddleware,
    controller.misc.biggestMiners
  )

  router.get('/stats/daily-transactions', controller.statistics.dailyTransactions)
  router.get('/stats/block-interval', controller.statistics.blockInterval)
  router.get('/stats/address-growth', controller.statistics.addressGrowth)

  io.route('subscribe', io.controller.default.subscribe)
  io.route('unsubscribe', io.controller.default.unsubscribe)
}
