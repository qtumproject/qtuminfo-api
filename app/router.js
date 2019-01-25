module.exports = app => {
  const {router, controller} = app
  router.get('/info', controller.info.index)
  router.get('/supply', controller.info.supply)
  router.get('/circulating-supply', controller.info.circulatingSupply)

  router.get('/blocks', controller.block.list)
  router.get('/block/:block', controller.block.block)
  router.get('/raw-block/:block', controller.block.rawBlock)
  router.get('/recent-blocks', controller.block.recent)

  router.get('/tx/:id', controller.transaction.transaction)
  router.get('/raw-tx/:id', controller.transaction.rawTransaction)
  router.get('/recent-txs', controller.transaction.recent)

  router.get('/address/:address', controller.address.summary)
  router.get('/address/:address/balance', controller.address.balance)
  router.get('/address/:address/balance/total-received', controller.address.totalReceived)
  router.get('/address/:address/balance/total-sent', controller.address.totalSent)
  router.get('/address/:address/balance/unconfirmed', controller.address.unconfirmedBalance)
  router.get('/address/:address/balance/staking', controller.address.stakingBalance)
  router.get('/address/:address/balance/mature', controller.address.matureBalance)
  router.get('/address/:address/utxo', controller.address.utxo)
}
