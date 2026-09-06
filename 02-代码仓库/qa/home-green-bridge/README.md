# 首页 → 群体智能汇合验收记录

> 日期：2026-09-06  
> 分支：`codex/home-green-bridge`  
> 候选：`home-green-v0.1.0-rc.1`

## 受保护的来源

- 首页：`e894154`／`v4.5.3-rc.1`
- 世界 1 单页实时网络：`968af59`
- 两个来源提交均未被改写；汇合只存在于独立工作树和分支。

## 桌面浏览器实测

- 完整路径：`opening → aligned → entering → handoff → arrival → local → whole`
- 转场契约：同一个光点从首页瞳孔抵达 `spore-center-low`；`cutCount = 1`；世界在硬切前为 prepared，不提前运行。
- 抵达状态：`worldEntry = landed` 后进入 `active`，章节从 arrival 进入 local。
- 一次点击结果：`pathArrivals = 128`、`organArrivals = 46`、`crossPlant = 28`，最后进入 complete。
- 返回：世界 1 的返回入口重新载入首页，世界状态和硬切计数复位。
- 控制台：warning/error 为 0；页面资源均成功加载。favicon 使用空 data URL，避免无意义的 404。

## 自动检查

- `node qa/homepage-v4-contract-test.mjs`
- `node qa/light-cursor-contract-test.mjs`
- `node qa/soundscape-contract-test.mjs`
- `node qa/home-green-bridge-contract-test.mjs`
- `node --check journey-controller.js`
- `node --check green-body-realtime.js`
- `node --check green-body-living.js`
- `node --check world-one-soundscape.js`

## 仍需用户验收

- 瞳孔到植物节点的 860ms 连续光点是否具有足够的“坠入”重量。
- 两行转场文字是否恰到好处，是否需要更短或更隐约。
- 首页声场切换到植物声场的真实耳机／扬声器听感。
