module.exports = () => async function transaction(ctx, next) {
  const db = ctx.model
  ctx.state.transaction = await db.transaction()
  try {
    await next()
    await ctx.state.transaction.commit()
  } catch (err) {
    await ctx.state.transaction.rollback()
    throw err
  }
}
