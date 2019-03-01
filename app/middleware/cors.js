module.exports = () => async function transaction(ctx, next) {
  ctx.set('Access-Control-Allow-Origin', '*')
  await next()
}
