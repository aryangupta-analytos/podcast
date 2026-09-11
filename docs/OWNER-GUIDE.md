# Running your podcast website

This guide is for whoever runs The Silicon Valley Tech Podcast. There is no
code in it, and you never need to open one of those developer tools to do
anything described here.

---

## Signing in

Go to **yourdomain.com/admin** and sign in with your email and password.

That address is deliberately not linked anywhere on the website, so visitors
won't stumble into it. Bookmark it.

If you forget your password, ask your developer to run one command that resets
it. Nobody — including them — can read your existing password.

---

## Publishing a new episode

From the dashboard, click **＋ Add Episode**.

### 1. The basics

- **Episode title** — what listeners see everywhere.
- **Short description** — one or two sentences. This appears in episode lists
  and in Google search results, so make it read like a sentence rather than a
  list of keywords.
- **Episode number** and **Season** — optional.
- **Publish date** — today's date is filled in already. Setting a *future* date
  schedules the episode: it stays hidden until then, and appears on its own.

### 2. Audio and artwork

Drag your audio file onto the box, or click it and pick the file. You'll see a
progress bar while it uploads — a long episode over a home connection can take
a few minutes, and you can keep filling in the rest of the form while it goes.

Accepted: MP3, M4A, WAV, OGG, FLAC. Up to 500 MB.

Do the same for the **episode thumbnail**. Square images look best. Whatever you
upload is automatically resized and compressed, so you don't need to prepare it
first — drag the photo straight off your phone if you like.

### 3. Guests

Type the guest's name and click **Add**.

If they've been on the show before, their name will autocomplete and they keep
the same profile and photo they already have. If they're new, you'll see a
"new" tag and a box where you can paste a photo URL — or leave it blank and add
their photo later under **Hosts & Guests**.

### 4. Show notes

The longer description shown on the episode's own page. You can use simple
formatting: paragraphs, **bold**, links, bullet lists.

### 5. Listen elsewhere

Optional links to the episode on Spotify, YouTube or Apple Podcasts. These
appear as buttons on the episode page.

### 6. Publish

- **Save episode** — keeps it as a draft. Nobody can see it but you.
- **Save and publish** — puts it live immediately.

The moment you publish, all of this happens by itself:

- The episode appears on the homepage.
- It appears in the episode archive.
- It gets its own page, at `yourdomain.com/episodes/episode-title`.
- The audio player works.
- The guest gets a profile page listing their episodes.
- It's added to your podcast feed, so Apple Podcasts, Spotify and other apps
  pick it up and notify subscribers.

There is nothing else to do, and nothing to "deploy".

---

## Changing an episode after publishing

**Manage Episodes** lists everything. Click any title to edit it.

From the list you can also, without opening the episode:

- **Publish / Unpublish** — unpublishing hides it from the website and the
  podcast feed immediately, but keeps everything so you can put it back.
- **Feature** — pins it to the top of the homepage.
- **↑ ↓** — change the order episodes appear in.

To remove an episode permanently, open it and use **Delete episode** at the
bottom. The audio and image files stay in your media library.

---

## Editing the homepage

**Edit Homepage** controls every part of the front page:

| Section             | What you can change                                            |
| ------------------- | -------------------------------------------------------------- |
| Show identity       | Podcast name, tagline, description, cover artwork              |
| Hero                | The big heading, the text under it, the image, both buttons     |
| Featured episode    | Which episode is highlighted — or "newest", which self-updates  |
| Sections            | Every heading, how many episodes to list, what to show or hide  |
| About block         | The short version of your story shown on the homepage           |
| Search & sharing    | The title and description Google shows, and the sharing image   |

Each section has a checkbox to hide it entirely. Nothing is permanent — turn it
back on whenever.

**Tip:** leave the featured episode on *"Newest published episode"*. The
homepage then keeps itself current forever with no work from you.

---

## Hosts, team and guests

**Hosts & Guests** manages everyone on the site, in three groups:

- **Hosts** — shown in the sidebar on every page of the website.
- **Team** — producers and advisors, shown on the homepage and About page.
- **Guests** — created automatically whenever you add one to an episode.

For each person you can set a photo, job title, bio, and links to LinkedIn, a
website, X or GitHub. **Hide** removes someone from the website without deleting
their record or their episode credits.

---

## Images and audio

**Images & Audio** is everything you've ever uploaded. Drop new files in to add
them, add alt text to images (this is the description screen readers announce,
and it helps with search), or delete files you no longer need.

Deleting a file that an episode is still using will leave a broken image on that
episode, so check before you delete.

---

## Social links and your podcast feed

**Social Links** has three lists:

- **Where to listen** — Apple Podcasts, Spotify, Podbean and so on. These show
  as icons in the sidebar.
- **Social profiles** — LinkedIn, Facebook, X, YouTube. Shown in the sidebar and
  the footer.
- **Extra navigation links** — anything else you want in the site menu.

At the bottom of that page is **your podcast feed address**. This is what you
give to Apple Podcasts, Spotify and other directories. Once they have it, every
episode you publish reaches subscribers automatically.

---

## Messages

**Messages** collects everything sent through your contact page: the sender's
name, email, and what they wrote. Click their email address to reply in your
normal email program.

---

## Your account

**Account** is where you change your password. Changing it signs you out on
every device, including the one you're using — that's intentional, so a
forgotten session somewhere else can't stay signed in.

Use a password you don't use anywhere else, and store it in a password manager.

---

## Common questions

**Do I need to "publish the website" after changing something?**
No. Every change is live the moment you save it.

**I published an episode but don't see it on the homepage.**
Check its status is *Published* and its publish date isn't in the future. If you
changed something seconds ago, give the page a refresh — the site keeps a very
short cache to stay fast.

**Can I write an episode now and release it Monday morning?**
Yes. Set the publish date to Monday and click **Save and publish**. It stays
hidden until then and goes live on its own.

**How big can an audio file be?**
Up to 500 MB, which is far more than a normal episode needs.

**I accidentally deleted something.**
Deletions are permanent. If it was an episode, the audio and image files are
still in **Images & Audio**, so you can create it again without re-uploading.

**Can someone else help me manage the site?**
Yes — your developer can create a second login for them.
