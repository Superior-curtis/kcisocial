# Campus Media (Test)

Student-built community app for testing.

**New site (active):** https://campusmedia-01.web.app

**Old site:** https://kcismedia-3ad38.web.app (maintenance page with a button linking to the new site)

![KCIS Social](https://img.shields.io/badge/React-18.3-blue)
![Firebase](https://img.shields.io/badge/Firebase-11.0-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 Features

### Core Features
- **🔐 Authentication**: Secure login via Google OAuth
- **📝 Posts**: Create, edit, and delete posts with text, images, videos, and GIFs
- **💬 Real-time Chat**: Private messaging and group conversations with AI assistant support
- **👥 Social Interactions**: Like, comment, save posts, follow users
- **🎨 Customization**: Personal profile backgrounds and app themes
- **🔔 Notifications**: Real-time notifications for likes, comments, follows, and messages
- **🔍 Search**: Find users, posts, and content across the platform
- **🏫 Clubs**: Create and manage school clubs with announcements and events

### User Profiles
- Customizable profile with avatar and background (image/video support)
- Bio and role badges (Student, Teacher, Admin)
- Online status visibility controls
- Posts and saved content grids with video thumbnails
- Follower/following statistics

### Media Management
- **Cloudinary Integration**: Efficient image and video uploads with automatic optimization
- **Firebase Storage Fallback**: Reliable backup storage solution
- Support for images, videos, and GIFs
- Video thumbnail generation with playback icons

### AI Features
- **AI Assistant**: Integrated chatbot for answering questions
- **Content Moderation**: Automatic detection of inappropriate content (powered by OpenAI)

### Themes & Personalization
- Dark/Light mode support
- Custom app theme backgrounds (visible only to you)
- Profile backgrounds (visible to everyone)
- Responsive design for mobile and desktop

## 🚀 Tech Stack

### Frontend
- **React 18.3** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **React Router** for navigation
- **Tanstack Query** for data fetching

### Backend & Services
- **Firebase Authentication** for user management
- **Firebase Firestore** for database
- **Firebase Storage** for media backup
- **Cloudinary** for optimized media delivery
- **OpenAI API** for AI features

### Additional Libraries
- **Lucide React** for icons
- **date-fns** for date handling
- **react-hook-form** for form management
- **zod** for validation

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project
- Cloudinary account
- OpenAI API key (optional, for AI features)

### Setup Instructions

1. **Clone the repository**
```bash
git clone https://github.com/Superior-curtis/kcisocial.git
cd kcisocial
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Firebase**
   
   Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   
   Enable:
   - Authentication (Google provider)
   - Firestore Database
   - Storage
   - Hosting

4. **Set up environment variables**

   Create `src/lib/firebase.ts` with your Firebase config:
   ```typescript
   import { initializeApp } from 'firebase/app';
   import { getAuth, GoogleAuthProvider } from 'firebase/auth';
   import { getFirestore } from 'firebase/firestore';
   import { getStorage } from 'firebase/storage';

   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };

   const app = initializeApp(firebaseConfig);
   export const auth = getAuth(app);
   export const googleProvider = new GoogleAuthProvider();
   export const firestore = getFirestore(app);
   export const storage = getStorage(app);
   ```

5. **Configure Cloudinary**

   Add your Cloudinary credentials to `src/lib/storage.ts`:
   ```typescript
   const CLOUDINARY_CLOUD_NAME = 'your_cloud_name';
   const CLOUDINARY_UPLOAD_PRESET = 'your_upload_preset';
   ```

6. **Configure OpenAI (Optional)**

   Add your OpenAI API key to `src/lib/openai.ts` for AI features.

7. **Set up Firestore Security Rules**

   Deploy the security rules from `firestore.rules`:
   ```bash
   firebase deploy --only firestore:rules
   ```

8. **Run development server**
```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## 🔨 Build & Deploy

### Build for production
```bash
npm run build
```

### Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

### Deploy everything (hosting + rules)
```bash
firebase deploy
```

## 📁 Project Structure

```
kcis-connect-main/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── layout/     # Layout components (Header, Nav)
│   │   ├── post/       # Post-related components
│   │   ├── profile/    # Profile components
│   │   └── ui/         # shadcn/ui components
│   ├── contexts/       # React contexts (Auth, etc.)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility libraries
│   │   ├── firebase.ts # Firebase configuration
│   │   ├── firestore.ts # Firestore helpers
│   │   ├── storage.ts  # Media upload utilities
│   │   └── openai.ts   # OpenAI integration
│   ├── pages/          # Page components
│   ├── types/          # TypeScript type definitions
│   └── main.tsx        # Application entry point
├── firestore.rules     # Firestore security rules
├── firestore.indexes.json # Firestore indexes
├── firebase.json       # Firebase configuration
└── package.json        # Dependencies and scripts
```

## 🔒 Security

- **Testing disclaimer**: This is for testing; not an official school website
- **Firestore Security Rules**: Strict rules to protect user data
- **Content Moderation**: AI-powered detection of inappropriate content
- **Authentication**: Secure Google OAuth via Firebase

## 🛠️ Deploy notes

- **Deploy new site (campusmedia-01):** `firebase deploy --only hosting --project campusmedia-01`
- **Deploy old site maintenance page (kcismedia-3ad38):** `firebase deploy --only hosting --project kcismedia-3ad38 --config firebase.old.json`

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
