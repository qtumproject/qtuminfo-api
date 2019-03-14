module.exports = () => async function contract(ctx, next) {
  ctx.assert(ctx.params.contract, 404)
  const {Address: RawAddress} = ctx.app.qtuminfo.lib
  const chain = ctx.app.chain
  const {Address, Contract} = ctx.model
  const {in: $in} = ctx.app.Sequelize.Op

  let contract = {}
  let rawAddress
  try {
    rawAddress = RawAddress.fromString(ctx.params.contract, chain)
  } catch (err) {
    ctx.throw(400)
  }
  let filter
  if (rawAddress.type === RawAddress.CONTRACT) {
    filter = {address: Buffer.from(ctx.params.contract, 'hex')}
  } else if (rawAddress.type === RawAddress.EVM_CONTRACT) {
    filter = {addressString: ctx.params.contract}
  } else {
    ctx.throw(400)
  }
  let contractResult = await Contract.findOne({
    where: filter,
    attributes: ['address', 'addressString', 'vm', 'type'],
    transaction: ctx.state.transaction
  })
  ctx.assert(contractResult, 404)
  contract.contractAddress = contractResult.address
  contract.address = contractResult.addressString
  contract.vm = contractResult.vm
  contract.type = contractResult.type

  let addressList = await Address.findAll({
    where: {
      type: {[$in]: ['contract', 'evm_contract']},
      data: contract.contractAddress
    },
    attributes: ['_id'],
    transaction: ctx.state.transaction
  })
  contract.addressIds = addressList.map(address => address._id)
  ctx.state.contract = contract
  await next()
}
