# Manager collection configs

One file per collection. Each `/manager/<collection>/page.jsx` is a ~10-line
wrapper that imports its config from here and hands it to the shared layout:

```jsx
<EditorialManagerList config={artworkManagerConfig} />
```

Nothing else imports these files — they are the **only** input the manager UI
needs. Adding a collection = add a file here + a page wrapper.

## Which file is for what

| File | Colour | Collection | Page | Modes |
| --- | --- | --- | --- | --- |
| `aboutManagerConfig.js` | `#7A5C3E` | About | `/manager/about` | List |
| `artistContactManagerConfig.js` | `#7E6B4F` | Artist contact | `/manager/artist-contact` | List |
| `artworkManagerConfig.js` | `#C2452D` | Artworks | `/manager/artwork` | Cards + List |
| `bibliographyManagerConfig.js` | `#4A6FA5` | Bibliography | `/manager/bibliography` | List |
| `enquireManagerConfig.js` | `#A34A3F` | Enquiries | `/manager/enquire` | List |
| `eventManagerConfig.js` | `#B07A1E` | Events | `/manager/event` | List |
| `exhibitionManagerConfig.js` | `#2F6F5E` | Exhibitions | `/manager/exhibition` | Cards + List |
| `imageManagerConfig.js` | `#3A5BA0` | Image library | `/manager/image` | Cards + List |
| `resumeManagerConfig.js` | `#5A6B7B` | CV / resume | `/manager/resume` | List |
| `seriesManagerConfig.js` | `#2E7D6B` | Series | `/manager/series` | List |
| `videoManagerConfig.js` | `#6B4C9A` | Videos | `/manager/video` | Cards + List |
| `webManagerConfig.js` | `#55606E` | Web links | `/manager/web` | List |
| `writingManagerConfig.js` | `#8A3B57` | Writings | `/manager/writing` | List |
| `subscribeManagerConfig.js` | `#5A6B7B` | Subscribers | `/manager/subscribe` | List |

`../schemaBatchGroupConfig.js` is **not** a list config — it defines the
columns/groups used by the batch-edit spreadsheets.

## Colour

Each config sets `accentColor` (see the table). `EditorialManagerList` renders it
as the small square left of the page title, so a manager page is recognisable at
a glance. Keep it muted — the manager UI is black-and-white by design.

## How a config is consumed

`EditorialManagerList` (`components/pages/manager/layouts/EditorialManagerList.jsx`)
reads the object in this order:

1. **Identity** — `title`, `api`, `createHref`, `batchEditHref`, `editHref`,
   `exportFn`, `extraLinks` (order/hover pages).
2. **Data / page settings** — `languageField` / `languageMode`, `sortRows`,
   `orderKey`, `searchFields`, plus page-level `filterFields`, `sortOptions`,
   `defaultSortOption`, `showArtistMeta`.
3. **Rows (list)** — `primaryField`, `metaFields`, `bodyField`, `coverField`,
   `captionFields`, `links`, `related` (strings or legacy object arrays).
4. **Filters** — `filterFields` selects/reorders the `filters` array (artwork
   derives it from `ARTWORK_FILTER_FIELDS`). Array fields match when any value
   matches; artist-ish filters auto-hide on artist sites. Empty `filterFields`
   hides the filter control.
5. **Ordering** — `sortOptions` (one option hides the Order-by control but still
   sorts; two or more show it). Artist sites default to year grouping.
6. **Grouping** — `groupBy.options` (year / A–Z / type / custom `getKey`).
7. **Cards** — `cardView` (omit it and the page has no Cards mode). Card view
   uses the shared flex-column masonry; `cardView.layout: "grid"` opts out.

## Editing rules

- **One translation per place.** Labels come from `components/labels/*` (registry
  in `managerLabels.js`); configs only reference keys.
- **Do not duplicate a field list.** If a collection has a `*_FIELDS` block,
  filters, rows and cards all read from it.
- Keep the header banner in each file accurate — it says what the file is, where
  it is used and which blocks to edit.

See also: [`docs/MANAGER_LIST_CONFIG.md`](../../../../../../docs/MANAGER_LIST_CONFIG.md).
