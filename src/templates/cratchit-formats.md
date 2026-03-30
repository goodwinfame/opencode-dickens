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
  "characterId": "", "chapterNumber": 0,
  "location": "", "emotionalState": "", "knownInformation": [], "changes": [],
  "isAlive": true, "deathChapter": null, "deathCause": null,
  "powerLevel": "", "abilities": [], "powerChanges": "",
  "inventory": [], "inventoryChanges": "",
  "physicalCondition": "", "physicalChanges": "", "appearanceNotes": ""
}
```

> 必填：characterId/chapterNumber/location/emotionalState/knownInformation/changes。其余可选，无变化则省略。isAlive 默认 true。

---

## 关系状态追踪 — JSON 格式

```json
{
  "sourceId": "", "targetId": "", "chapterNumber": 0,
  "type": "盟友|敌对|暧昧|师徒|陌生|结义|主仆|...",
  "intensity": 3, "description": "", "change": ""
}
```

> intensity 1-5（1=极弱，5=至深）。change 仅关系有变化时填写。

---

## 术语表 — JSON 格式

```json
{
  "id": "term-xxx", "term": "", "aliases": [],
  "category": "location|organization|power_system|title|object|concept|custom",
  "definition": "", "firstAppearance": 0, "constraints": ""
}
```

---

## 世界状态 — JSON 格式

```json
{
  "chapterNumber": 0, "inStoryDate": "", "season": "",
  "weather": "", "timeOfDay": "", "majorWorldEvents": "", "environmentNotes": ""
}
```

> 除 chapterNumber 外均可选。每章至少更新 inStoryDate 和 timeOfDay。

---

## 阵营状态 — JSON 格式

```json
{
  "factionId": "", "name": "", "chapterNumber": 0,
  "status": "active|weakened|destroyed|merged|hidden",
  "leader": "", "keyMembers": [], "territory": "",
  "alliances": [{ "targetFaction": "", "type": "allied|hostile|neutral|vassal" }],
  "changes": ""
}
```

---

## 秘密追踪 — JSON 格式

```json
{
  "id": "secret-xxx", "description": "", "introducedChapter": 0,
  "knownBy": [], "unknownBy": [], "revealedChapter": null,
  "status": "active|partially_revealed|fully_revealed",
  "significance": "minor|major|critical"
}
```

> 角色获知秘密 → `update_secret` 加入 knownBy。完全揭露 → status 改 fully_revealed + 填 revealedChapter。

---

## 时间线事件 — JSON 格式

```json
{
  "id": "", "chapter": 0, "timestamp": "", "description": "",
  "characters": [], "location": "", "significance": "minor|moderate|major|critical"
}
```

---

## 伏笔链追踪 — JSON 格式

```json
{
  "id": "foreshadow-xxx", "name": "伏笔：...", "description": "铺设|误导|真相",
  "introducedChapter": 0, "status": "open", "relatedCharacters": [], "targetChapter": ""
}
```

状态值：`open` → `developing` → `climax` → `resolved`

---

## 爆点兑现追踪 — JSON 格式

```json
{
  "id": "explosion-xxx", "name": "爆点：...",
  "description": "类型：反转|揭示|情感|能力|选择|牺牲 | 蓄力状态",
  "introducedChapter": 0, "status": "open", "relatedCharacters": []
}
```

蓄力中用 `update_thread` 记录进度。引爆后改 `resolved`。
