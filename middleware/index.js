const path = require("path")
const ip = require("ip")

// const miLog = require('./mi-log')

module.exports = (app) => {

  
  /**
   * 记录URL以及页面执行时间
   */
  app.use(async (ctx, next) => {
    let start = Date.now()
    await next()
    let delta = Date.now() - start
    ctx.log && ctx.log.info({
      responseTime: delta
    })
  })

  /**
   * 初始化log
   */
  // app.use(miLog(app.env, {
  //   env: app.env,
  //   projectName: 'node-tutorial',
  //   appLogLevel: 'debug',
  //   dir: 'logs',
  //   serverIp: ip.address()
  // }));

}