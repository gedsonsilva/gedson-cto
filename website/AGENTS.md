# Website agent guide: adding and editing blog posts

Keep website content, dependencies, tests, and tooling inside `website/`; the repository root may contain unrelated projects. All paths and commands below are relative to `website/`.

## Current structure

The blog is code-based: there is no database, CMS/admin editor, or Markdown loader.

| File | Responsibility |
| --- | --- |
| `lib/posts.ts` | Exports the `Post` type and ordered `posts` array; all article metadata and body content live here. |
| `app/blog/page.tsx` | Blog index; renders every post in array order. |
| `app/blog/[slug]/page.tsx` | Shared article template, slug lookup, static route parameters, and title/description metadata; unknown slugs return not found. |
| `components/PostCard.tsx` | Shared homepage/blog cards linking to `/blog/<slug>`. Artwork and note numbers depend on array index. |
| `app/page.tsx` | Homepage; its writing section currently renders every post in array order too. |

## Add a post

1. Edit `lib/posts.ts` and add an object to the existing `posts` array. No new page file or route registration is needed.
2. Supply every field shown below. Use a unique, URL-safe kebab-case slug. Reading time is manually supplied, not calculated.
3. Choose its array position: first means first on both the homepage and blog index. There is no date-based sorting.
4. Update the hardcoded article count in `app/blog/page.tsx` (`03` initially) to match the total. It is not calculated automatically today.
5. Preview and verify as described below, then rebuild/redeploy the live website using its deployment process. Editing a local file alone does not publish it.

Example object to insert into the array (replace all sample content):

```ts
{
  slug: 'designing-reliable-ai-workflows',
  title: 'Designing reliable AI workflows',
  category: 'AI ARCHITECTURE',
  readTime: '5 min read',
  summary: 'A short introduction used on cards and the article page, and as its metadata description.',
  sections: [
    {
      heading: 'Start with the workflow',
      paragraphs: [
        'Write the first paragraph here.',
        'Write another paragraph here.',
      ],
    },
    {
      heading: 'Make failure visible',
      paragraphs: ['Continue the article here.'],
    },
  ],
},
```

These are TypeScript string values: escape apostrophes inside single-quoted strings, or choose suitable quoting. Body content is rendered as plain text headings and paragraphs, not parsed Markdown or HTML. Links, lists, images, or rich formatting need a separate rendering/schema change; Markdown syntax will not create those elements.

## Edit an existing post

Find its object in `lib/posts.ts` and update its title, summary, category, reading time, or sections. The shared cards and article page consume the same data; do not duplicate the content in page components.

Keep the slug stable when editing published articles so existing links continue working. A slug change changes the URL; there is no redirect mechanism implemented here. Section headings and paragraph text are React keys in the current template, so avoid duplicate headings within an article and duplicate paragraph strings within a section.

The article template currently identifies the author as Gedson Silva for every post. There are no per-post author, publication date, draft, or featured fields. Every object in the array is public when deployed: do not add unfinished drafts expecting them to be hidden. Preserve factual accuracy; do not invent client work or accomplishments.

## Homepage placement / featuring

**Current behavior:** both homepage and blog index render all posts with `posts.map(...)`. Adding a post automatically adds its card to both pages. Move it to the beginning of the array to give it the first position on both pages.

There is no independent featured toggle, homepage-only ordering, or three-post limit. A future option is a `featured` field and a homepage selection limited to three posts, while retaining all posts on the blog index. That is a recommendation, **not an implemented or requested behavior**: do not assume it exists or implement it as part of a routine content edit.

## Verify before publishing

From `website/`:

```sh
make install       # first checkout, or after dependency/lockfile changes
make typecheck
make test
make build
make dev           # open http://localhost:3000; stop with Ctrl+C
```

Check the homepage, `/blog`, and `/blog/<your-slug>` in the browser: correct position, count, title, summary, reading time, section layout, and working card links. Existing articles should remain reachable. Review narrow/mobile layout for unusually long titles. `make help` lists local commands; `make dev PORT=3001` selects another port.

When changing the schema or selection/rendering behavior rather than just content, add/update relevant permanent tests. Keep this guide current if the publishing workflow changes.
