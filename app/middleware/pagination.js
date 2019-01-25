module.exports = () => async function pagination(ctx, next) {
  if (!['GET', 'POST'].includes(ctx.method)) {
    return await next()
  }
  let object = {GET: ctx.query, POST: ctx.request.body}[ctx.method]
  ctx.state.pagination = {}
  if ('pageSize' in object) {
    ctx.state.pagination.pageSize = Number.parseInt(object.pageSize)
    if (!(ctx.state.pagination.pageSize > 0)) {
      ctx.throw(400)
    }
  }
  if ('page' in object) {
    ctx.state.pagination.pageIndex = Number.parseInt(object.page)
    if (!(ctx.state.pagination.pageIndex >= 0)) {
      ctx.throw(400)
    }
  }
  if ('reversed' in object) {
    ctx.state.pagination.reversed = ![false, 'false', 0, '0'].includes(object.reversed)
  }
  await next()
}
