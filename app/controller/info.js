const {Controller} = require('egg')

class InfoController extends Controller {
  async index() {
    console.log(await this.ctx.service.block.block(100000))
    this.ctx.body = this.ctx.service.info.getInfo()
  }

  async supply() {
    this.ctx.body = this.ctx.service.info.getInfo().supply
  }

  async circulatingSupply() {
    this.ctx.body = this.ctx.service.info.getInfo().circulatingSupply
  }
}

module.exports = InfoController
