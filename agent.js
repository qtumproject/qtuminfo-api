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
      agent.messenger.sendRandom('get-stakeweight')
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

  function fetchFeeRate() {
    let client = new agent.qtuminfo.rpc(agent.config.qtuminfo.rpc)
    client.estimatesmartfee(10).then(info => {
      feeRate = info.feerate
    }, () => {})
  }

  let lastRichlistUpdateTipHash = Buffer.alloc(0)
  function updateRichList() {
    if (tip && Buffer.compare(lastRichlistUpdateTipHash, tip.hash) !== 0) {
      agent.messenger.sendRandom('update-richlist')
      lastRichlistUpdateTipHash = tip.hash
    }
  }

  setInterval(fetchFeeRate, 60 * 1000).unref()
  setInterval(updateRichList, 2 * 60 * 1000).unref()

  agent.messenger.on('blockchain-info', () => {
    agent.messenger.sendToApp('blockchain-info', {tip, stakeWeight, feeRate})
  })
  agent.messenger.on('stakeweight', result => {
    stakeWeight = result
  })
  agent.messenger.on('egg-ready', () => {
    let interval = setInterval(() => {
      if (tip && stakeWeight && feeRate) {
        agent.messenger.sendToApp('blockchain-info', {tip, stakeWeight, feeRate})
        clearInterval(interval)
      }
    }, 0)
    agent.messenger.sendRandom('get-stakeweight')
    fetchFeeRate()
  })
}
