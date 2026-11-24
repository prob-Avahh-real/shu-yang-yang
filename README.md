# 眠养 · 睡眠质量监测

移动端 + 手表 + 智能戒指/手杖的睡眠质量监测、分析与个性化建议应用。

## 功能

- **质量评分**：时长、深睡/REM、效率、觉醒、入睡耗时、静息心率、作息偏移
- **专项档案**：阻塞性睡眠呼吸暂停 (OSA) 与帕金森患者档案，含更严格的阈值与专项建议
- **睡眠阶段**：深睡 / REM / 浅睡可视化
- **个性化建议**：针对薄弱指标的可执行改善方案
- **症状自评**：OSA（打鼾、日间嗜睡）与 PD（夜间震颤、梦中动作）辅助筛查
- **临床风格摘要**：wellness 筛查摘要与风险横幅（**非医疗诊断**）
- **历史趋势**：近 7 晚折线与均分
- **睡前就寝提醒**：本地通知，目标就寝时间前提醒放松
- **起床自然唤醒**：提前 30/15/5/0 分钟渐进通知；应用在前台时 Web Audio + 触觉渐强
- **健康数据导入**：iOS Apple HealthKit 睡眠分析；Android Health Connect（需安装 HC 应用）
- **智能硬件**：戒指切换标签/摇晃刷新；手杖敲击快速记录

## 目标平台（同一套 Web 资源）

| 平台 | 方式 | 产出 |
|------|------|------|
| Android 手机 | Capacitor APK | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Wear OS / 小屏 | 响应式 CSS `@media (max-width:280px)` | 同上 APK，安装到手表或窄屏设备 |
| iOS / iPhone | Capacitor IPA | Xcode Archive |
| Apple Watch | Companion WebView / 窄屏 CSS | 同 IPA（需配对设备或 Xcode 调试） |
| 戒指/手杖 | DeviceOrientation / DeviceMotion | 手机或手表 WebView 内 |

## 提醒与唤醒

1. 在「概览」设置目标就寝/起床时间
2. 开启「睡前就寝提醒」「起床自然唤醒」
3. 点击「同步提醒排程」（首次需授予通知权限）
4. 自然唤醒：后台靠本地通知；**应用在前台**且处于唤醒窗口时自动播放渐强柔和音 + 轻触觉

## 健康数据

| 平台 | 数据源 | 说明 |
|------|--------|------|
| iOS | Apple HealthKit `sleepAnalysis` | 点击「从健康应用导入」；Xcode 需启用 **HealthKit** capability |
| Android | Health Connect | 需安装 [Health Connect](https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata)；授权睡眠读取 |
| 浏览器 | — | 不可用，请安装 APK/IPA |

### 专项档案与指标

| 档案 | 额外指标 | 风险筛查 |
|------|----------|----------|
| OSA | SpO₂ 最低/平均、AHI 代理、呼吸事件 | 觉醒≥5 + 效率<75 + SpO₂<90 |
| 帕金森 | 碎片化指数、早醒时长、RBD 风险分 | REM<12% + 高碎片化 / RBD 模式 |

可选会话字段（健康导入或手动）：`spo2Min`、`spo2Avg`、`apneaEvents`、`hypopneaIndex`、`rbdRiskScore`、`remBehaviorFlag`、`fragmentationIndex`、`earlyWakeMinutes`。

> **免责声明**：本应用仅供健康监测与生活方式参考，**不构成医疗诊断**。如有呼吸暂停、帕金森或睡眠障碍相关症状，请咨询专业医生。

### iOS 手动配置（首次）

1. Xcode 打开 `ios/App/App.xcworkspace`
2. Target **App** → Signing & Capabilities → **+ HealthKit**
3. 确认 `App.entitlements` 含 `com.apple.developer.healthkit`
4. `Info.plist` 已含 `NSHealthShareUsageDescription`

## 开发

```bash
cd active/mian-yang
npm install          # 使用 legacy-peer-deps，见 .npmrc
npm test             # 11 项单元测试
npm run build
```

浏览器调试：打开 `index.html`（Capacitor 插件在 Web 下降级）。

## 打包 Android APK

```bash
npm run apk:debug
# 产出: android/app/build/outputs/apk/debug/app-debug.apk
```

> Gradle 需 **JDK 17**（非系统默认 JDK 24）。`scripts/gradle-android.sh` 会自动使用 Homebrew `openjdk@17`。

## 打包 iOS

```bash
npm run sync:ios
npm run open:ios     # Xcode 打开工程
```

命令行模拟器构建（按本机可用设备名调整）：

```bash
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -configuration Debug -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 17' build
```

真机 Archive：Xcode → Product → Archive，需 Apple 开发者账号与 HealthKit entitlement。

## 传感操作

| 输入 | 动作 |
|------|------|
| 戒指左/右倾 | 切换 概览/分析/建议/历史 |
| 戒指摇晃 | 随机质量模拟新记录 |
| 手杖敲击 | 记录昨夜（良好档） |

首次点击「启用传感」授予 iOS 运动与方向权限。

## 项目结构

```
mian-yang/
├── src/
│   ├── app.js
│   ├── standards.js / assess.js / store.js
│   ├── reminders.js / reminders-native.js
│   ├── natural-wake.js
│   ├── health-sync.js
│   └── wearable-input.js
├── android/ / ios/
└── scripts/gradle-android.sh
```

## 依赖说明

- `@capacitor/local-notifications` — 就寝/唤醒排程
- `@perfood/capacitor-healthkit` — iOS 睡眠（peer Cap 4，用 `--legacy-peer-deps`）
- `capacitor-health-connect` — Android Health Connect
