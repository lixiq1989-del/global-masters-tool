# AI 全球商科硕士选校工具

## 定位
面向中国学生的商科硕士选校决策工具。覆盖英美港新澳法6国117所院校、1540个项目。

## 技术栈
- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS
- 纯客户端渲染 (use client)，数据以 JSON 静态导入
- 中文UI

## 数据
- `data/programs.json` — 1540 个项目
- `data/employment.json` — 1599 条就业数据
- `data/cases.json` — 52718 条录取案例（WSO/GMAT Club/ChaseDream/飞书模板）
- `data/compass_cases_v3.json` — 27238 条录取案例（指南者留学，单独存放）
- 运行时合并使用，共 79956 条案例（通过 `lib/compassCases.ts` 合并）

## 页面路由
- `/` — 智能推荐（InputForm → recommend() → ResultSection）
- `/explore` — 项目探索（筛选浏览全部项目）
- `/school/[name]` — 学校详情（项目列表 + 录取画像 + 就业统计）
- `/program/[id]` — 项目详情（基本信息 + 录取画像 + 就业统计）
- `/compare` — 项目对比
- `/report` — 申请规划报告
- `/favorites` — 收藏列表
- `/profile` — 我的档案
- `/tracker` — 申请进度

## 部署
- Vercel: https://uk-masters-tool.vercel.app
- GitHub: https://github.com/lixiq1989-del/global-masters-tool

## 核心算法 (`lib/recommend.ts`)
- PATTERN_TABLE: tier×GPA → P25/P50/P75 品牌分布
- calcUserStrength: P50 + GMAT/WE/语言修正
- classifyReach: 基于 P25/P75 区间判断冲刺/匹配/保底
- matchScore = admissionFit(40%) + career(25%) + brand(20%) + location(15%)

## 设计决策
- NavBar 统一导航，TABS 数组控制
- ProgramCard 从推荐结果链接到 explore?school= 和 school/[name]
- 录取画像仅在案例≥5条时显示
- 不使用数据库，全部客户端处理
