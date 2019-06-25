const path = require('path')

const CHAIN = Symbol('qtum.chain')

module.exports = {
  get chain() {
    this[CHAIN] = this[CHAIN] || this.qtuminfo.lib.Chain.get(this.config.qtum.chain)
    return this[CHAIN]
  },
  get qtuminfo() {
    return {
      lib: require(path.resolve(this.config.qtuminfo.path, 'lib')),
      rpc: require(path.resolve(this.config.qtuminfo.path, 'rpc'))
    }
  }
}
