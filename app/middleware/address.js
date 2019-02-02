module.exports = () => async function address(ctx, next) {
  if (!ctx.params.address) {
    ctx.throw(404)
  }
  const {Address: RawAddress} = ctx.app.qtuminfo.lib
  const chain = ctx.app.chain
  const {Address} = ctx.model
  const {in: $in} = ctx.app.Sequelize.Op

  let addresses = ctx.params.address.split(',')
  let hexAddresses = []
  for (let address of addresses) {
    try {
      let rawAddress = RawAddress.fromString(address, chain)
      if (rawAddress.type === RawAddress.PAY_TO_PUBLIC_KEY_HASH) {
        hexAddresses.push(rawAddress.data)
      }
    } catch (err) {
      ctx.throw(400)
    }
  }
  let result = await Address.findAll({
    where: {string: {[$in]: addresses}},
    attributes: ['_id', 'type', 'data'],
    transaction: ctx.state.transaction
  })
  ctx.state.address = {
    addressIds: result.map(address => address._id),
    p2pkhAddressIds: result.filter(address => address.type === RawAddress.PAY_TO_PUBLIC_KEY_HASH).map(address => address._id),
    hexAddresses
  }
  await next()
}
