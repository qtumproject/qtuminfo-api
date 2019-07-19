const {Subscription} = require('egg')

class UpdateFeerateSubscription extends Subscription {
  static get schedule() {
    return {
      interval: '1m',
      type: 'worker'
    }
  }

  async subscribe() {
    let feeRate = await this.ctx.service.info.getFeeRates()
    if (feeRate) {
      await this.app.redis.hset(this.app.name, 'feerate', JSON.stringify(feeRate))
      this.app.io.of('/').to('blockchain')
        .emit('feerate', feeRate.find(item => item.blocks === 10).feeRate)
    }
  }
}

module.exports = UpdateFeerateSubscription
