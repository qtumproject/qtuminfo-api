const {Controller} = require('egg')

class InfoController extends Controller {
  async index() {
    this.ctx.body = await this.ctx.service.info.getInfo()
  }

  async supply() {
    this.ctx.body = this.ctx.service.info.getTotalSupply()
  }

  async totalMaxSupply() {
    this.ctx.body = this.ctx.service.info.getTotalMaxSupply()
  }

  async circulatingSupply() {
    this.ctx.body = this.ctx.service.info.getCirculatingSupply()
  }

  async feeRates() {
    this.ctx.body = JSON.parse(await this.app.redis.hget(this.app.name, 'feerate')).filter(item => [2, 4, 6, 12, 24].includes(item.blocks))
  }
}

module.exports = InfoController
