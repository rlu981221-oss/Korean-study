# Nora Korean 🇰🇷

**Nora Korean** 是一款专为 TOPIK 高级学习者打造的现代化韩语单词记忆 App。它结合了 **Google Gemini AI** 的深度语言理解能力和 **SRS (间隔重复系统)** 算法，帮助用户高效掌握复杂的韩语词汇（特别是汉字词）。

## ✨ 核心亮点 (Core Features)

- **🧠 AI 深度解析 (AI-Powered Analysis)**
  - 集成 Google Gemini 2.0 模型，一键生成单词的**深度报告**。
  - **多维解析**：包含核心中文释义、形态学拆解、汉字词逻辑（Hanja Logic）、近义词辨析、地道例句以及趣味助记法。
  - *注意：需要在 App 设置中配置您自己的 Gemini API Key。*

- **📅 SRS 智能记忆 (Spaced Repetition)**
  - 内置科学的间隔重复算法，根据你的掌握程度（陌生/熟悉）自动安排复习时间，抗遗忘更高效。

- **👆 丝滑的手势交互 (Gestures & Animations)**
  - 采用 `react-native-reanimated` 和 `gesture-handler` 打造流畅的卡片体验。
  - **左滑 (Forgot)**：标记为陌生，缩短复习间隔。
  - **右滑 (Know)**：标记为掌握，延长复习周期。
  - 点击卡片翻转查看详情，长按播放发音。

- **📂 本地化与隐私 (Local & Private)**
  - 基于 `expo-sqlite` 的本地数据库，所有学习记录存储在设备端。
  - 支持从 JSON 文件导入/管理词库。

- **🔊 听觉辅助 (TTS Support)**
  - 集成 `expo-speech`，提供标准的韩语单词发音功能。

## 🛠️ 技术栈 (Tech Stack)

- **Framework**: [Expo SDK 54](https://expo.dev) (React Native 0.81)
- **Language**: TypeScript
- **State/Logic**: React Hooks, Context API
- **Local Database**: SQLite (`expo-sqlite`)
- **Animation**: React Native Reanimated 3
- **Network**: Fetch API (Gemini Integration)

## 🚀 快速开始 (Getting Started)

### 1. 环境准备
确保你的本地环境已安装：
- Node.js (推荐 LTS 版本)
- Git

### 2. 克隆与安装

```bash
# 克隆仓库
git clone https://github.com/your-username/nora-korean.git

# 进入目录
cd nora-korean

# 安装依赖
npm install
```

### 3. 运行 App

```bash
# 启动 Expo 开发服务
npx expo start
```

在终端输出中，按 `a` 打开 Android 模拟器，按 `i` 打开 iOS 模拟器，或使用 Expo Go App 扫描二维码在真机运行。

### 4. 🔑 配置 AI 功能

App 启动后，请务必进行以下配置以启用 AI 解析功能：
1. 导航至底部的 **"设置(Settings)"** 标签页。
2. 找到 **"API Key 设置"** 选项。
3. 输入您的 Google Gemini API Key（可从 [Google AI Studio](https://aistudio.google.com/) 免费获取）。
4. 保存后即可在学习模式中使用 AI 解析。

## 🤝 贡献 (Contributing)

欢迎提交 Issue 或 Pull Request 来改进这个项目！

## 📄 License

MIT
