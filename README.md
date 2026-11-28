# UOBCOM 101

Student-built site for University of Baghdad College of Medicine, Year 1 (101), Term 1, 2026–27.

Fully static: just open `index.html`, or host the folder on GitHub Pages / Netlify / Cloudflare Pages.

- **Home**: intro video and FAQ
- **Schedule**: group A/B/C and subgroup filtering, week view, full term list (data is embedded in `index.html`)

Fonts load from Google Fonts when online. Your group choice is kept in your browser only.
- **Halls**: hall guide with floor plans and search (Arabic)
- **Lectures**: slide viewer (arrows, swipe, thumbnails, full screen) with an optional YouTube video that follows the slides

## Adding a lecture
```
python3 tools/add-lecture.py my-lecture.pdf --id anatomy-1 --subject "Anatomy" \
  --title "Introduction" --video "https://youtu.be/XXXXXXXXXXX" --sync "1:0,6:312:Bones"
```
Needs Pillow and poppler (`pdftoppm`). Each PDF page becomes one slide (`lectures/<id>/`), and the list lives in `lectures/index.js`. Commit and push to publish. `--video` and `--sync` (slide:seconds[:label]) are optional.
