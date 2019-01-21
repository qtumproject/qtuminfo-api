const path = require('path')
const _require = require('esm')(module)

module.exports = {
  get qtuminfo() {
    return {
      lib: _require(path.resolve(this.config.qtuminfo.path, 'packages', 'qtuminfo-lib')),
      rpc: _require(path.resolve(this.config.qtuminfo.path, 'packages', 'qtuminfo-rpc')).default
    }
  }
}
