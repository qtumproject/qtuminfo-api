const {Controller} = require('egg')

class InfoController extends Controller {
  async index() {
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
