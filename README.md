# 工技大校园快递代取 Web 小程序原型

打开 `index.html` 即可使用。数据保存在浏览器 `localStorage`，适合第一版演示、Render/GitHub Pages 静态部署和后续迁移微信小程序前的业务验证。

如果要发给其他人手机测评，请把本目录上传到 GitHub Pages、Render Static Site、Vercel、Netlify 或服务器静态目录。不要发送 `127.0.0.1` 地址，因为它只代表你自己的电脑。

当前测试地址：

https://taocijie.github.io/sgtu-express-mobile-site/

## 演示账号

- 超级管理员：`13800000000`
- 密码：`admin888`

普通取件人、接单人使用新手机号和不少于 6 位密码登录会自动注册。

## 已实现

- 三入口：取件、接单、管理后台
- 重量自动计价和包裹分类
- 10 元以下货到付款，10 元及以上模拟微信预付款
- 未付款订单阻止继续发布
- 接单人实名认证、管理员审核
- 接单前隐藏快递编号，接单后显示完整编号
- 接单取消警告，3 次后限制接单，后台可清除
- 上传完成照片后订单完成
- 完成后评价：1-5 星和文字
- 发布人申诉，管理员处理
- 后台概览、认证审核、订单管理、用户管理
- 超级管理员设置管理员，管理员最多 4 名
- 手机浏览器适配，支持 PWA 添加到主屏幕

## 快速发布成公网测试站

### GitHub Pages

1. 新建一个 GitHub 仓库。
2. 上传本目录内全部文件：`index.html`、`styles.css`、`app.js`、`manifest.webmanifest`、`service-worker.js`、`icon.svg`。
3. 进入仓库 `Settings` → `Pages`。
4. Source 选择 `Deploy from a branch`，Branch 选择 `main` 和 `/root`。
5. 保存后等待 1-3 分钟，GitHub 会生成一个 `https://用户名.github.io/仓库名/` 地址。

### Render Static Site

1. New → Static Site。
2. 连接 GitHub 仓库。
3. Publish directory 填 `/`。
4. Build command 留空。
5. 部署完成后把 Render 生成的 `https://xxx.onrender.com` 发给测试者。

## 上架微信小程序需要补齐

1. 后端服务：用户、订单、认证、评价、申诉、文件上传、权限控制。
2. 数据库：建议 `users`、`orders`、`runner_auths`、`appeals`、`payments`、`ratings`、`audit_logs`。
3. 微信登录：使用 `wx.login` 获取 code，后端换取 openid/session_key。
4. 微信支付：申请微信支付商户号，在后端创建预支付订单，前端调用 `wx.requestPayment`。
5. 收款分账：第一版建议平台统一收款，线下结算给接单人；若要自动分账，需要开通微信支付分账能力。
6. 上传审核：学生证照片和完成证明应上传到对象存储，不要只存在前端。
7. 合规：明确服务协议、隐私政策、责任归属、退款/赔付规则，提交微信小程序审核时需要可访问页面。
