# Xhandy · Imagery guide

> Generated from brand.yaml (imagery.py). Edit brand.yaml and run it again.

## Style (draft, owner to confirm)

Real screenshots of the extension with the relevant part highlighted; promo images use the brand gradient background with the logo

## Checklist

Tick every line before an image goes out. (brand.yaml) rules are the owner's; (system) rules follow from the rest of the kit (template sizes, patterns, contrast).

- [ ] 1. **Do**: Screenshots from real X pages, with other people's avatars and names blurred (brand.yaml)
- [ ] 2. **Do**: Keep the numbers in screenshots real; never inflate them (brand.yaml)
- [ ] 3. **Do**: One set of screenshots per interface language (brand.yaml)
- [ ] 4. **Never**: Fake UI mock-ups or inflated view counts (brand.yaml)
- [ ] 5. **Never**: Stock photos and generic AI illustrations (brand.yaml)
- [ ] 6. **Never**: X's own logo used as decoration (brand.yaml)
- [ ] 7. **Rule** [hard]: Never build the mark like X's logo (a thick and a thin straight diagonal with a break) (brand.yaml)
- [ ] 8. **Rule** [soft]: The mark itself is pure black or white; brand colours go on the tile and backgrounds (brand.yaml)
- [ ] 9. Sizes follow the templates: `post` 1600x900, `quote` 1080x1080, `og` 1280x640, `slides` 1920x1080; export at 2x (e.g. 3200x1800) so platform compression keeps it sharp (system)
- [ ] 10. Text on an image keeps 4.5:1 against the worst patch of background behind it (3:1 for large text); add a panel when it does not (system)
- [ ] 11. Marks or patterns in a background stay at or below 15% opacity; the mark is never rotated, stretched or redrawn (system)
- [ ] 12. Brand colours are only cyan #06b6d4, violet #8b5cf6, pink #ec4899; neutrals #f7f6f9 / #1e1d23; no extra hues (system)
- [ ] 13. Every image has alt text in each language, describing what is really in it (system)
- [ ] 14. Images generated or edited with AI get the provenance note below; label AI content wherever the platform asks for it (system)

## AI image prompt templates

Only for the image types the style allows. {variables} are filled from the palette and keywords; `<angle brackets>` are for the person using it. The negative prompt comes from the Never list. Use the kit's own backgrounds first (showcase *-bgonly.png, webgl, brand_patterns); AI only when they do not fit.

> Keywords come from the personality traits (brand.yaml has no visual.imagery.keywords); ask the owner to confirm or add.

**Variables**: `palette_named` = cyan (#06b6d4) → violet (#8b5cf6) → pink (#ec4899); `mood` = Plain, Savvy, Handy; `aspect` = <16:9 | 1:1 | 2:1>; `text_side` = <left | right>; `neutral_desc` = <light #f7f6f9 | dark #1e1d23>

### Gradient background plate (promo images, slides, OG)

**Prompt**

```text
Abstract smooth gradient background, cyan (#06b6d4) → violet (#8b5cf6) → pink (#ec4899), soft diagonal flow from top-left to bottom-right, subtle film grain, large calm empty area on the <left | right> for a headline, no objects, no text, Plain, Savvy, Handy, flat 2D, <16:9 | 1:1 | 2:1>
```

**Negative prompt**

```text
Fake UI mock-ups or inflated view counts; Stock photos and generic AI illustrations; X's own logo used as decoration; text, letters, watermark, logos, user interface, people, hands, devices
```

### Texture behind a real screenshot

**Prompt**

```text
Soft blurred colour field in cyan (#06b6d4) → violet (#8b5cf6) → pink (#ec4899) on a <light #f7f6f9 | dark #1e1d23> base, very low contrast, out of focus, no shapes, no text, no interface, leaves the centre clear for a product screenshot placed on top, <16:9 | 1:1 | 2:1>
```

**Negative prompt**

```text
Fake UI mock-ups or inflated view counts; Stock photos and generic AI illustrations; X's own logo used as decoration; text, letters, watermark, logos, user interface, people, hands, devices
```

### Mood exploration for the owner (internal only, not published)

**Prompt**

```text
Moodboard of colour and light only: cyan (#06b6d4) → violet (#8b5cf6) → pink (#ec4899), Plain, Savvy, Handy; no people, no devices, no logos, no text, <16:9 | 1:1 | 2:1>
```

**Negative prompt**

```text
Fake UI mock-ups or inflated view counts; Stock photos and generic AI illustrations; X's own logo used as decoration; text, letters, watermark, logos, user interface, people, hands, devices
```

## Reference links

Look only: never download or reuse other people's images. Licence status: own, needs licence, or reference only.

| Link | What to look at | Licence status |
|---|---|---|
| github.com/jackxlabs/xhandy | Existing product screenshots and promo images (how the README uses them today) | own |
| [to fill] | [to fill] | [to fill] |

## Provenance note for AI-generated images

For every image generated or edited with AI, keep a <name>.provenance.yaml next to the file (or in the asset library):

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
