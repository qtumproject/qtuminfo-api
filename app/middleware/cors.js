module.exports = options => async function transaction(ctx, next) {
  for (let origin of options.origins) {
    ctx.set('Access-Control-Allow-Origin', origin)
  }
  await next()
}
