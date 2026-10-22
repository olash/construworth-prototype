# Construworth Consult website prototype

Two design directions, built as static sites for client review:

- `round-1/`: light "site office" direction with the QS Desk
- `round-2/`: condensed "schedule" direction with cost tools and a night-theme case study

Each folder is its own Vercel project (root directory = the folder). On deploy, `prepare.mjs`
copies `site/` to `public/` and fetches the firm's logo and project photography from
construworth.com, resized with sharp. Pages are marked `noindex`.
