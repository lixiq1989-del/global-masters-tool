# 功能与判断逻辑说明

> 最后更新: 2026-03-14

---

## 一、智能推荐引擎 (`lib/recommend.ts`)

### 1.1 用户输入 → 用户强度值 (`calcUserStrength`)

用户填写背景信息后，系统计算一个「用户强度值」(1-10分)，代表该背景能匹配到的项目品牌分中位数。

#### 步骤：

**Step 1: 查 PATTERN_TABLE**

根据用户的 `本科层级(tier)` × `GPA区间` 查表，得到该组合的历史录取分布：
- P25: 第25百分位品牌分（大部分人能到的下限）
- P50: 中位数品牌分（典型水平）
- P75: 第75百分位品牌分（优秀水平）

```
PATTERN_TABLE 示例：
985 × 85-90% → P25=7.0, P50=8.0, P75=8.8 (样本量450)
211 × 80-85% → P25=5.5, P50=6.5, P75=7.5 (样本量350)
双非 × 80-85% → P25=5.0, P50=6.0, P75=7.0 (样本量280)
```

支持的本科层级: Top/C9, 985, Double First, 211, Chinese Target, 双非
GPA区间: 90+, 85-90, 80-85, 75-80, <75

**Step 2: 计算修正值 (modifier)**

在 P50 基础上，根据以下因素加减分：

| 因素 | 条件 | 加分 |
|------|------|------|
| GMAT | ≥700 | +0.5 |
| GMAT | ≥640 | +0.3 |
| 实习 | ≥3段 | +0.3 |
| 实习 | ≥2段 | +0.15 |
| 工作经验 | ≥3年 | +0.3 |
| 工作经验 | ≥1年 | +0.15 |
| 语言 | IELTS≥7.5 | +0.2 |
| 语言 | IELTS≥7.0 | +0.1 |
| 语言 | IELTS<6.5 | -0.1 |

**Step 3: 最终强度值**

```
userStrength = min(P50 + modifier, P75 + 0.5)
```

封顶在 P75+0.5，防止修正值过度膨胀。

---

### 1.2 冲刺/匹配/保底分类 (`classifyReach`)

对每个项目，根据其品牌分与用户的 PATTERN 区间对比：

```
有效P75 = P75 + modifier × 0.5
有效P25 = P25 + modifier × 0.3

if 项目品牌分 > 有效P75 + 0.5 → 冲刺 (reach)
if 项目品牌分 < 有效P25 - 0.5 → 保底 (safety)
else → 匹配 (match)
```

**核心逻辑**: 品牌分在 P25-P75 区间内的是匹配，高于 P75 的是冲刺，低于 P25 的是保底。

---

### 1.3 综合匹配分 (`matchScore`)

```
matchScore = admissionFit × 40%
           + careerMatch × 25%
           + brandScore × 20%
           + locationMatch × 15%
```

各分项计算：

**admissionFit** (0-10):
```
fitDistance = |项目品牌分 - 用户中位数|
admissionFit = max(0, 10 - fitDistance × 2.5)
```
用户中位数越接近项目品牌分，适配度越高。

**careerMatch** (0/0.5/1 → ×10):
- 项目 career_targets 直接包含用户职业目标 → 1
- 项目 career_targets 包含相邻职业 → 0.5
- 不匹配 → 0

**职业相邻关系**:
```
投行 ↔ 公司金融 ↔ 咨询 ↔ 管理
数据/AI ↔ 产品 ↔ 管理
市场 ↔ 管理 ↔ 创业
```

**locationMatch** (0/0.5/0.8/1 → ×10):
- 项目就业地覆盖用户目标 → 1
- 目标香港但项目覆盖新加坡 → 0.8
- 未设定 → 0.5
- 不匹配 → 0

---

### 1.4 筛选逻辑 (recommend 主函数)

**前置筛选** (硬性过滤，不符合直接排除):
1. 目标国家过滤（用户选了哪些国家就只看哪些）
2. 偏好专业方向过滤（选了 Finance 就只看 Finance 类项目）
3. 预算过滤（学费超预算的排除，学费未知的保留）

**排序规则**:
1. 先按冲刺 → 匹配 → 保底分组
2. 组内按 matchScore 降序
3. 组内做学校交错（round-robin by school），确保不会连续推同一学校

**案例筛选**:
- 每个项目只展示 confidence_score ≥ 3 的案例
- 最多展示 3 条，按 confidence_score 降序

---

### 1.5 推荐理由生成 (`generateReasons`)

根据匹配情况自动生成 1-4 条推荐理由：

1. **录取定位**: 根据 reachLevel 说明该项目在用户录取区间的位置
2. **品牌评价**: 品牌分≥9 → "顶尖品牌"，≥7.5 → "知名商学院"
3. **职业匹配**: 直接匹配/相邻匹配/不匹配各有不同文案
4. **就业地匹配**: 覆盖/不覆盖用户目标就业地
5. **就业数据**: 均薪≥60K → "就业回报突出"，≥40K → "就业表现良好"
6. **案例参考**: 有≥2个录取案例时提示
7. **GMAT优势**: 项目要求GMAT且用户已具备

---

## 二、院校识别系统 (`lib/schoolLookup.ts`)

### 2.1 识别流程

用户输入院校名 → 延迟 400ms 后触发识别：

1. **中国院校**: 在 `china_university_tiers_draft.json` 中匹配
   - 支持中文名 / 英文名 / 简称
   - 匹配到 → 返回 tier (985/211/双非等) + prestige_score
2. **海外院校**: 在 `global_university_bands.json` 中匹配
   - 按 region 分组查找
   - 匹配到 → 返回 tier + prestige_score
3. **未匹配**: 提示用户手动选择院校档次

### 2.2 Tier → Pattern Table 映射

| 用户选的 Tier | 对应 PATTERN_TABLE 键 |
|--------------|----------------------|
| China Tier 1 / C9 | "C9" |
| China Tier 2 (强985) | "985" |
| China Tier 3 (211) | "211" |
| China Tier 4 (普通一本) | "Chinese Target" |
| Non-target / 双非 | "双非" |
| G5 / US Ivy+ | "Top" |
| UK Top Tier / US Top 30 | "985" (等效) |
| HK Top / SG Top | "985" (等效) |
| AU Go8 | "211" (等效) |

---

## 三、项目探索页 (`/explore`)

### 3.1 筛选逻辑

**筛选维度** (AND关系):
- 国家/地区 (6国)
- 学校 (按国家联动)
- 专业方向
- 城市 (按国家联动)
- 免GMAT (勾选)
- 无需工作经验 (勾选)

**搜索逻辑**:
- 搜索文本非空时，**跳过国家/学校/城市筛选**（全局搜索）
- 匹配字段: school_name + program_name + program_category + location + 中文别名
- 中文别名支持: 墨尔本→University of Melbourne, 帝国理工→Imperial College London 等

**排序选项**:
- 品牌分↓ (默认)
- 难度↓
- 学费↑ / 学费↓
- 学校名A-Z

---

## 四、学校详情页 (`/school/[name]`)

### 4.1 录取背景画像

**数据源**: cases.json 中该校的中国学生已录取案例
**显示条件**: 案例数 ≥ 5

**统计维度**:
1. **本科院校层级分布**: applicant_background_tier 字段聚合
2. **GPA分布**: 将原始GPA解析为区间 (90%+/85-90%/80-85%/75-80%/<75%)
3. **语言成绩分布**: 解析为 IELTS 7.5+/7.0/6.5/<6.5 等
4. **专业背景分布**: Top 8 专业
5. **GMAT提交率**: 有GMAT/GRE成绩的占比

### 4.2 就业统计

**数据源**: employment.json 中该校全部项目的就业数据

**统计内容**:
- 平均薪资 (各项目均薪的平均值)
- 就业率 (各项目就业率的平均值)
- 目标行业分布 (从 target_industries 字段拆分聚合)
- 目标岗位分布 (从 target_roles 字段拆分聚合)
- 主要雇主 (从 top_employers 字段拆分聚合, Top 12)

---

## 五、数据管道

### 5.1 数据来源

| 数据 | 来源 | 入库方式 |
|------|------|----------|
| programs.json | 各校官网爬取 + QS/FT排名人工评分 | scrape脚本 + 人工校验 |
| cases.json (原始7325条) | WSO/GMAT Club/ChaseDream 论坛 | 爬虫 + DeepSeek结构化 |
| cases.json (追加16968条) | 飞书模板数据 (OfferCall等) | template_matched_cases.json 合并 |
| employment.json | 学校就业报告/FT排名/行业报告 | 半自动采集 + 人工补充 |

### 5.2 还未利用的数据

| 文件 | 条数 | 说明 |
|------|------|------|
| template_biz_cases.json 未匹配部分 | 3,116 | 商科案例，中英文校名未映射（南安527/纽卡160/利物浦102等） |
| template_uk/us/hksg/au_cases.json 未匹配 | ~9,400 | 含大量非商科案例 |

---

## 六、GPA 解析规则 (`parseGPA` / `parseGPAPercent`)

| 输入格式 | 解析方式 | 示例 |
|----------|----------|------|
| X/4.0 | (X/4)×100 → 百分制 | 3.7/4.0 → 92.5% |
| X/10 | X×10 → 百分制 | 8.5/10 → 85% |
| X% | 直接用 | 85% → 85 |
| 纯数字>10 | 当百分制 | 85 → 85% |
| 纯数字≤4 | 当4.0制 | 3.5 → 87.5% |
| First/Distinction | → 90% | |
| 2:1/Upper Second | → 75% | |
| 2:2/Lower Second | → 65% | |

## 七、语言成绩解析 (`parseLanguage`)

| 成绩 | 加分 |
|------|------|
| IELTS ≥ 7.5 / TOEFL ≥ 110 / PTE ≥ 76 | +1.0 |
| IELTS ≥ 7.0 / TOEFL ≥ 100 / PTE ≥ 65 | +0.5 |
| IELTS ≥ 6.5 / TOEFL ≥ 90 | 0 |
| IELTS < 6.5 / TOEFL < 90 | -0.5 |

## 八、GMAT 解析 (`parseGMAT`)

| 成绩 | 加分 |
|------|------|
| GMAT ≥ 730 | +2.5 |
| GMAT ≥ 700 | +2.0 |
| GMAT ≥ 670 | +1.5 |
| GMAT ≥ 640 | +1.0 |
| GMAT ≥ 600 | +0.5 |
| GRE ≥ 165 | +2.5 |
| GRE ≥ 160 | +1.5 |
| GRE ≥ 155 | +0.5 |

## 九、收藏功能

- 使用 LocalStorage 存储收藏的项目 ID 列表
- `useFavorites` hook 管理读写
- ProgramCard 上有收藏/取消收藏按钮
- 收藏状态跨页面持久化（同一浏览器）
