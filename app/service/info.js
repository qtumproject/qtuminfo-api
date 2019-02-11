const {Service} = require('egg')

class InfoService extends Service {
  getInfo() {
    let info = this.app.blockchainInfo
    return {
      height: info.tip.height,
      supply: this.getTotalSupply(info.tip.height),
      circulatingSupply: this.getCirculatingSupply(info.tip.height),
      netStakeWeight: Math.round(info.stakeWeight),
      feeRate: info.feeRate
    }
  }

  getTotalSupply(height) {
    if (height <= 5000) {
      return height * 20000
    } else {
      let supply = 1e8
      let reward = 4
      let interval = 985500
      let stakeHeight = height - 5000
      let halvings = 0
      while (halvings < 7 && stakeHeight > interval) {
        supply += interval * reward / (1 << halvings++)
        stakeHeight -= interval
      }
      supply += stakeHeight * reward / (1 << halvings)
      return supply
    }
  }

  getCirculatingSupply(height) {
    let totalSupply = this.getTotalSupply(height)
    if (this.app.config.qtum.chain === 'mainnet') {
      return totalSupply - 12e6
    } else {
      return totalSupply
    }
  }

  async getStakeWeight() {
    const {Header} = this.ctx.model
    const {gte: $gte} = this.app.Sequelize.Op
    let height = await Header.aggregate('height', 'max', {transaction: this.ctx.state.transaction})
    let list = await Header.findAll({
      where: {height: {[$gte]: height - 72}},
      attributes: ['timestamp', 'bits'],
      order: [['height', 'ASC']],
      transaction: this.ctx.state.transaction
    })
    let interval = list[list.length - 1].timestamp - list[0].timestamp
    let sum = list.slice(1)
      .map(x => x.difficulty)
      .reduce((x, y) => x + y)
    return sum * 2 ** 32 * 16 / interval
  }
}

module.exports = InfoService
