# 每日历史内容生成与邮件发送（GitHub Actions）

该方案在云端执行，不占用本机 CPU。  
每天北京时间 21:30 自动生成次日文件并发送到指定邮箱。

## 1) 生成文件规则

- 目录：`src/assets/history/`
- 命名：`history-YYYY-MM-DD.md`
- 日期：按北京时间“次日”生成（例如 4 月 19 日执行，生成 4 月 20 日文件）
- **覆盖策略**：每次执行 `npm run history:generate`（含定时任务）都会按脚本内固定结构生成；若目标日期的文件**已存在则覆盖**，**不存在则新建**。
- 本地若需保留手改稿、不覆盖已有文件，可设置环境变量：`SKIP_EXISTING_HISTORY_FILE=true`。
- 节日模块：有节日则展示“今日节日”，无节日则不展示该模块
- 农历与节气：使用 `lunar-javascript` 计算农历行；节气（如谷雨）会进入“今日节日”模块
- 历史条目来源：生成时优先拉取百度百科日期页中的节日信息；事件/出生/逝世优先使用稳定公开接口并按模板编排，避免结构化页面噪音污染正文
- 语言统一：生成内容默认使用**中文简体**
- 节日质量要求：节日条目必须是“节日名（地区可选）+ 一句清晰中文介绍”；禁止出现仅有国家/地区名称的孤立行（如“巴西”“美国”单独成行）或“标题重复标题”的无效说明
- 「程序员视角」定位：仅面向 **IT 程序员**（后端 Java/Python/Go、前端 Vue/React、AI 工程实践），每篇建议 2-3 条并与当日事件关联，直接描述热点事件，不添加“程序员社区热点：”等固定前缀

## 2) 必填 GitHub Secrets

- `SMTP_HOST`：QQ 邮箱通常为 `smtp.qq.com`
- `SMTP_PORT`：QQ 邮箱通常为 `465`
- `SMTP_USER`：发件邮箱（例如 `896415482@qq.com`）
- `SMTP_PASS`：QQ 邮箱 SMTP 授权码（不是登录密码）
- `HISTORY_MAIL_TO`：收件邮箱（例如 `896415482@qq.com`）
- `HISTORY_MAIL_FROM`：发件邮箱（可选，默认 `SMTP_USER`）

## 3) 本地调试命令

```bash
npm run history:generate
npm run history:send-mail
```

可通过环境变量覆盖目标日期（用于测试）：

```bash
TARGET_DATE=2026-04-20 npm run history:daily
```

## 4) Workflow 说明

- 文件：`.github/workflows/history-daily-mail.yml`
- 定时表达式：`0 12 * * *`（UTC，对应北京时间 20:00）
- 支持 `workflow_dispatch` 手动触发
- 当前方案：不依赖 AI 接口，使用公开在线历史接口实时取数并按模板生成
- 生成后会自动 `git commit` 并 `git push`，把新增/更新的 `history-*.md` 写回仓库
- 邮件标题固定为：`【历史上的今天】YYYY-MM-DD`
