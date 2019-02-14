module.exports = () => async function connection(ctx, next) {
  const {app, socket} = ctx
  socket.emit('block-height', app.blockchainInfo.tip.height)
  await next()
}
