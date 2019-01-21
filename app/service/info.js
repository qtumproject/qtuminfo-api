const {Service} = require('egg')

class InfoService extends Service {
  getInfo() {
    let info = this.app.blockchainInfo
    return {
      height: info.tip.height,
      supply: this.getTotalSupply(info.tip.height),
      circulatingSupply: this.getCirculatingSupply(info.tip.height),
      netStakeWeight: info.stakeWeight,
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
}

module.exports = InfoService
