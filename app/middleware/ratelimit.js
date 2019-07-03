const ratelimit = require('koa-ratelimit')

module.exports = (options, app) => ratelimit({
  ...options,
  id: ctx => `${app.name}-${ctx.get('x-forwarded-for') || ctx.ip}`,
  whitelist: options.whitelist && options.whitelist.includes(ctx => ctx.get('application-id'))
})
