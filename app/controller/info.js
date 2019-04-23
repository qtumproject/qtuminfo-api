const {Controller} = require('egg')

class InfoController extends Controller {
  async index() {
    this.ctx.body = this.ctx.service.info.getInfo()
  }

  async supply() {
    this.ctx.body = this.ctx.service.info.getInfo().supply
  }

  async totalMaxSupply() {
    this.ctx.body = this.ctx.service.info.getTotalMaxSupply()
  }

  async circulatingSupply() {
    this.ctx.body = this.ctx.service.info.getInfo().circulatingSupply
  }
}

module.exports = InfoController
