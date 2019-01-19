const {Controller} = require('egg')

class HomeController extends Controller {
  async index() {
    this.ctx.body = '<h1>Hello, world!</h1>'
  }
}

module.exports = HomeController
