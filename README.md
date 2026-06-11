# Ruei-Che Chang — Academic Website

A minimal, text-focused static academic website (style modeled after [sunniesuhyoung.github.io](https://sunniesuhyoung.github.io/)). No build step, no framework — just two HTML pages and one stylesheet, perfect for GitHub Pages.

## Structure

```
index.html        # Home: bio, news, selected papers, contact
papers.html       # Full publication list grouped by year
css/style.css     # All styling (white bg, serif name, yellow highlights, coral accents)
assets/img/       # Profile photo
assets/pdf/       # Paper PDFs and CV
CNAME             # Custom domain (rueiche.com) — delete if not using one
```

Fonts are loaded from Google Fonts (Source Serif 4 + Mulish, close stand-ins for the reference site's Kepler + Avenir Next). Icons come from Font Awesome 4 CDN.

## Deploy to GitHub Pages

### User site at `rueichechang.github.io`

```bash
cd rueiche_website
git init
git add -A
git commit -m "New academic website"
git remote add origin git@github.com:rueichechang/rueichechang.github.io.git
git branch -M main
git push -u origin main --force   # replaces the old site
```

Then in the repo: **Settings → Pages → Source: Deploy from a branch → `main` / root**.

### Custom domain

The `CNAME` file points to `rueiche.com`. Keep your DNS records pointing at GitHub Pages (as they do for the current site) and the domain will carry over. If you don't want the custom domain, delete `CNAME` before pushing.

## Editing content

- **News**: add a line at the top of `p.news` in `index.html`:

```html
<span class="news-date">07/2026</span>: <span class="news-text">Something exciting!</span><br />
```

- **Papers**: copy an existing `<p class="paper">` block in `papers.html` (and `index.html` if it's a selected paper) and edit. Award text goes inside `<span class="paper-award">` after the venue. Press/award footnotes go in `<span class="note">`.

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
