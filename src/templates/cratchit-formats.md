# Cratchit 输出格式模板

本文件包含 Cratchit 的所有输出格式模板。Cratchit 在生成摘要和追踪记录时读取本文件中的对应模板。

---

## 章节摘要模板

```markdown
# 第[N]章：[标题]

## 核心事件
- [事件1]
- [事件2]
...

## 角色动态
- [角色A]：[状态变化/情感变化/新的认知]
- [角色B]：...

## 情节线索更新
- [线索名]：[推进/新增/解决] — [具体内容]

## 伏笔动态
- 新铺设：[如果本章铺设了新伏笔]
- 推进：[已有伏笔的进一步暗示]
- 兑现：[如果本章兑现了某个伏笔]

## 爆点状态
- [如果本章有爆点引爆] 类型：[反转/揭示/情感/能力/选择/牺牲]
- [如果本章在为未来爆点蓄力] 蓄力目标：[哪个爆点]

## 关键对话/揭示
- [本章揭示的重要信息]
- [关键对话的核心内容]

## 信息差状态
- 读者现在知道而角色不知道的：[列出]
- 角色知道而读者不知道的：[列出]
- 角色之间的信息不对等：[列出]

## 能力/实力变化
- [角色A]：[突破/退步/新技能习得等]

## 物品得失
- [角色A]：获得 [物品] / 失去 [物品]

## 秘密流转
- 新秘密：[描述]（知情人：[角色列表]）
- 揭露：[秘密ID] 被 [角色] 得知

## 阵营动态
- [组织/阵营]：[变化描述]

## 承诺/契约
- 新承诺：[角色A] 向 [角色B] 承诺 [内容]
- 兑现/违约：[承诺ID] [状态]

## 章末状态
- 主要角色位置：[在哪]
- 情感状态：[如何]
- 世界时间：[故事内日期/时段]
- 悬念/钩子：[留下了什么问题]
```

---

## 弧段摘要模板

```markdown
# 弧段 [N]：[标题]
章节范围：第 X 章 — 第 Y 章

## 弧段概述
[2-3段概括整个弧段的故事]

## 重大事件
1. [事件] (第X章) — [影响]
2. ...

## 角色弧线
- [角色A]：[弧段开始时的状态] → [弧段结束时的状态]
- [角色B]：...

## 关系变化
- [角色A] ↔ [角色B]：[关系如何变化了]
- ...

## 伏笔总账
### 已铺设（未兑现）
- [伏笔内容] (铺设于第X章) → 预计兑现：弧段[N]

### 已兑现
- [伏笔内容] (铺设于第X章, 兑现于第Y章)

### 新增
- [本弧段新铺设的伏笔]

## 爆点回顾
- [弧段大爆点]：类型 [X]，效果 [评估]
- [小爆点列表]

## 主题发展
- [本弧段如何推进了全书主题]

## 未解决的问题
- [需要在后续弧段处理的悬念和线索]
```

---

## 角色状态追踪 — JSON 格式

```json
{
  "characterId": "角色ID",
  "chapterNumber": N,
  "location": "当前位置",
  "emotionalState": "情感状态",
  "knownInformation": ["角色当前知道的重要信息"],
  "changes": ["本章发生的变化"],

  "isAlive": true,
  "deathChapter": null,
  "deathCause": null,

  "powerLevel": "实力等级（如'筑基中期'、'黄金三星'，无则省略）",
  "abilities": ["当前掌握的技能/能力列表"],
  "powerChanges": "本章实力变化（如'突破至结丹期'，无则省略）",

  "inventory": ["当前持有的关键物品/装备"],
  "inventoryChanges": "本章物品变化（如'获得[冰魄寒剑]'，无则省略）",

  "physicalCondition": "身体状态（如'左臂断裂未愈'，正常则省略）",
  "physicalChanges": "本章身体变化（无则省略）",
  "appearanceNotes": "外貌变化备注（如'剃了光头'，无则省略）"
}
```

> 字段均为可选（除 characterId、chapterNumber、location、emotionalState、knownInformation、changes）。isAlive 默认 true，仅角色死亡时设为 false。

---

## 关系状态追踪 — JSON 格式

```json
{
  "sourceId": "角色A的ID",
  "targetId": "角色B的ID",
  "chapterNumber": N,
  "type": "关系类型（盟友/敌对/暧昧/师徒/陌生/结义/主仆等）",
  "intensity": 3,
  "description": "当前关系的一句话描述",
  "change": "本章的关系变化（如有）"
}
```

> `intensity` 为 1-5，1=极弱/刚接触，5=至深/不可调和。`change` 仅在本章关系有变化时填写。

---

## 术语表 — JSON 格式

```json
{
  "id": "唯一ID（如 term-ice-sword）",
  "term": "术语全名",
  "aliases": ["别名1", "简称2"],
  "category": "location|organization|power_system|title|object|concept|custom",
  "definition": "一句话定义",
  "firstAppearance": N,
  "constraints": "使用约束（如'仅在XX情境下使用'，无则省略）"
}
```

---

## 世界状态 — JSON 格式

```json
{
  "chapterNumber": N,
  "inStoryDate": "故事内日期（如'大衍历3027年秋'、'末日第47天'）",
  "season": "季节",
  "weather": "天气/环境状况",
  "timeOfDay": "时段（晨/午/夜）",
  "majorWorldEvents": "正在发生的大事件（如'南境战争第三年'）",
  "environmentNotes": "环境特殊状况（如'瘟疫蔓延中'、'灵气潮汐期'）"
}
```

> 所有字段除 chapterNumber 外均可选。每章至少更新 inStoryDate 和 timeOfDay。

---

## 阵营状态 — JSON 格式

```json
{
  "factionId": "阵营唯一ID",
  "name": "阵营名称",
  "chapterNumber": N,
  "status": "active|weakened|destroyed|merged|hidden",
  "leader": "当前领袖角色ID",
  "keyMembers": ["核心成员角色ID"],
  "territory": "控制区域",
  "alliances": [
    { "targetFaction": "另一阵营ID", "type": "allied|hostile|neutral|vassal" }
  ],
  "changes": "本章变化描述"
}
```

---

## 秘密追踪 — JSON 格式

```json
{
  "id": "secret-xxx",
  "description": "秘密内容",
  "introducedChapter": N,
  "knownBy": ["知道此秘密的角色ID列表"],
  "unknownBy": ["明确不知道此秘密的关键角色（可选）"],
  "revealedChapter": null,
  "status": "active|partially_revealed|fully_revealed",
  "significance": "minor|major|critical"
}
```

> 秘密被某角色获知时，用 `update_secret` 将该角色加入 `knownBy`。秘密完全揭露时改 `status` 为 `fully_revealed` 并填写 `revealedChapter`。

---

## 时间线事件 — JSON 格式

```json
{
  "id": "唯一ID",
  "chapter": N,
  "timestamp": "故事内时间",
  "description": "事件描述",
  "characters": ["涉及角色"],
  "location": "发生地点",
  "significance": "minor|moderate|major|critical"
}
```

---

## 伏笔链追踪 — JSON 格式

```json
{
  "id": "foreshadow-xxx",
  "name": "伏笔：[描述]",
  "description": "铺设内容 | 误导方向 | 真相",
  "introducedChapter": N,
  "status": "open",
  "relatedCharacters": ["关联角色"],
  "targetChapter": "预计兑现章节(约)"
}
```

伏笔状态值：`open`（已铺设）→ `developing`（有更多暗示）→ `climax`（即将揭示）→ `resolved`（已兑现）

---

## 爆点兑现追踪 — JSON 格式

```json
{
  "id": "explosion-xxx",
  "name": "爆点：[描述]",
  "description": "类型：[反转/揭示/情感/能力/选择/牺牲] | 蓄力状态",
  "introducedChapter": N,
  "status": "open",
  "relatedCharacters": ["关联角色"]
}
```

蓄力过程中，通过 `update_thread` 更新描述，记录蓄力进度。引爆后改为 `resolved`。
