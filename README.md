# stackshelf

a minimal black and white diary for the tech resources you learn from. log books, lectures, courses, papers and repos, rate them, group them by domain, and see what other people are using.

plain html, css and javascript. no build step, no dependencies.

## features

- sign in / create account page
- shelf: log any resource with url, title, domain, type, status, rating and notes
- automatic covers: youtube thumbnails, book covers from an isbn (open library), your own image url, or an uploaded image. falls back to a generated cover
- popular: resources ranked by how many shelves they are on, with one-click add
- export and import your shelf as json
- light and dark theme

## run locally

```bash
git clone https://github.com/<your-username>/stackshelf.git
cd stackshelf
python3 -m http.server 8000
```

open http://localhost:8000. you can also just double-click `index.html`.

## publish on github pages

1. create a new empty repository on github, for example `stackshelf`
2. from this folder:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/<your-username>/stackshelf.git
git push -u origin main
```

3. on github open **settings → pages**
4. under **build and deployment**, set source to **deploy from a branch**, pick `main` and `/ (root)`, then save
5. after a minute your site is live at `https://<your-username>.github.io/stackshelf/`

## how accounts and data work right now

this version is fully static, so everything is stored in the visitor's own browser (`localStorage`):

- accounts exist only on the device where they were created. passwords are salted and hashed, but there is no server, so this is a demo login, not real security
- shelves are private to that browser
- the popular list combines the sample data in `app.js` (`COMMUNITY`) with every account on the same browser. the numbers on the sample entries are placeholders

to get real accounts, shelves that follow people across devices, and a popular list that reflects real users, you need a backend. the code is set up for this: all reads and writes go through the small `store` object near the top of `app.js`.

## going multi-user with supabase (free tier)

1. create a project at supabase.com
2. open the sql editor and run `schema.sql` from this repo. it creates a `resources` table with row level security and a `popular_resources` view
3. in `app.js`, replace the `store` functions and the sign in / sign up handlers with calls to `@supabase/supabase-js`:
   - `supabase.auth.signUp` / `signInWithPassword` instead of the local user table
   - `supabase.from('resources').select()` / `insert()` / `update()` / `delete()` for the shelf
   - `supabase.from('popular_resources').select()` for the popular tab, and remove the `COMMUNITY` seed
4. the supabase anon key is meant to be public, so it is safe to put in client code as long as row level security stays on

## files

```
index.html   page structure (sign in, shelf, popular, modal)
style.css    all styling
app.js       logic, local storage adapter, auth, covers
schema.sql   optional supabase schema for going multi-user
```

## license

mit. do what you like with it.
