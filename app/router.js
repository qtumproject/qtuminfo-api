module.exports = app => {
  const {router, controller} = app
  router.get('/info', controller.info.index)
  router.get('/supply', controller.info.supply)
  router.get('/circulating-supply', controller.info.circulatingSupply)

  router.get('/blocks', controller.block.list)
  router.get('/block/:block', controller.block.block)
  router.get('/recent-blocks', controller.block.recent)

  router.get('/tx/:id', controller.transaction.transaction)
  router.get('/raw-tx/:id', controller.transaction.rawTransaction)
  router.get('/recent-txs', controller.transaction.recent)
}
