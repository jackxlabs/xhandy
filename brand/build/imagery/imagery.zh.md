# Xhandy · 图片规范

> 由 brand.yaml 生成（imagery.py），改 brand.yaml 后重新运行。

## 风格（草稿，待品牌负责人确认）

真实的插件界面截图，标出要看的地方；宣传图用品牌渐变背景加 logo

## 检查清单

发图前逐条打勾。标「brand.yaml」的是品牌负责人定的；标「系统」的来自品牌系统其他部分（模板尺寸、图案、对比度）。

- [ ] 1. **必须**: 用真实 X 页面上的截图，其他用户的头像、名字打码 (brand.yaml)
- [ ] 2. **必须**: 截图里的数字保持真实，不改成夸张的数据 (brand.yaml)
- [ ] 3. **必须**: 中英文界面各截一套 (brand.yaml)
- [ ] 4. **禁止**: 假的界面效果图或夸大的浏览数据 (brand.yaml)
- [ ] 5. **禁止**: 图库照片和泛 AI 插画 (brand.yaml)
- [ ] 6. **禁止**: 出现 X 官方 logo 当装饰 (brand.yaml)
- [ ] 7. **规则** [硬性]: 不用 X 官方 logo 的造型（一粗一细直线斜交加断口） (brand.yaml)
- [ ] 8. **规则** [建议]: 标志本身只用纯黑或纯白，品牌色只放在底座和背景 (brand.yaml)
- [ ] 9. 尺寸按模板：post 1600x900, quote 1080x1080, og 1280x640, slides 1920x1080；导出 2 倍图（例如 3200x1800），平台再压缩也清楚 (系统)
- [ ] 10. 图上有文字时，文字和它背后最差的那块背景对比度至少 4.5:1（大字 3:1）；不够就加底板 (系统)
- [ ] 11. 背景里的标志或图案不透明度不超过 15%，标志不旋转、不拉伸、不改形 (系统)
- [ ] 12. 品牌色只用 cyan #06b6d4, violet #8b5cf6, pink #ec4899，中性色用 #f7f6f9 / #1e1d23；不额外加新色相 (系统)
- [ ] 13. 每张图都配替代文字（alt），中英文各写一份，描述图里真实的内容 (系统)
- [ ] 14. AI 生成或 AI 改过的图，按下面的来源记录模板留档；平台要求标注 AI 内容时照做 (系统)

## AI 出图提示词模板

只用于品牌风格允许的图片类型。{变量} 已经按调色板和关键词填好，`<尖括号>` 由使用者填。负面提示词来自上面的「禁止」项。先用品牌系统自己的背景（showcase 的 *-bgonly.png、webgl 背景、brand_patterns），不合适时才用 AI。

> 关键词取自个性特征（brand.yaml 里没有 visual.imagery.keywords），请品牌负责人确认或补充。

**变量**: `palette_named` = 青（#06b6d4） → 紫（#8b5cf6） → 粉（#ec4899）; `mood` = 直白、懂行、顺手; `aspect` = <16:9 | 1:1 | 2:1>; `text_side_zh` = <左侧 | 右侧>; `neutral_desc_zh` = <浅色 #f7f6f9 | 深色 #1e1d23>

### 渐变背景底图（宣传图、幻灯片、OG 图）

**提示词**

```text
抽象的柔和渐变背景，青（#06b6d4） → 紫（#8b5cf6） → 粉（#ec4899），从左上到右下的斜向流动，细微胶片颗粒，<左侧 | 右侧>留出大片干净区域放标题，没有物体，没有文字，直白、懂行、顺手，扁平二维，<16:9 | 1:1 | 2:1>
```

**负面提示词**

```text
假的界面效果图或夸大的浏览数据; 图库照片和泛 AI 插画; 出现 X 官方 logo 当装饰; 文字、字母、水印、标志、界面、人物、手、设备
```

### 真实截图背后的底纹

**提示词**

```text
青（#06b6d4） → 紫（#8b5cf6） → 粉（#ec4899） 的柔和模糊色场，<浅色 #f7f6f9 | 深色 #1e1d23>底色，对比度很低，失焦，没有形状，没有文字，没有界面，中间留空放真实的产品截图，<16:9 | 1:1 | 2:1>
```

**负面提示词**

```text
假的界面效果图或夸大的浏览数据; 图库照片和泛 AI 插画; 出现 X 官方 logo 当装饰; 文字、字母、水印、标志、界面、人物、手、设备
```

### 给品牌负责人看的情绪探索（仅内部，不发布）

**提示词**

```text
只有颜色和光的情绪板：青（#06b6d4） → 紫（#8b5cf6） → 粉（#ec4899），直白、懂行、顺手；没有人物，没有设备，没有标志，没有文字，<16:9 | 1:1 | 2:1>
```

**负面提示词**

```text
假的界面效果图或夸大的浏览数据; 图库照片和泛 AI 插画; 出现 X 官方 logo 当装饰; 文字、字母、水印、标志、界面、人物、手、设备
```

## 参考链接

只看、不下载、不复用别人的图片。许可一栏写「自有」「需授权」或「仅供参考」。

| 链接 | 看什么 | 许可状态 |
|---|---|---|
| github.com/jackxlabs/xhandy | 现有的产品截图和宣传图（README 里的实际用法） | 自有 |
| [待填写] | [待填写] | [待填写] |

## AI 生成图片的来源记录模板

每张 AI 生成或 AI 编辑过的图，在图片旁边放一个同名 .provenance.yaml（或写进素材库），内容如下：

```yaml
file: <file name>
created: <YYYY-MM-DD>
by: <person>
tool: <app or API, e.g. the model name and version>
prompt: |
  <the full prompt as sent>
negative_prompt: <if used>
seed: <seed or "n/a">
settings: <size, steps, guidance, style presets>
inputs: <own files used as references, or "none"; never other people's images>
edits: <what was changed by hand after generation>
licence_terms: <link to the tool's output terms checked on the date above>
ai_label: <how the post or page discloses AI content, or "not required on <platform>">
content_credentials: <kept / stripped (C2PA metadata, if the tool writes it)>
approved_by: <owner>, <date>
```
