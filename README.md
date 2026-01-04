# Campus Media (Test)

Student-built community app for testing.

**New site (active):** https://campusmedia-01.web.app

**Old site:** https://kcismedia-3ad38.web.app (maintenance page with a button linking to the new site)

> Disclaimer: 僅供測試用途，並非學校官方網站。

## What this repo is

This is a React + Vite web app that uses Firebase (Auth/Firestore/Hosting) to provide a lightweight community experience.

## Key features

- Google sign-in (Firebase Auth)
- Posts, likes, comments, saves
- Real-time chat
- Profile pages + cover background
- Clubs / communities
- Music room (shared playback state / sync)
- Notifications

## Tech stack

- React + TypeScript + Vite
- Tailwind + shadcn/ui
- Firebase Auth + Firestore + Hosting

## Local development

### Prerequisites

- Node.js 18+
- Firebase project(s)

### Setup

1) Install dependencies

```bash
npm install
```

2) Create a local env file

- Copy `.env.example` to `.env`
- Fill in your Firebase values

Notes:
- `.env` is intentionally git-ignored.
- Do not commit secrets.

3) Run dev server

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

This repo supports deploying to two Firebase Hosting projects:

### Deploy the new site (active)

```bash
npx -y firebase-tools deploy --only hosting --project campusmedia-01
```

### Deploy the old site (maintenance page)

The old site is intentionally set to a static maintenance page that links to the new site.

```bash
npx -y firebase-tools deploy --only hosting --project kcismedia-3ad38 --config firebase.old.json
```

## Repo notes

- Old-site maintenance page source: `maintenance-dist/index.html`
- Old-site deploy config: `firebase.old.json`

## 🎯 Key Features Explained

### Profile Backgrounds
Users can upload custom backgrounds (images or videos) that appear on their profile page. The system supports:
- Image backgrounds with gradient overlays
- Video backgrounds with autoplay
- Fallback to gradient if no background is set

### App Themes
Each user can set a personal app theme that applies to all pages except the profile:
- Only visible to the user who set it
- Supports image backgrounds
- Semi-transparent content overlay for readability

### Media Uploads
The platform uses a dual-storage strategy:
1. **Primary**: Cloudinary for optimized delivery
2. **Fallback**: Firebase Storage for reliability

### AI Assistant
The platform includes an AI assistant that:
- Answers general questions
- Provides information about the school
- Uses OpenAI's GPT model
- Appears as a special user in messages

## 🐛 Known Issues & Limitations

- File uploads limited to 10MB for images, 25MB for videos
- Real-time updates may have slight delays
- AI features require OpenAI API key

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**Curtis Chen (陳樺)**
- GitHub: [@Superior-curtis](https://github.com/Superior-curtis)
- Project: [KCIS Social](https://github.com/Superior-curtis/kcisocial)

## 🙏 Acknowledgments

- KCIS (Kang Chiao International School) community
- Firebase for backend services
- Cloudinary for media management
- OpenAI for AI capabilities
- shadcn/ui for beautiful components

---

Built with ❤️ for KCIS students and staff
