const Path = require('path');

/**
 * 模块化导出
 * 
 * @param {any} opts 
 * @returns 
 */
module.exports = (opts) => {
    opts = opts || {};
    const env = opts.env || process.env.NODE_ENV || 'development';
    const folder = opts.errorPageFolder; // 使用自定义文件夹
    const templatePath = Path.resolve(__dirname, './error.html'); // 默认模板
    let fileName = 'other';
    /**
     * 返回一个async函数
     * 
     * @param {any} ctx 
     * @param {any} next 
     */
    return async (ctx, next) => {
        try {
            await next();
            /*如果没有更改过response的status，则koa默认的status是404*/
            if (ctx.response.status === 404 && !ctx.response.body) ctx.throw(404);
        } catch (e) {
            let status = parseInt(e.status);
            const message = e.message;
            if (status >= 400) {
                switch (status) {
                    case 400:
                    case 404:
                    case 500:
                        fileName = status;
                        break;
                    default:
                        fileName = 'other';
                }
            } else {
                status = 500;
                fileName = status;
            }
            // 确定最终的filePath
            const filePath = folder ? Path.join(folder, `${fileName}.html`) : templatePath;
            try {
                const data = await nunjucks.render(filePath, {
                    env: env,
                    status: e.status || e.message,
                    error: e.message,
                    stack: e.stack
                });
                ctx.status = status;
                ctx.body = data;
            } catch (e) {
                ctx.throw(500, '错误页渲染失败');
            }
        }
    }
}