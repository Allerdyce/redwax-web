# Before opening the preview

- Replace the current illustrative photo placeholders with the selected photography. Add images to `public/assets/`, use explicit dimensions and appropriate alternative text, and check mobile crops and dark appearance.
- Confirm rights for all launch photography.
- Check that `support@redwaxapp.com` receives mail.

# Before releasing the app

- Confirm which culling, Vision and learning features have shipped; the supplied spec describes features still in development.
- Confirm availability, prices, trials, release dates, supported macOS version and export behavior against the actual release.
- Set the real Mac App Store URL in `site.config.json`. The generic store homepage is intentionally rejected.
- Replace `src/pages/privacy.html` with the final approved policy. Review `APP-PRIVACY-DRAFT.txt` for the incomplete update date, email retention period and postal address. Confirm the publisher name and the app's actual collection/diagnostic behavior.
- Confirm the appropriate terms/licence link.
- Set `privacyApproved` to `true` and `status` to `released`. The build will reject a release with a missing download URL or the pre-release privacy text.
- Verify password entry, navigation, target slider, details/FAQs and every download/contact link in the deployed version on desktop and mobile.
- Set `PREVIEW_GATE=off` and redeploy only when ready. Check `redwaxapp.com` and `www.redwaxapp.com`, HTTPS, search metadata and robots.txt.

Keep the password in Vercel environment settings and `.env.local`, never source files or pull-request descriptions.
