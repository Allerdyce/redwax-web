# Sample photography

The website uses 23 original generated fictional photographs, made with the built-in image_gen tool on 4 October 2026. No supplied training photographs were used as references.

The wedding reception leads the homepage: first dance, dance floor and speeches share the same couple and venue. A community business event supports moment review and face comparison. A courtyard wedding portrait demonstrates a restrained Style treatment. One furnished living room supplies three exposures and a balanced Listing result.

The culling examples deliberately contain sharp frames, meaningful closed-eye candids, dragged-shutter motion, available-light texture and genuine-looking autofocus misses. Duplicate examples reuse the corresponding keeper image. Captions match the visual reason; the two previously mismatched Maybe badges now say “Maybe · similar moment”.

These are illustrative sample assets, not photographs produced by RedWax and not evidence of implemented app features. The site remains a password-protected pre-launch preview.

`photography-prompts.json` records the full prompt set, generated master filenames and reference relationships. `photography-slots.json` maps the existing page layout classes to photographs. Responsive 640 px and 1280 px WebP files are in `public/assets/photos/`; the full 1536 × 1024 PNG masters and a review gallery are saved alongside this repository in `../RedWax-photography/`.

All creative alterations were generated with image_gen. Web assets were encoded and resized with Sharp; the site uses ordinary image crops for the face loupe. There are no colour or blur filters in CSS.

Run `npm test` to check the build, local asset targets and protected preview behaviour. `npm run dev` serves the local website for visual review.
