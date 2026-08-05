# Nono Letterbox OSS 🌸

A privacy-first, local-first letter and reply organizer for people who want to keep meaningful AI messages, personal notes, and long-running ideas in one calm little space.

> **Public extraction in progress.** This repository is being prepared from a working private prototype. Source code and installable builds will be migrated only after personal data, account-specific configuration, OAuth details, and Android signing identity have been removed or replaced.

[中文说明](#中文说明) · [English](#english)

## 中文说明

### 它想解决什么

聊天、邮件和 AI 通知很容易散落在不同平台里。Nono Letterbox 希望提供一个更安静的地方，用来：

- 收藏与整理值得留下的信件；
- 给某一封信写回信，也可以写不指定对象的近况；
- 对同一封回信进行多次补充并保留时间线；
- 保存长期项目、下一步和更新记录；
- 在设备本地保留阅读状态、收藏、附件索引和偏好；
- 明确区分“本地保存”与“主动发送”，不静默上传私人内容。

### 当前状态

私人原型已经验证了 React/Vite 界面、Capacitor Android 包装、本地信件与回信、附件保险箱、备份导出、Gmail 只读同步桥和移动端体验。

公开版目前处于 **v0.1 准备阶段**：

1. 建立不携带旧 Git 历史的干净公开仓库；
2. 移除个人邮箱、私人信件、OAuth 测试配置和签名身份；
3. 迁移仅含演示数据的本地模式；
4. 加入独立 Android 包名和可复现的公开构建；
5. 发布首个可安装预览版并邀请真实测试。

### 隐私原则

- 仓库只允许出现演示数据，不提交真实邮件、回信、令牌、密钥或私人附件；
- `.env`、keystore、证书、APK 签名材料和本地备份必须保持在 Git 之外；
- 默认优先本地存储；任何联网同步都需要用户明确配置和授权；
- ChatGPT 或其他 AI 不会因为网页处于打开状态就自动读取其中的私人内容。

### 开发计划

首个公开版本会优先完成一条可靠流程：

`打开应用 → 浏览演示信件 → 收藏/搜索 → 写本地回信 → 导出备份`

Gmail 连接、跨设备同步、更多角色动画和环境效果会在基础流程稳定后再逐步加入。

### 参与

欢迎先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。功能建议和普通问题可以使用 GitHub Issues；安全问题请先阅读 [SECURITY.md](SECURITY.md)，不要在公开 Issue 中粘贴令牌、邮件正文或其他敏感信息。

---

## English

### What it is

Nono Letterbox OSS is a calm, privacy-first home for meaningful letters, replies, personal updates, and long-running ideas.

The public edition is being extracted from a working private prototype. The migration intentionally starts with a clean repository so private Git history, personal messages, OAuth test configuration, and Android signing identity are not exposed.

### Planned first public flow

`Open → browse demo letters → favorite/search → write local replies → export a backup`

The first release will focus on a dependable local experience. Optional Gmail integration and cross-device sync will come later and will require explicit user configuration and consent.

### Project principles

- demo data only in the repository;
- no tokens, secrets, personal messages, keystores, or signing material in Git;
- local-first storage by default;
- clear, intentional actions before any private content leaves the device;
- accessible mobile UI and reproducible builds.

## Credits

Created and directed by **nono** with engineering and design assistance from **ChatGPT / Codex**. This is an independent community project and is not affiliated with or endorsed by OpenAI.

## License

MIT — see [LICENSE](LICENSE).
