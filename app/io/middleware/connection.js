module.exports = () => async function connection(ctx, next) {
  const {app, socket} = ctx
  let interval = setInterval(() => {
    if (app.blockchainInfo.tip) {
      socket.emit('block-height', app.blockchainInfo.tip.height)
      clearInterval(interval)
    }
  }, 0)
  await next()
}
