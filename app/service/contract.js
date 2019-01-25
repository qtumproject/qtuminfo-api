const {Service} = require('egg')

class ContractService extends Service {
  async getAllQRC20TokenBalances(hexAddresses) {
    if (hexAddresses.length === 0) {
      return []
    }

    const {Contract, Qrc20: QRC20, Qrc20Balance: QRC20Balance} = this.ctx.model
    const {in: $in} = this.app.Sequelize.Op

    let list = await QRC20.findAll({
      attributes: ['contractAddress', 'name', 'symbol', 'decimals'],
      include: [{
        model: Contract,
        as: 'contract',
        required: true,
        attributes: ['addressString'],
        include: [{
          model: QRC20Balance,
          as: 'qrc20Balances',
          required: true,
          where: {address: {[$in]: hexAddresses}},
          attributes: ['balance']
        }]
      }]
    })

    return list.map(item => ({
      qrc20: {
        address: item.contract.addressString,
        addressHex: item.contractAddress,
        name: item.name.toString(),
        symbol: item.symbol.toString(),
        decimals: item.decimals
      },
      balance: item.contract.qrc20Balances.map(({balance}) => balance).reduce((x, y) => x + y)
    })).filter(({balance}) => balance)
  }
}

module.exports = ContractService
