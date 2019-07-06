const ratelimit = require('koa-ratelimit')

module.exports = (options, app) => ratelimit({
  ...options,
  id: ctx => `${app.name}-${ctx.get('cf-conecting-ip') || ctx.get('x-forwarded-for') || ctx.ip}`,
  whitelist: options.whitelist && (
    ctx => options.whitelist.includes(ctx.get('cf-connecting-ip') || ctx.get('x-forwarded-for') || ctx.ip)
      || options.whitelist.includes(ctx.get('application-id'))
  )
})
