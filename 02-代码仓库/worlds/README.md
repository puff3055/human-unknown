# HUMAN UNKNOWN / Worlds

世界侧可运行纵切：入口阈值 → 截面之外 → 交换场 → 仍在发生 → 来源档案。

## 本地运行

在 `02-代码仓库` 目录启动静态服务器：

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

然后打开 `http://127.0.0.1:8765/worlds/`。

## 输入

- 鼠标 / 触控：移动用于探测；按住并移动用于接触；放开会提交一次动作。
- 键盘：方向键移动探针；按住 Space 接触；Enter 可切换接触与放开；M 切换声音；Esc 聚焦设置。
- 声音：Web Audio 实时合成，默认关闭且不是通关条件。
- 声息输入：只在“交换场”出现；用户主动授权后只读取本地音量包络，不录制、上传或保存。

## 首页接力契约

本目录不修改首页。首页分支以后可在进入 `/worlds/` 前写入：

```js
sessionStorage.setItem('humanUnknownHandoff:v1', JSON.stringify({
  seed: 248731,
  inputType: 'mouse',
  approach: { x: 0.5, y: 0.52, directionX: 1, directionY: 0 },
}));
```

世界侧会读取该信息作为入口方向和视觉种子；没有 handoff 时使用安全默认值。

## QA

- `?qa=1&view=section&stage=2`
- `?qa=1&view=exchange&stage=2`
- `?qa=1&view=reality&stage=2`
- `?qa=1&view=archive`

视觉对照与测试记录见 `design-qa.md` 与 `qa/compare.html`。QA 参数只用于固定截图状态，不参与正常旅程推进。
