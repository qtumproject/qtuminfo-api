module.exports = app => {
  const {router, controller} = app
  router.get('/info', controller.info.index)
  router.get('/supply', controller.info.supply)
  router.get('/circulating-supply', controller.info.circulatingSupply)
}
