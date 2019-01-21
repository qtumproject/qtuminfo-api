const SocketClient = require('socket.io-client')

module.exports = function(agent) {
  let tip = null
  let stakeWeight = null
  let feeRate = null

  agent.messenger.on('egg-ready', () => {
    let io = SocketClient(`http://localhost:${agent.config.qtuminfo.port}`)
    io.on('tip', newTip => {
      tip = newTip
      agent.messenger.sendToApp('block-tip', tip)
    })
    io.on('block', block => {
      tip = block
      agent.messenger.sendToApp('new-block', block)
    })
    io.on('reorg', block => {
      tip = block
      agent.messenger.sendToApp('reorg-to-block', block)
    })
    io.on('mempool-transaction', id => {
      if (id) {
        agent.messenger.sendToApp('mempool-transaction', id)
      }
    })
  })

  function fetchStakeWeight() {
    let client = new agent.qtuminfo.rpc(agent.config.qtuminfo.rpc)
    client.getstakinginfo().then(info => {
      stakeWeight = info.netstakeweight
    }, () => {})
  }
  fetchStakeWeight()
  setInterval(fetchStakeWeight, 60 * 1000).unref()

  function fetchFeeRate() {
    let client = new agent.qtuminfo.rpc(agent.config.qtuminfo.rpc)
    client.estimatesmartfee(10).then(info => {
      feeRate = info.feerate
    }, () => {})
  }
  fetchFeeRate()
  setInterval(fetchFeeRate, 60 * 1000).unref()

  agent.messenger.on('blockchain-info', () => {
    agent.messenger.sendToApp('blockchain-info', {tip, stakeWeight, feeRate})
  })
  agent.messenger.on('egg-ready', () => {
    agent.messenger.sendToApp('blockchain-info', {tip, stakeWeight, feeRate})
  })
}
