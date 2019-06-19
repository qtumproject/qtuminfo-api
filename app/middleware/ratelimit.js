const ratelimit = require('koa-ratelimit')

module.exports = options => ratelimit({
  ...options,
  id: ctx => options.idPrefix + (ctx.get('x-forwarded-for') || ctx.ip),
  whitelist: options.whitelist && options.whitelist.includes(ctx => ctx.get('application-id'))
})
