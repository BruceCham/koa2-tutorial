# koa2-tutorial

基于koa2定制开发规范及中间件

# Node.js log 中间件指南

> 在一个真实的项目中，开发只是整个投入的一小部分，版本迭代和后期维护占了极其重要的部分。项目上线运转起来之后，我们如何知道项目运转的状态呢？如何发现线上存在的问题，及时进行补救呢？记录日志就是解决困扰的关键方案。正如我们每天写日记一样，不仅能够记录每天都做了什么，便于日后回顾，也可以将做错的事情记录，进行自我反省。完善的日志记录不仅能够还原问题场景，还有助于统计访问数据，分析用户行为。

## 记录日志的目的 

* 显示程序运行状态
* 帮助开发者排除问题故障
* 结合专业的日志分析工具（如 ELK ）给出预警

## 关于编写 log 中间件的预备知识

### log4js

本项目中的 log 中间件是基于 log4js 2.x 的封装，[Log4js](https://github.com/nomiddlename/log4js-node)是 Node.js 中记录日志成熟的第三方模块，下文也会根据中间件的使用介绍一些 log4js 的使用方法。	

### 日志分类

日志可以大体上分为访问日志和应用日志。访问日志一般记录客户端对项目的访问，主要是 http 请求。这些数据属于运营数据，也可以反过来帮助改进和提升网站；应用日志是项目中需要特殊标记和记录的位置打印的日志，包括出现异常的情况，方便开发人员查询项目的运行状态和定位 bug ，应用日志包含了`debug`，`info`，`warn`，`error`等级别的日志。
	
### 日志等级

log4js 中的日志输出可分为如下7个等级：

![LOG_LEVEL.957353bf.png](http://upload-images.jianshu.io/upload_images/3860275-7e8db4f9d1aed430.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

在应用中按照级别记录了日志之后，可以按照指定级别输出高于指定级别的日志。

### 日志切割

当我们的项目在线上环境稳定运行后，访问量会越来越大，日志文件也会越来越大。日益增大的文件对查看和跟踪问题带来了诸多不便，同时增大了服务器的压力。虽然可以按照类型将日志分为两个文件，但并不会有太大的改善。所以我们按照日期将日志文件进行分割。比如：今天将日志输出到 task-2017-10-16.log 文件，明天会输出到 task-2017-10-17.log 文件。减小单个文件的大小不仅方便开发人员按照日期排查问题，还方便对日志文件进行迁移。


## 如何实现

### 初始化

log 中间件的核心内容

```
   
// 引入工具模块 
const log4js = require('log4js');
const path = require("path");
const client = require("./access.js");

// ALL OFF 这两个等级并不会直接在业务代码中使用
const methods = ["trace", "debug", "info", "warn", "error", "fatal", "mark"];
	
// 定义传入参数的默认值
const baseInfo = {
  appLogLevel: 'debug',
  dir: 'logs',
  env: 'local',
  projectName: 'default',
  serverIp: '0.0.0.0'
}

```

按照 log4js 2.x 文档中定义的日志文件名的生成规则

```
const appenders = {
  task: {
    type: 'dateFile',  // 日志类型
    filename: `${dir}/task`, // 输出文件名
    pattern: '-yyyy-MM-dd.log',  //后缀
    alwaysIncludePattern: true  // 是否总是有后缀名
  }
};
```

*  type：'dataFile' -- 按照日期的格式分割日志
*  filename -- 将自定义的输出目录与定义的文件名进行拼接
*  pattern -- 按照日期的格式每天新建一个日志文件

  
判断若是开发环境，将日志同时打印到终端，方便开发者查看。


```
if (env === "dev" || env === "local" || env === "development"){
   appenders.out = {
     type: "console"
   }
}
```

定义log4js的初始化参数

```
const config = {
  appenders,
  categories: {
    default: {
	   appenders: Object.keys(appenders),
	   level: appLogLevel
    }
  }
};
```



### 打印『访问日志 』：

在每次请求进入的时候记录开始时间，执行完毕记录下结束时间，从而记录访问的响应时间，与上下文中的客户端信息一并记录在访问日志中。

```
// 访问日志
const accessLogger = log4js.getLogger("access");

return async (ctx, next) => {
  log4js.configure(config);
  const start = Date.now();

  const {
    method,
    url,
    host,
    headers
  } = ctx.request;
  const access = {
    method,                             // 请求方式
    url,                                // 请求url
    host,                               // 请求方域名
    message,                            // 打印的错误信息
    referer: headers['referer'],        // 请求的源地址
    userAgent: headers['user-agent']    // 客户端信息采集
  };
  
  await next()
    
  // 记录URL以及页面执行时间
  const delta = Date.now() - start;
    
  accessLogger.info(JSON.stringify(Object.assign({
   responseTime: delta
  }, access));
};
```

### 打印『应用日志 』：

初始化 logger 函数，并返回异步函数。调用 log 函数打印日志时，循环 logger 中的方法将高于自定义级别的方法挂载到上下文上，并将低于自定义级别的方法赋值空函数。此外，不挂载到上下文上，暴露 logger 方法并在需要使用的地方按照模块化引入也是一种不错的选择。

```

// 应用日志
const performanceLogger = log4js.getLogger("performance");

// 将 log 挂在上下文上
return async (ctx, next) => {
  
  log4js.configure(config);
 
  // ALL OFF 这两个等级并不会直接在业务代码中使用
  const methods = ["trace", "debug", "info", "warn", "error", "fatal", "mark"];

  const currentLevel = methods.findIndex(ele => ele === appLogLevel)
    
  // level 以上级别的日志方法
  methods.forEach((method, i) => {
    if (i >= currentLevel) {
      contextLogger[method] = (message) => {
        logger[method](message)
      }
    } else {
      contextLogger[method] = () => {}
    }
  });
  ctx.log = contextLogger;
  await next()
};

```

### 错误处理

最后，调用 logger 主函数时再封装一层错误处理，将错误信息抛出，让全局监听的错误处理函数进行处理。

```
const convert = require("koa-convert");
const logger = require("./logger");

module.exports = (options) => {

  const loggerMiddleware = convert(logger(options));

  return (ctx, next) => {

    return loggerMiddleware(ctx, next)
    .catch((e) => {
        if (ctx.status < 500) {
            ctx.status = 500;
        }
        ctx.log.error(e.stack);
        ctx.state.logged = true;
        ctx.throw(e); 
    });
  };
}

```

### 调用中间件

log中间件的调用。将初始化 log 中间件的过程置于 http-error 中间件之后，便可以接收到除 http-error 中间件以外的所有中间件的日志记录，并使用全局监听进行错误处理。此外，使用 http-error 中间件对 log 中产生的 http 相关的错误进行捕捉和展示。

```
// 引入log中间件
const miLog = require('./mi-log')

module.exports = (app) => {
	
  ...http-error中间件
  
  app.use(miLog({
	 env: app.env,		// 当前环境变量
	 projectName: 'node-tutorial', // 项目名称
	 appLogLevel: 'debug',	// 显示log级别
	 dir: 'logs',			// 自定义输出log文件夹
	 serverIp: ip.address()  // 服务器IP
  }));
	
  ...其他中间件
	
}
```

传入参数：

*	env -- 用于设置模块内的环境
*	projectName -- 用于记录项目名称，便于追踪
*	appLogLevel -- 定义需要打印的日志级别
*	dir -- 根据开发者需求定义文件夹名称
*	serverIp -- 记录日志存在的服务器


## 总结

本节为大家介绍了写 log 中间件的具体步骤。然而作为例子还有很多不足，比如性能问题：写日志其实就是磁盘I/O过程，访问量大时，频繁写磁盘的操作会拖慢服务器；没有与监控系统紧密结合等，比如如何结合日志分析工具给出预警，再比如：如何建立自动排查和跟踪机制以达到更高效地发现和跟踪问题的目的，这些还需要我们继续去探索。
log4js 中还有很多知识点，可以参考[官方文档](http://logging.apache.org/log4j/2.x/)，学习更多强大功能。
 
 









