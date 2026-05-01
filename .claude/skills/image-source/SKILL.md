---
name: image-source
description: Source, download, and wire up a hero image for a patient-app article. Use when an article (especially under content/articles/en/) has no `hero` frontmatter set, when the user asks to add an image, says "the article needs a photo", or asks why a card shows a broken-image icon. Searches Unsplash, downloads via curl, places the JPG at the asset path, and updates frontmatter + photo credit. Triggered after `article-intake` if the upstream SEO workflow's image step was skipped.
---

# image-source (patient app)

The article-intake skill in this repo deliberately doesn't fabricate hero paths ("Never invent a path that does not exist"). The upstream SEO workflow has an image step that runs before handoff, but when articles are created ad-hoc here, no image is sourced. This skill closes that gap.

## When to invoke

- An article was just written but has no `hero` field, OR `hero` points to a path that doesn't exist on disk.
- The user asks to add a hero image to a specific article.
- The user notices a broken-image icon on `/learn` cards.

## Inputs needed

| Input | How to get it |
|---|---|
| Article path | `content/articles/en/<topic>/<slug>.mdx` or `_pillar.mdx` |
| Image theme | The article title and `description` give the visual cue. Lean toward calm, photographic, soft daylight (matches existing pillars). |
| Audience | The `audience` frontmatter field. A men-only article shouldn't get a stock-photo woman; gender-neutral imagery (objects, scenes, abstract) is usually safer. |

## Workflow

### Step 1: Search Unsplash for candidates

Use WebSearch with `allowed_domains: ["unsplash.com"]`. Search query patterns that have worked:

- For nocturia / sleep: `bedside clock night dim light`, `moonlit window bedroom`
- For hydration / drinking: `glass of water morning light`
- For pelvic floor / training: `calm wave shore`, `path through woods`
- For surgery / recovery: `walking shoes path daylight`

Pick a photo that's:
- Calm and photographic (not staged, not stock-portrait, not graphic medical)
- Soft natural light, neutral palette (matches the existing `bladder-training` and `post-prostatectomy` aesthetic)
- License: standard Unsplash (free for commercial use, attribution appreciated — we credit at the article footer)

### Step 2: Resolve the photo's id

Unsplash photo URLs are `unsplash.com/photos/<descriptive-slug>-<id>` where `<id>` is the trailing 11-char alphanumeric segment. Example: in `unsplash.com/photos/turned-on-gray-alarm-clock-displaying-1011-ZMZHcvIVgbg`, the id is `ZMZHcvIVgbg`.

You'll need the **id** for the download URL, not the slug.

### Step 3: Determine the asset path

Per `content/README.md`'s asset folder layout:

| Article type | Path on disk | URL referenced from frontmatter |
|---|---|---|
| Pillar (`_pillar.mdx`) | `public/articles/<topic>/<topic>-hero.jpg` | `/articles/<topic>/<topic>-hero.jpg` |
| Cluster (`<slug>.mdx`) | `public/articles/<topic>/<slug>/hero.jpg` | `/articles/<topic>/<slug>/hero.jpg` |

Pillar assets sit at the topic level; cluster assets are nested under a slug folder.

### Step 4: Download

```bash
mkdir -p public/articles/<topic>[/<slug>]
curl -sL -o <asset-path> "https://unsplash.com/photos/<id>/download?force=true&w=1600"
file <asset-path>   # verify it's a real JPEG, not an HTML error page
```

Width `w=1600` is a reasonable hero size. Unsplash compresses to roughly 200 KB at that width, which is under the 400 KB target in `content/README.md`. If the download exceeds 400 KB, run the upstream SEO workflow's `image-optimize` skill (or use `sips -Z 1600 -s formatOptions 80` locally).

### Step 5: Update frontmatter

Add (or replace) these two fields, placed before `readingTimeMin`:

```yaml
hero: "/articles/<topic>/<topic>-hero.jpg"
heroAlt: "<one sentence describing the image, paired with the article's framing>"
```

`heroAlt` should describe what's visible AND echo the article's central frame, like the existing pillars:

- bladder-training: *"A gentle wave breaking on a calm sandy shore in soft daylight: bladder training reframes the urge as a wave, not a cliff"*
- nocturia: *"A bedside alarm clock glowing in the dim of a quiet bedroom at night: nocturia is the signal at the bathroom, but the source can be the bladder or the kidneys"*

Match that two-clause pattern: visual, then frame.

### Step 6: Add the photo credit footer

Match the existing pattern. Disclaimer line at the bottom of the article, append:

```
Photo: [Photographer Name](https://unsplash.com/@<username>?utm_source=bladderdiaries&utm_medium=referral) on [Unsplash](https://unsplash.com/photos/<descriptive-slug>-<id>?utm_source=bladderdiaries&utm_medium=referral).
```

The `utm_source=bladderdiaries&utm_medium=referral` query params honor Unsplash's attribution guidelines. Use them on both links.

### Step 7: Translation fan-out

Editing the EN article triggers the `article-translate` PostToolUse hook. Spawn 5 subagents (or do it inline) to mirror the changes into `content/articles/{fr,es,pt,zh,ar}/<topic>/<slug>.mdx`:

- `hero` is verbatim across all locales (same image)
- `heroAlt` is **translated**
- The disclaimer footer is **translated** but the photographer name and both Unsplash URLs (with utm params) stay verbatim

### Step 8: Verify

- `npm run build` should still pass
- `npm run dev` and visit `/<locale>/learn/<topic>` (or `/<topic>/<slug>`) to confirm the hero renders, in at least 2 locales (EN + one RTL or non-Latin)

## What NOT to do

- **Never invent** an Unsplash URL — verify it exists by visiting the photo page first
- **Never download** without setting the asset path correctly per the layout above; mis-filed assets become orphans
- **Never skip the photo credit** — it's a license requirement and a project-wide convention
- **Never use copyrighted or paywalled imagery** (Getty, Shutterstock, etc.) — Unsplash, or another freely-licensed source
- **Never auto-pick a man-only or woman-only photo** for a `audience: ["men", "women"]` article — go gender-neutral (objects, abstract, neutral scenes)

## Sibling skills

- `article-intake` — places articles, sets most frontmatter, leaves `hero` blank by design
- `article-translate` — fans out EN → 5 locales after this skill edits the EN article
- `cta-placer` — adds the DiaryCta card; runs independently of imagery
