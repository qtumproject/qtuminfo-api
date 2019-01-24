const {Service} = require('egg')

class AddressService extends Service {
  async getAddressParams(string) {
    if (!string) {
      return null
    }
    const {Address: RawAddress} = this.app.qtuminfo.lib
    const chain = this.app.chain
    const {Address} = this.ctx.model
    const {in: $in} = this.app.Sequelize.Op

    let addresses = string.split(',')
    let hexAddresses = []
    for (let address of addresses) {
      try {
        let rawAddress = RawAddress.fromString(address, chain)
        if (rawAddress.type === RawAddress.PAY_TO_PUBLIC_KEY_HASH) {
          hexAddresses.push(rawAddress.data)
        }
      } catch (err) {
        return null
      }
    }
    let result = await Address.findAll({
      where: {string: {[$in]: addresses}},
      attributes: ['_id', 'type', 'data']
    })
    return {
      addressIds: result.map(address => address._id),
      p2pkhAddressIds: result.filter(address => address.type === RawAddress.PAY_TO_PUBLIC_KEY_HASH).map(address => address._id),
      hexAddresses
    }
  }
}

module.exports = AddressService
