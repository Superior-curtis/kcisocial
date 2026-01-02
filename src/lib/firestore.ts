import type { User as FirebaseUser } from "firebase/auth";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, firestore } from "./firebase";
import { uploadBase64Media, UploadProgressCallback } from "./storage";
import { User, UserRole, Post, Conversation, Message, Club } from "@/types";

const SCHOOL_DOMAIN = "kcis.com.tw";
const ADMIN_EMAILS = ["huachen0625@gmail.com"];

export const isSchoolEmail = (email?: string | null) => {
  if (!email) return false;
  const lowerEmail = email.toLowerCase();
  return lowerEmail.endsWith(`@${SCHOOL_DOMAIN}`) || ADMIN_EMAILS.includes(lowerEmail);
};

const usersCollection = collection(firestore, "users");
const postsCollection = collection(firestore, "posts");
const postMediaCollection = collection(firestore, "postMedia"); // Store media separately to avoid document size limits
const likesCollection = collection(firestore, "likes");
const commentsCollection = collection(firestore, "comments");
const messagesCollection = collection(firestore, "messages");
const clubsCollection = collection(firestore, "clubs");
const savedCollection = collection(firestore, "saved");
const notificationsCollection = collection(firestore, "notifications");
const followsCollection = collection(firestore, "follows");

export async function uploadMedia(file: File, folder: string) {
  // This function is deprecated - use storage.ts uploadMedia instead
  console.warn('firestore.uploadMedia is deprecated, use storage.uploadMedia instead');
  try {
    // For backwards compatibility, convert to base64
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('File conversion error:', error);
    throw error;
  }
}

export async function compressAndUploadImage(file: File, folder: string, maxWidth: number = 1280): Promise<string> {
  try {
    // For images, compress before converting to base64
    if (file.type.startsWith('image/')) {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Scale down if too large
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }
            
            ctx.drawImage(img, 0, 0, width, height);
            // Compress as JPEG with 80% quality
            const compressed = canvas.toDataURL('image/jpeg', 0.8);
            
            // Check if compressed size is acceptable
            const sizeInBytes = compressed.length * 0.75; // Approximate actual size
            if (sizeInBytes > 500 * 1024) {
              reject(new Error(`Compressed image still too large (${Math.round(sizeInBytes / 1024)}KB). Please use a smaller image.`));
              return;
            }
            
            resolve(compressed);
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    } else {
      // For videos, just use uploadMedia
      return uploadMedia(file, folder);
    }
  } catch (error) {
    console.error('Compression error:', error);
    throw error;
  }
}

interface UserRecord {
  id?: string;
  email: string;
  username?: string;
  displayName?: string;
  name?: string;
  photoURL?: string;
  profileImageUrl?: string;
  profileBackground?: string;
  appTheme?: string;
  role: UserRole;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  isVerified?: boolean;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  bio?: string;
  onlineStatus?: string;
  lastSeen?: Timestamp;
}

export type { UserRecord };

interface PostRecord {
  authorId: string;
  authorType: "user" | "club" | "official";
  clubId?: string | null;
  content: string;
  media?: string[]; // Cloud Storage URLs or base64 (legacy)
  mediaIds?: string[]; // Deprecated - kept for backwards compatibility
  createdAt: Timestamp;
  likesCount?: number;
  commentsCount?: number;
  ratingCount?: number;
  ratingSum?: number;
  type?: Post["type"];
}

interface CommentRecord {
  postId: string;
  authorId: string;
  content: string;
  imageUrl?: string;
  mediaType?: string;
  createdAt: Timestamp;
}

interface MessageRecord {
  conversationId: string;
  senderId: string;
  receiverId: string;
  participants: string[];
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  isRead: boolean;
  createdAt: Timestamp;
}

interface ClubRecord {
  name: string;
  description: string;
  avatar?: string;
  coverImage?: string;
  members?: string[];
  admins?: string[];
  createdBy: string;
  createdAt: Timestamp;
  isApproved: boolean;
  requiresApproval?: boolean; // Whether joining requires admin approval
  postingPermission?: 'everyone' | 'admins-only'; // Who can post in the club
}

interface NotificationRecord {
  userId: string;
  fromUserId: string;
  type: "like" | "comment" | "message" | "follow" | "club";
  postId?: string;
  content?: string;
  createdAt: Timestamp;
  isRead: boolean;
}

const profileCache = new Map<string, User>();

const toUser = (id: string, data: UserRecord): User => ({
  id,
  email: data.email,
  displayName: data.name || data.displayName || data.email.split("@")[0],
  username: (data.username || data.name || data.displayName || data.email.split("@")[0])
    .replace(/\s+/g, "")
    .toLowerCase(),
  avatar: data.photoURL || data.profileImageUrl,
  profileBackground: data.profileBackground,
  appTheme: data.appTheme,
  bio: data.bio,
  role: data.role,
  isVerified: data.isVerified ?? false,
  followersCount: data.followersCount ?? 0,
  followingCount: data.followingCount ?? 0,
  postsCount: data.postsCount ?? 0,
  createdAt: data.createdAt?.toDate?.() ?? new Date(),
  onlineStatus: (data.onlineStatus as any) || "hidden",
  lastSeen: data.lastSeen?.toDate?.(),
});

export async function ensureUserDocument(authUser: FirebaseUser): Promise<User> {
  const { uid, email, displayName, photoURL } = authUser;
  if (!email || !isSchoolEmail(email)) {
    throw new Error("Only @kcis.com.tw accounts can sign in.");
  }

  const userRef = doc(usersCollection, uid);
  const snap = await getDoc(userRef);

  // Determine role - admin for specific emails
  const isAdminEmail = email.toLowerCase() === "huachen0625@gmail.com";
  const defaultRole: UserRole = isAdminEmail ? "admin" : "student";

  if (!snap.exists()) {
    const now = serverTimestamp();
    const userPayload: UserRecord = {
      email,
      name: displayName || email.split("@")[0],
      photoURL: photoURL || undefined,
      role: defaultRole,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: now as Timestamp,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      isVerified: isAdminEmail,
      onlineStatus: "online",
      lastSeen: now as Timestamp,
    };

    await setDoc(userRef, userPayload);
    const created: UserRecord = { ...userPayload, createdAt: userPayload.createdAt };
    const user = toUser(uid, created);
    profileCache.set(uid, user);
    return user;
  }

  const data = snap.data() as UserRecord;
  
  // Update to admin if email matches and role is not admin yet
  if (isAdminEmail && data.role !== "admin") {
    await updateDoc(userRef, { 
      role: "admin",
      isVerified: true,
      updatedAt: serverTimestamp()
    });
    data.role = "admin";
    data.isVerified = true;
  }
  
  const user = toUser(uid, data);
  profileCache.set(uid, user);
  return user;
}

export async function getUserProfile(uid: string): Promise<User | null> {
  if (profileCache.has(uid)) return profileCache.get(uid) ?? null;
  const snap = await getDoc(doc(usersCollection, uid));
  if (!snap.exists()) return null;
  const user = toUser(uid, snap.data() as UserRecord);
  profileCache.set(uid, user);
  return user;
}

export async function getAllUsers(): Promise<UserRecord[]> {
  try {
    const q = query(usersCollection);
    const snap = await getDocs(q);
    return snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as UserRecord))
      .filter(user => user.email !== `${AI_ASSISTANT_ID}@kcis.com.tw`); // Exclude AI assistant
  } catch (error) {
    console.error('Failed to get all users:', error);
    return [];
  }
}

// AI Assistant user constants
export const AI_ASSISTANT_ID = "ai-assistant";
export const AI_ASSISTANT_NAME = "AI Assistant";

export async function ensureAIAssistantUser() {
  const aiRef = doc(usersCollection, AI_ASSISTANT_ID);
  const snap = await getDoc(aiRef);
  
  if (!snap.exists()) {
    const userPayload: Partial<UserRecord> = {
      email: `${AI_ASSISTANT_ID}@kcis.com.tw`,
      name: AI_ASSISTANT_NAME,
      role: "admin",
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: serverTimestamp() as Timestamp,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      isVerified: true,
    };
    
    await setDoc(aiRef, userPayload);
    console.log('AI Assistant user created');
  } else {
    console.log('AI Assistant user already exists');
  }
  
  return AI_ASSISTANT_ID;
}

export function listenToUserProfile(uid: string, onChange: (user: User | null) => void) {
  return onSnapshot(doc(usersCollection, uid), (docSnap) => {
    if (!docSnap.exists()) {
      onChange(null);
      return;
    }
    const user = toUser(uid, docSnap.data() as UserRecord);
    profileCache.set(uid, user);
    onChange(user);
  });
}

async function getAuthorFromPost(record: PostRecord): Promise<User | null> {
  const authorId = record.authorId;
  if (profileCache.has(authorId)) return profileCache.get(authorId) ?? null;

  if (record.authorType === "club" && record.clubId) {
    const clubSnap = await getDoc(doc(clubsCollection, record.clubId));
    if (!clubSnap.exists()) return null;
    const club = clubSnap.data() as ClubRecord;
    const mapped: User = {
      id: record.clubId,
      email: `${record.clubId}@kcis.com.tw`,
      displayName: club.name,
      username: club.name.replace(/\s+/g, "").toLowerCase(),
      avatar: club.avatar,
      bio: club.description,
      role: "club",
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      isVerified: true,
      createdAt: club.createdAt?.toDate?.() ?? new Date(),
    };
    profileCache.set(record.clubId, mapped);
    return mapped;
  }

  const user = await getUserProfile(authorId);
  return user;
}

export function listenToFeed(params: {
  limitTo?: number;
  onChange: (posts: Post[]) => void;
  currentUserId?: string;
  filter?: (record: PostRecord) => boolean;
  onError?: (err: unknown) => void;
}) {
  const { limitTo, onChange, currentUserId, filter, onError } = params;
  const baseQuery = query(
    postsCollection,
    orderBy("createdAt", "desc"),
    ...(limitTo ? [limit(limitTo)] : [])
  );

  let currentUserLikes = new Set<string>();
  let currentUserSaved = new Set<string>();
  const likeUnsub = currentUserId
    ? onSnapshot(
        query(likesCollection, where("userId", "==", currentUserId)),
        (snap) => {
          currentUserLikes = new Set(snap.docs.map((d) => (d.data() as { postId: string }).postId));
        }
      )
    : null;

  const savedUnsub = currentUserId
    ? onSnapshot(
        query(savedCollection, where("userId", "==", currentUserId)),
        (snap) => {
          currentUserSaved = new Set(snap.docs.map((d) => (d.data() as { postId: string }).postId));
        }
      )
    : null;

  const unsub = onSnapshot(
    baseQuery,
    async (snapshot) => {
      const posts = await Promise.all(
        snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() as PostRecord }))
          .filter(({ data }) => {
            // Exclude club posts from main feed
            if (data.clubId) return false;
            return filter ? filter(data) : true;
          })
          .map(async ({ id, data }) => {
            const author = await getAuthorFromPost(data);
            if (!author) return null;

            // Media now stored as Cloud Storage URLs directly in post.media
            const images = data.media || [];

            const post: Post = {
              id,
              author,
              authorType: data.authorType,
              clubId: data.clubId ?? null,
              content: data.content,
              images: images,
              likesCount: data.likesCount ?? 0,
              commentsCount: data.commentsCount ?? 0,
              isLiked: currentUserLikes.has(id),
              isSaved: currentUserSaved.has(id),
              createdAt: data.createdAt?.toDate?.() ?? new Date(),
              type: data.type || (data.authorType === "official" ? "official" : "post"),
            };
            return post;
          })
      );

      onChange(posts.filter((p): p is Post => !!p));
    },
    (err) => onError?.(err)
  );

  return () => {
    unsub();
    likeUnsub?.();
    savedUnsub?.();
  };
}

export async function createPost(
  payload: {
    authorId: string;
    authorType: "user" | "club" | "official";
    content: string;
    media?: string[];
    clubId?: string | null;
    type?: Post["type"];
  },
  onProgress?: UploadProgressCallback
) {
  // STRICT: Validate permissions for official posts - ONLY for admin/official/teacher
  const userRef = doc(usersCollection, payload.authorId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error("User not found");
  
  const userData = userSnap.data() as UserRecord;
  const userRole = userData.role || "student";
  const isOfficialAllowed = userRole === "admin" || userRole === "official" || userRole === "teacher";
  
  // CRITICAL: Reject ANY official post attempt from non-authorized users
  if (payload.authorType === "official" || payload.type === "official") {
    console.warn(`[OFFICIAL POST] User: ${payload.authorId}, Role: ${userRole}, Allowed: ${isOfficialAllowed}`);
    if (!isOfficialAllowed) {
      console.error(`[BLOCKED] User ${payload.authorId} (${userRole}) tried to post official`);
      throw new Error("Only admins, officials, and teachers can post official announcements");
    }
  }
  
  // Force type to "post" for non-authorized users, regardless of what they tried to send
  const finalType: Post["type"] = (payload.type === "official" || payload.type === "announcement") && !isOfficialAllowed 
    ? "post" 
    : payload.type ?? (payload.authorType === "official" ? "official" : "post");
  
  // Force authorType to "user" if not official, regardless of what they tried to send
  const finalAuthorType: "user" | "club" | "official" = (!isOfficialAllowed && payload.authorType === "official") 
    ? "user"
    : payload.authorType;
  
  const postRef = doc(postsCollection);
  const now = serverTimestamp();
  
  // Upload media to Cloudinary/Storage and store URLs
  let mediaUrls: string[] = [];
  if (payload.media && payload.media.length > 0) {
    const totalMedia = payload.media.length;
    for (let i = 0; i < totalMedia; i++) {
      const mediaBase64 = payload.media[i];
      const mimeMatch = mediaBase64.match(/^data:(.*?);base64,/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const ext = mime.split('/')[1] || 'bin';
      const filename = `media_${i}.${ext}`;

      const url = await uploadBase64Media(
        mediaBase64,
        'posts',
        payload.authorId,
        filename,
        (p) => {
          if (!onProgress) return;
          const total = ((i + p / 100) / totalMedia) * 100;
          onProgress(total);
        }
      );
      mediaUrls.push(url);
    }
  }
  
  const postPayload: PostRecord = {
    authorId: payload.authorId,
    authorType: finalAuthorType,
    clubId: payload.clubId ?? null,
    content: payload.content,
    media: mediaUrls, // Store Cloud Storage URLs instead of base64
    mediaIds: [], // Deprecated, kept for backwards compatibility
    createdAt: now as Timestamp,
    likesCount: 0,
    commentsCount: 0,
    ratingCount: 0,
    ratingSum: 0,
    type: finalType,
  };
  await setDoc(postRef, postPayload);
  
  // Increment user's post count
  await updateDoc(userRef, { postsCount: increment(1) });
  
  return postRef.id;
}

export async function getPostMedia(mediaIds: string[]): Promise<string[]> {
  if (!mediaIds || mediaIds.length === 0) return [];
  
  const media: string[] = [];
  for (const mediaId of mediaIds) {
    try {
      const mediaRef = doc(postMediaCollection, mediaId);
      const mediaSnap = await getDoc(mediaRef);
      if (mediaSnap.exists()) {
        const mediaData = mediaSnap.data();
        
        // Check if this is a chunked media
        if (mediaData.isChunked) {
          // Load all chunks and reassemble
          const chunkCount = mediaData.chunkCount;
          const q = query(
            postMediaCollection,
            where('parentMediaId', '==', mediaId),
            orderBy('chunkIndex', 'asc')
          );
          const chunksSnap = await getDocs(q);
          
          const chunks: string[] = [];
          chunksSnap.forEach(chunkDoc => {
            chunks.push(chunkDoc.data().chunkData);
          });
          
          if (chunks.length === chunkCount) {
            // Reassemble chunks into original media
            media.push(chunks.join(''));
          } else {
            console.warn(`Missing chunks for media ${mediaId}: expected ${chunkCount}, got ${chunks.length}`);
          }
        } else {
          // Regular non-chunked media
          media.push(mediaData.media);
        }
      }
    } catch (err) {
      console.warn(`Failed to load media ${mediaId}:`, err);
    }
  }
  return media;
}

export async function deletePost(postId: string, userId: string) {
  const postRef = doc(postsCollection, postId);
  const postSnap = await getDoc(postRef);
  
  if (!postSnap.exists()) {
    throw new Error("Post not found");
  }
  
  // Check if user is the author, admin, or teacher (teacher can delete student posts)
  const postData = postSnap.data() as PostRecord;
  const userRef = doc(usersCollection, userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() as UserRecord;
  
  const isAdmin = userData?.role === "admin";
  const isTeacher = userData?.role === "teacher";
  const isOwner = postData.authorId === userId;
  
  // Get post author role if deleter is a teacher
  let canDelete = isOwner || isAdmin;
  if (isTeacher && !isOwner) {
    const authorRef = doc(usersCollection, postData.authorId);
    const authorSnap = await getDoc(authorRef);
    const authorData = authorSnap.data() as UserRecord;
    canDelete = authorData?.role === "student"; // Teacher can only delete student posts
  }
  
  if (!canDelete) {
    throw new Error("You don't have permission to delete this post");
  }
  
  await runTransaction(firestore, async (tx) => {
    tx.delete(postRef);
    const authorRef = doc(usersCollection, postData.authorId);
    tx.update(authorRef, { postsCount: increment(-1) });
  });
}

export async function toggleLike(postId: string, userId: string) {
  const likeDoc = doc(likesCollection, `${postId}_${userId}`);
  const postRef = doc(postsCollection, postId);
  let postAuthorId: string | null = null;
  let createdLike = false;
  let retries = 0;
  const maxRetries = 3;
  
  while (retries < maxRetries) {
    try {
      await runTransaction(firestore, async (tx) => {
        const likeSnap = await tx.get(likeDoc);
        const postSnap = await tx.get(postRef);
        if (!postSnap.exists()) throw new Error("Post not found");
        const postData = postSnap.data() as PostRecord;
        postAuthorId = postData.authorId;

        if (likeSnap.exists()) {
          tx.delete(likeDoc);
          tx.update(postRef, { likesCount: increment(-1) });
        } else {
          tx.set(likeDoc, {
            postId,
            userId,
            createdAt: serverTimestamp(),
          });
          tx.update(postRef, { likesCount: increment(1) });
          createdLike = true;
        }
      });
      break; // Success, exit retry loop
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw error; // Give up after max retries
      }
      // Wait before retrying (longer backoff for race conditions: 200ms, 500ms, 1000ms)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 200));
    }
  }

  if (createdLike && postAuthorId && postAuthorId !== userId) {
    await addNotification({
      userId: postAuthorId,
      fromUserId: userId,
      type: "like",
      postId,
    });
  }
}

export async function addComment(payload: { postId: string; authorId: string; content: string; imageUrl?: string; mediaType?: string }) {
  const { postId, authorId, content, imageUrl, mediaType } = payload;
  const commentRef = doc(commentsCollection);
  let postAuthorId: string | null = null;
  let retries = 0;
  const maxRetries = 3;
  
  while (retries < maxRetries) {
    try {
      await runTransaction(firestore, async (tx) => {
        const postRef = doc(postsCollection, postId);
        const postSnap = await tx.get(postRef);
        if (!postSnap.exists()) throw new Error("Post not found");
        const postData = postSnap.data() as PostRecord;
        postAuthorId = postData.authorId;

        tx.set(commentRef, {
          postId,
          authorId,
          content,
          imageUrl: imageUrl || null,
          mediaType: mediaType || null,
          createdAt: serverTimestamp(),
        } as CommentRecord);
        tx.update(postRef, { commentsCount: increment(1) });
      });
      break; // Success, exit retry loop
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries - 1) * 100));
    }
  }

  if (postAuthorId && postAuthorId !== authorId) {
    await addNotification({
      userId: postAuthorId,
      fromUserId: authorId,
      type: "comment",
      postId,
      content,
    });
  }
}

export function listenToComments(postId: string, onChange: (comments: CommentRecord[]) => void) {
  const q = query(commentsCollection, where("postId", "==", postId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const comments = snap.docs.map((d) => ({ id: d.id, ...(d.data() as CommentRecord) }));
    onChange(comments);
  });
}

// Follow/Unfollow functionality
export async function toggleFollow(followerId: string, followeeId: string) {
  if (followerId === followeeId) throw new Error("Cannot follow yourself");
  
  const followDoc = doc(followsCollection, `${followerId}_${followeeId}`);
  const followerRef = doc(usersCollection, followerId);
  const followeeRef = doc(usersCollection, followeeId);

  await runTransaction(firestore, async (tx) => {
    const followSnap = await tx.get(followDoc);
    const followerSnap = await tx.get(followerRef);
    const followeeSnap = await tx.get(followeeRef);

    if (!followerSnap.exists() || !followeeSnap.exists()) {
      throw new Error("User not found");
    }

    if (followSnap.exists()) {
      // Unfollow
      tx.delete(followDoc);
      tx.update(followerRef, { followingCount: increment(-1) });
      tx.update(followeeRef, { followersCount: increment(-1) });
    } else {
      // Follow
      tx.set(followDoc, {
        followerId,
        followeeId,
        createdAt: serverTimestamp(),
      });
      tx.update(followerRef, { followingCount: increment(1) });
      tx.update(followeeRef, { followersCount: increment(1) });
    }
  });
}

export async function isFollowing(followerId: string, followeeId: string): Promise<boolean> {
  try {
    const followDoc = doc(followsCollection, `${followerId}_${followeeId}`);
    const snap = await getDoc(followDoc);
    return snap.exists();
  } catch (err) {
    console.error('Error checking follow status:', err);
    return false;
  }
}

// Club member management
export async function kickMember(clubId: string, memberId: string, adminId: string) {
  const clubRef = doc(clubsCollection, clubId);
  const clubSnap = await getDoc(clubRef);
  
  if (!clubSnap.exists()) throw new Error("Club not found");
  
  const clubData = clubSnap.data();
  const admins = clubData.admins || [];
  
  if (!admins.includes(adminId)) {
    throw new Error("Only admins can kick members");
  }

  await updateDoc(clubRef, {
    members: arrayRemove(memberId),
  });
}

export async function promoteMember(clubId: string, memberId: string, adminId: string) {
  const clubRef = doc(clubsCollection, clubId);
  const clubSnap = await getDoc(clubRef);
  
  if (!clubSnap.exists()) throw new Error("Club not found");
  
  const clubData = clubSnap.data();
  const admins = clubData.admins || [];
  
  if (!admins.includes(adminId)) {
    throw new Error("Only admins can promote members");
  }

  const isAlreadyAdmin = admins.includes(memberId);
  if (isAlreadyAdmin) throw new Error("User is already an admin");

  await updateDoc(clubRef, {
    admins: arrayUnion(memberId),
  });
}

// Club Applications Management
interface ClubApplication {
  id: string;
  clubId: string;
  userId: string;
  userInfo?: { name: string; avatar?: string };
  status: 'pending' | 'approved' | 'denied';
  createdAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
}

export async function requestClubAccess(clubId: string, userId: string) {
  const applicationsRef = collection(firestore, 'club-applications');
  
  // Check if already applied
  const existing = await getDocs(
    query(applicationsRef, where('clubId', '==', clubId), where('userId', '==', userId), where('status', '==', 'pending'))
  );
  
  if (existing.docs.length > 0) {
    throw new Error('You have already applied to this club');
  }
  
  const userSnap = await getDoc(doc(usersCollection, userId));
  const userData = userSnap.exists() ? (userSnap.data() as UserRecord) : null;
  
  await setDoc(doc(applicationsRef), {
    clubId,
    userId,
    userInfo: userData ? { name: userData.name, avatar: userData.photoURL } : undefined,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function getClubApplications(clubId: string): Promise<ClubApplication[]> {
  const applicationsRef = collection(firestore, 'club-applications');
  const q = query(
    applicationsRef,
    where('clubId', '==', clubId),
    orderBy('createdAt', 'desc')
  );
  
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() ?? new Date(),
    reviewedAt: doc.data().reviewedAt?.toDate?.() ?? undefined,
  } as ClubApplication));
}

export async function approveClubApplication(applicationId: string, clubId: string, adminId: string) {
  const clubRef = doc(clubsCollection, clubId);
  const appRef = doc(firestore, 'club-applications', applicationId);
  
  const appSnap = await getDoc(appRef);
  if (!appSnap.exists()) throw new Error('Application not found');
  
  const appData = appSnap.data() as any;
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) throw new Error('Club not found');
  
  const clubData = clubSnap.data() as any;
  const admins = clubData.admins || [];
  
  if (!admins.includes(adminId) && clubData.createdBy !== adminId) {
    throw new Error('Only club admins can approve applications');
  }
  
  // Add user to club members
  await updateDoc(clubRef, {
    members: arrayUnion(appData.userId),
    membersCount: increment(1),
  });
  
  // Update application status
  await updateDoc(appRef, {
    status: 'approved',
    reviewedAt: serverTimestamp(),
    reviewedBy: adminId,
  });
}

export async function denyClubApplication(applicationId: string, clubId: string, adminId: string) {
  const appRef = doc(firestore, 'club-applications', applicationId);
  const clubRef = doc(clubsCollection, clubId);
  
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) throw new Error('Club not found');
  
  const clubData = clubSnap.data() as any;
  const admins = clubData.admins || [];
  
  if (!admins.includes(adminId) && clubData.createdBy !== adminId) {
    throw new Error('Only club admins can deny applications');
  }
  
  // Update application status
  await updateDoc(appRef, {
    status: 'denied',
    reviewedAt: serverTimestamp(),
    reviewedBy: adminId,
  });
}

export async function inviteToClub(clubId: string, userId: string, invitedById: string) {
  const clubRef = doc(clubsCollection, clubId);
  const clubSnap = await getDoc(clubRef);
  
  if (!clubSnap.exists()) throw new Error('Club not found');
  
  const clubData = clubSnap.data() as any;
  const admins = clubData.admins || [];
  
  // Only admins can send invites
  if (!admins.includes(invitedById) && clubData.createdBy !== invitedById) {
    throw new Error('Only club admins can send invites');
  }
  
  // Check if already member
  if ((clubData.members || []).includes(userId)) {
    throw new Error('User is already a member');
  }
  
  // Create invitation record
  const invitesRef = collection(firestore, 'club-invitations');
  await setDoc(doc(invitesRef), {
    clubId,
    userId,
    invitedBy: invitedById,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function getClubInvitations(userId: string) {
  const invitesRef = collection(firestore, 'club-invitations');
  const q = query(
    invitesRef,
    where('userId', '==', userId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() ?? new Date(),
  }));
}

export async function acceptClubInvitation(invitationId: string, userId: string) {
  const inviteRef = doc(firestore, 'club-invitations', invitationId);
  const inviteSnap = await getDoc(inviteRef);
  
  if (!inviteSnap.exists()) throw new Error('Invitation not found');
  
  const inviteData = inviteSnap.data() as any;
  if (inviteData.userId !== userId) throw new Error('Unauthorized');
  
  const clubRef = doc(clubsCollection, inviteData.clubId);
  
  // Add user to club
  await updateDoc(clubRef, {
    members: arrayUnion(userId),
    membersCount: increment(1),
  });
  
  // Mark invitation as accepted
  await updateDoc(inviteRef, {
    status: 'accepted',
    acceptedAt: serverTimestamp(),
  });
}

export async function rejectClubInvitation(invitationId: string, userId: string) {
  const inviteRef = doc(firestore, 'club-invitations', invitationId);
  const inviteSnap = await getDoc(inviteRef);
  
  if (!inviteSnap.exists()) throw new Error('Invitation not found');
  
  const inviteData = inviteSnap.data() as any;
  if (inviteData.userId !== userId) throw new Error('Unauthorized');
  
  // Mark invitation as rejected
  await updateDoc(inviteRef, {
    status: 'rejected',
    rejectedAt: serverTimestamp(),
  });
}

export async function getClubMembers(clubId: string): Promise<UserRecord[]> {
  const clubRef = doc(clubsCollection, clubId);
  const clubSnap = await getDoc(clubRef);
  
  if (!clubSnap.exists()) return [];
  
  const clubData = clubSnap.data();
  const memberIds = clubData.members || [];
  
  if (memberIds.length === 0) return [];
  
  const members = await Promise.all(
    memberIds.map(async (id: string) => {
      const userRef = doc(usersCollection, id);
      const userSnap = await getDoc(userRef);
      return userSnap.exists() ? { id, ...(userSnap.data() as UserRecord) } : null;
    })
  );
  
  return members.filter((m) => m !== null);
}

const conversationIdFor = (a: string, b: string) => [a, b].sort().join("__");

export async function sendMessage(payload: { senderId: string; receiverId: string; content: string; mediaUrl?: string | null; mediaType?: string | null }) {
  const { senderId, receiverId, content, mediaUrl, mediaType } = payload;
  const sender = await getUserProfile(senderId);
  const receiver = await getUserProfile(receiverId);
  if (!sender || !receiver) throw new Error("Sender or receiver not found");

  const conversationId = conversationIdFor(senderId, receiverId);
  const messageDoc = doc(messagesCollection);
  const now = serverTimestamp();
  const record: MessageRecord = {
    conversationId,
    senderId,
    receiverId,
    participants: [senderId, receiverId],
    content,
    mediaUrl: mediaUrl || null,
    mediaType: mediaType || null,
    isRead: false,
    createdAt: now as Timestamp,
  };

  await setDoc(messageDoc, record);

  if (receiverId !== senderId) {
    await addNotification({
      userId: receiverId,
      fromUserId: senderId,
      type: "message",
      content,
    });
  }
}

export function listenToUserConversations(userId: string, onChange: (conversations: Conversation[]) => void) {
  // Query both regular messages and group chats that the user is part of
  const messagesQ = query(
    messagesCollection,
    where("participants", "array-contains", userId),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  // Also query groups where user is a member
  const groupsQ = query(
    collection(firestore, 'groups'),
    where("memberIds", "array-contains", userId)
  );

  // Keep track of unsubscribers
  let messagesUnsub: (() => void) | null = null;
  let groupsUnsub: (() => void) | null = null;
  let allConversations: Conversation[] = [];

  const updateConversations = async () => {
    // Get individual conversations
    const individualConvs = await new Promise<Conversation[]>((resolve) => {
      messagesUnsub = onSnapshot(messagesQ, async (snap) => {
        const latestByConversation = new Map<string, MessageRecord & { id: string }>();
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as MessageRecord;
          if (!latestByConversation.has(data.conversationId)) {
            latestByConversation.set(data.conversationId, { id: docSnap.id, ...data });
          }
        });

        const conversations = await Promise.all(
          Array.from(latestByConversation.values()).map(async (message) => {
            try {
              const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
              const participant = await getUserProfile(otherUserId);
              
              if (!participant) {
                console.warn(`Participant ${otherUserId} not found for conversation ${message.conversationId}`);
                return null;
              }
              
              const convo: Conversation = {
                id: message.conversationId,
                participant,
                lastMessage: {
                  id: message.id,
                  senderId: message.senderId,
                  receiverId: message.receiverId,
                  content: message.content,
                  isRead: message.isRead,
                  createdAt: message.createdAt?.toDate?.() ?? new Date(),
                },
                unreadCount: message.senderId === userId ? 0 : message.isRead ? 0 : 1,
              };
              return convo;
            } catch (error) {
              console.error(`Error loading conversation ${message.conversationId}:`, error);
              return null;
            }
          })
        );

        resolve(conversations.filter((c): c is Conversation => c !== null));
      });
    });

    // Get group conversations
    const groupConvs = await new Promise<Conversation[]>((resolve) => {
      groupsUnsub = onSnapshot(groupsQ, async (snap) => {
        const groupConversations: Conversation[] = [];
        
        for (const groupDoc of snap.docs) {
          try {
            const groupId = groupDoc.id;
            const groupData = groupDoc.data() as GroupRecord;
            
            // Get latest message in group
            const messagesRef = collection(firestore, `groups/${groupId}/messages`);
            const latestMsgQ = query(
              messagesRef,
              orderBy("createdAt", "desc"),
              limit(1)
            );
            
            const latestMsgSnap = await getDocs(latestMsgQ);
            if (latestMsgSnap.empty) continue;
            
            const latestMsg = latestMsgSnap.docs[0];
            const msgData = latestMsg.data() as any;
            
            // Create a group "participant" object
            const groupParticipant: User = {
              id: groupId,
              email: `${groupId}@group`,
              displayName: groupData.name || `Group (${groupData.memberIds?.length || 0} members)`,
              username: `group-${groupId}`,
              role: 'student',
              isVerified: false,
              followersCount: 0,
              followingCount: 0,
              postsCount: 0,
              createdAt: groupData.createdAt?.toDate?.() ?? new Date(),
            };
            
            groupConversations.push({
              id: groupId,
              participant: groupParticipant,
              lastMessage: {
                id: latestMsg.id,
                senderId: msgData.senderId,
                receiverId: '', // Group chats don't have a single receiver
                content: msgData.content,
                isRead: true,
                createdAt: msgData.createdAt?.toDate?.() ?? new Date(),
              },
              unreadCount: 0,
            });
          } catch (err) {
            console.error(`Error loading group ${groupDoc.id}:`, err);
          }
        }
        
        resolve(groupConversations);
      });
    });

    // Combine both and sort by timestamp
    allConversations = [...individualConvs, ...groupConvs].sort((a, b) => 
      (b.lastMessage?.createdAt?.getTime() || 0) - (a.lastMessage?.createdAt?.getTime() || 0)
    );
    
    onChange(allConversations);
  };

  updateConversations();

  return () => {
    messagesUnsub?.();
    groupsUnsub?.();
  };
}

export function listenToConversationMessages(a: string, b: string, onChange: (messages: { id: string; senderId: string; receiverId: string; content: string; isRead: boolean; createdAt: Date }[]) => void) {
  const conversationId = conversationIdFor(a, b);
  const q = query(
    messagesCollection,
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc"),
    limit(200)
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => {
      const m = d.data() as MessageRecord;
      return {
        id: d.id,
        senderId: m.senderId,
        receiverId: m.receiverId,
        content: m.content,
        mediaUrl: m.mediaUrl || null,
        mediaType: m.mediaType || null,
        isRead: m.isRead,
        createdAt: m.createdAt?.toDate?.() ?? new Date(),
      };
    });
    onChange(rows);
  });
}

export function listenToClubs(onChange: (clubs: Club[]) => void) {
  return onSnapshot(query(clubsCollection, orderBy("createdAt", "desc")), (snap) => {
    const clubs = snap.docs.map((docSnap) => {
      const data = docSnap.data() as ClubRecord;
      const club: Club = {
        id: docSnap.id,
        name: data.name,
        description: data.description,
        avatar: data.avatar,
        coverImage: data.coverImage,
        managerId: data.admins?.[0] || data.createdBy,
        members: data.members || [],
        membersCount: data.members?.length ?? 0,
        postsCount: 0,
        isApproved: data.isApproved,
        requiresApproval: data.requiresApproval || false,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
      };
      return club;
    });
    onChange(clubs);
  });
}

export async function createClub(payload: { name: string; description: string; createdBy: string; avatar?: string; coverImage?: string; requiresApproval?: boolean }) {
  const clubRef = doc(clubsCollection);
  const now = serverTimestamp();
  const record: ClubRecord = {
    name: payload.name,
    description: payload.description,
    avatar: payload.avatar || undefined,
    coverImage: payload.coverImage || undefined,
    members: [payload.createdBy],
    admins: [payload.createdBy],
    createdBy: payload.createdBy,
    createdAt: now as Timestamp,
    isApproved: false,
    requiresApproval: payload.requiresApproval || false,
  };
  
  // Remove undefined fields
  const cleanRecord: any = { ...record };
  Object.keys(cleanRecord).forEach(key => {
    if (cleanRecord[key] === undefined) {
      delete cleanRecord[key];
    }
  });
  
  await setDoc(clubRef, cleanRecord);
  return clubRef.id;
}

export async function approveClub(clubId: string, approverId: string) {
  const approver = await getUserProfile(approverId);
  if (!approver || approver.role !== "admin") throw new Error("Only admins can approve clubs");
  const clubRef = doc(clubsCollection, clubId);
  const snap = await getDoc(clubRef);
  if (!snap.exists()) throw new Error("Club not found");
  await updateDoc(clubRef, { isApproved: true, admins: snap.data().admins || [snap.data().createdBy] });
}

export async function getClubPosts(clubId: string): Promise<Post[]> {
  try {
    // Get all posts for this club without ordering constraint to avoid composite index requirement
    const q = query(postsCollection, where("clubId", "==", clubId), limit(50));
    const snap = await getDocs(q);
    
    // Sort client-side to avoid needing a composite index
    const postDocs = snap.docs.sort((a, b) => {
      const aTime = (a.data() as PostRecord).createdAt?.toMillis?.() ?? 0;
      const bTime = (b.data() as PostRecord).createdAt?.toMillis?.() ?? 0;
      return bTime - aTime; // Descending order
    });
    
    const posts = await Promise.all(
      postDocs.map(async (docSnap) => {
        const data = docSnap.data() as PostRecord;
        const author = await getAuthorFromPost(data);
        if (!author) return null;
        return {
          id: docSnap.id,
          author,
          authorType: data.authorType,
          clubId: data.clubId ?? null,
          content: data.content,
          images: data.media,
          likesCount: data.likesCount ?? 0,
          commentsCount: data.commentsCount ?? 0,
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
          type: data.type || "post",
        } as Post;
      })
    );
    return posts.filter((p): p is Post => !!p).slice(0, 30);
  } catch (err) {
    console.error('Error fetching club posts:', err);
    return [];
  }
}

export async function publishClubPost(payload: { clubId: string; authorId: string; content: string; media?: string[]; alsoPushToFeed?: boolean }) {
  const clubSnap = await getDoc(doc(clubsCollection, payload.clubId));
  if (!clubSnap.exists()) throw new Error("Club not found");
  const club = clubSnap.data() as ClubRecord;
  const isAdmin = (club.admins || []).includes(payload.authorId);
  if (!isAdmin) throw new Error("Only club admins can post for the club.");

  return createPost({
    authorId: payload.authorId,
    authorType: "club",
    clubId: payload.clubId,
    content: payload.content,
    media: payload.media,
    type: payload.alsoPushToFeed ? "post" : "announcement",
  });
}

export async function ratePost(payload: { postId: string; userId: string; value: number }) {
  if (payload.value < 1 || payload.value > 5) throw new Error("Rating must be between 1 and 5");
  const ratingId = `${payload.postId}_${payload.userId}`;
  const ratingRef = doc(firestore, "ratings", ratingId);
  const postRef = doc(postsCollection, payload.postId);

  await runTransaction(firestore, async (tx) => {
    const ratingSnap = await tx.get(ratingRef);
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) throw new Error("Post not found");

    const previous = ratingSnap.exists() ? (ratingSnap.data() as { value: number }).value : null;
    tx.set(ratingRef, { postId: payload.postId, userId: payload.userId, value: payload.value, createdAt: serverTimestamp() });

    const delta = previous ? payload.value - previous : payload.value;
    const countDelta = previous ? 0 : 1;
    tx.update(postRef, { ratingSum: increment(delta), ratingCount: increment(countDelta) });
  });
}

export async function markMessageAsRead(messageId: string) {
  await updateDoc(doc(messagesCollection, messageId), { isRead: true });
}

export async function addNotification(payload: Omit<NotificationRecord, "createdAt" | "isRead">) {
  const notificationRef = doc(notificationsCollection);
  await setDoc(notificationRef, {
    ...payload,
    createdAt: serverTimestamp(),
    isRead: false,
  } as NotificationRecord);
  return notificationRef.id;
}

export function listenToNotifications(userId: string, onChange: (notifications: (NotificationRecord & { id: string })[]) => void) {
  const q = query(
    notificationsCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as NotificationRecord) }));
    onChange(items);
  });
}

export async function markNotificationRead(notificationId: string) {
  await updateDoc(doc(notificationsCollection, notificationId), { isRead: true });
}

export async function markAllNotificationsRead(userId: string) {
  const q = query(notificationsCollection, where("userId", "==", userId), where("isRead", "==", false));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { isRead: true })));
}

export async function searchUsers(searchTerm: string): Promise<User[]> {
  if (!searchTerm.trim()) return [];
  const searchLower = searchTerm.toLowerCase();
  
  const q = query(usersCollection, limit(20));
  const snap = await getDocs(q);
  
  const users = snap.docs
    .map((docSnap) => toUser(docSnap.id, docSnap.data() as UserRecord))
    .filter((user) => 
      (user.displayName.toLowerCase().includes(searchLower) || 
       user.email.toLowerCase().includes(searchLower) ||
       user.username.toLowerCase().includes(searchLower))
    );
  
  return users.slice(0, 10);
}

export async function searchPosts(searchTerm: string): Promise<Post[]> {
  if (!searchTerm.trim()) return [];
  const searchLower = searchTerm.toLowerCase();
  const q = query(postsCollection, orderBy("createdAt", "desc"), limit(30));
  const snap = await getDocs(q);

  const posts = await Promise.all(
    snap.docs
      .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() as PostRecord }))
      .filter(({ data }) => data.content.toLowerCase().includes(searchLower))
      .map(async ({ id, data }) => {
        const author = await getAuthorFromPost(data);
        if (!author) return null;
        return {
          id,
          author,
          authorType: data.authorType,
          clubId: data.clubId ?? null,
          content: data.content,
          images: data.media,
          likesCount: data.likesCount ?? 0,
          commentsCount: data.commentsCount ?? 0,
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
          type: data.type || "post",
        } as Post;
      })
  );

  return posts.filter((p): p is Post => !!p).slice(0, 15);
}

export async function searchClubs(searchTerm: string): Promise<Club[]> {
  if (!searchTerm.trim()) return [];
  const searchLower = searchTerm.toLowerCase();
  const q = query(clubsCollection, orderBy("createdAt", "desc"), limit(30));
  const snap = await getDocs(q);

  const clubs = snap.docs
    .map((docSnap) => {
      const data = docSnap.data() as ClubRecord;
      const club: Club = {
        id: docSnap.id,
        name: data.name,
        description: data.description,
        avatar: data.avatar,
        coverImage: data.coverImage,
        managerId: data.admins?.[0] || data.createdBy,
        membersCount: data.members?.length ?? 0,
        postsCount: 0,
        isApproved: data.isApproved,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
      };
      return club;
    })
    .filter((club) => club.name.toLowerCase().includes(searchLower) || club.description.toLowerCase().includes(searchLower));

  return clubs.slice(0, 15);
}

export async function getUserPosts(userId: string): Promise<Post[]> {
  const q = query(postsCollection, where("authorId", "==", userId), orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  
  const posts = await Promise.all(
    snap.docs.map(async (docSnap) => {
      const data = docSnap.data() as PostRecord;
      const author = await getAuthorFromPost(data);
      if (!author) return null;
      
      const hasMedia = data.media && Array.isArray(data.media) && data.media.length > 0;
      
      const post: Post = {
        id: docSnap.id,
        author,
        content: data.content,
        images: hasMedia ? data.media : undefined,
        likesCount: data.likesCount ?? 0,
        commentsCount: data.commentsCount ?? 0,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        type: data.type || "post",
      };
      return post;
    })
  );
  
  return posts.filter((p): p is Post => !!p);
}

export async function getSavedPosts(userId: string): Promise<Post[]> {
  const q = query(savedCollection, where("userId", "==", userId), orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  const postIds = snap.docs.map((d) => (d.data() as { postId: string }).postId);

  const posts = await Promise.all(
    postIds.map(async (pid) => {
      const postSnap = await getDoc(doc(postsCollection, pid));
      if (!postSnap.exists()) return null;
      const data = postSnap.data() as PostRecord;
      const author = await getAuthorFromPost(data);
      if (!author) return null;
      const post: Post = {
        id: pid,
        author,
        authorType: data.authorType,
        clubId: data.clubId ?? null,
        content: data.content,
        images: data.media,
        likesCount: data.likesCount ?? 0,
        commentsCount: data.commentsCount ?? 0,
        isLiked: false,
        isSaved: true,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        type: data.type || "post",
      };
      return post;
    })
  );

  return posts.filter((p): p is Post => !!p);
}

export async function toggleSavePost(postId: string, userId: string) {
  // First, verify post exists
  const postRef = doc(postsCollection, postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) {
    throw new Error("Post not found");
  }
  
  const saveDoc = doc(savedCollection, `${postId}_${userId}`);
  const snap = await getDoc(saveDoc);
  if (snap.exists()) {
    await deleteDoc(saveDoc);
  } else {
    await setDoc(saveDoc, {
      postId,
      userId,
      createdAt: serverTimestamp(),
    });
  }
}

export async function joinClub(clubId: string, userId: string) {
  const clubRef = doc(clubsCollection, clubId);
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) throw new Error('Club not found');
  
  const members = clubSnap.data().members || [];
  if (members.includes(userId)) return; // Already joined
  
  await updateDoc(clubRef, {
    members: [...members, userId],
    membersCount: increment(1),
  });
}

export async function deleteClub(clubId: string, userId: string) {
  const clubRef = doc(clubsCollection, clubId);
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) throw new Error('Club not found');
  
  const clubData = clubSnap.data() as any;
  const isCreator = clubData.createdBy === userId;
  const isAdmin = (clubData.admins || []).includes(userId);
  
  // Check if user is system admin
  const userRef = doc(usersCollection, userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() as UserRecord;
  const isSystemAdmin = userData?.role === 'admin';
  
  if (!isCreator && !isAdmin && !isSystemAdmin) {
    throw new Error('Only club creator, club admins, or system admin can delete the club');
  }
  
  // Delete club posts
  const clubPostsQuery = query(
    collection(firestore, 'posts'),
    where('clubId', '==', clubId)
  );
  const clubPostsSnap = await getDocs(clubPostsQuery);
  for (const postDoc of clubPostsSnap.docs) {
    await deleteDoc(postDoc.ref);
  }
  
  // Delete club document
  await deleteDoc(clubRef);
  await logActivity(userId, `Deleted club ${clubId}`, 'club', clubId);
  
  console.log(`Club ${clubId} deleted by user ${userId}`);
}

// Update club (admin or creator only)
export async function updateClub(
  clubId: string,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    avatar?: string;
    coverImage?: string;
    isApproved?: boolean;
    postingPermission?: 'everyone' | 'admins-only';
  }
) {
  const clubRef = doc(clubsCollection, clubId);
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) throw new Error('Club not found');
  
  const clubData = clubSnap.data() as any;
  const isCreator = clubData.createdBy === userId;
  const isAdmin = (clubData.admins || []).includes(userId);
  
  // Check if user is system admin
  const userRef = doc(usersCollection, userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() as UserRecord;
  const isSystemAdmin = userData?.role === 'admin';
  
  if (!isCreator && !isAdmin && !isSystemAdmin) {
    throw new Error('You do not have permission to edit this club');
  }
  
  await updateDoc(clubRef, updates);
  await logActivity(userId, `Updated club ${clubId}`, 'club', clubId);
}

export async function leaveClub(clubId: string, userId: string) {
  const clubRef = doc(clubsCollection, clubId);
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) throw new Error('Club not found');
  
  const members = clubSnap.data().members || [];
  await updateDoc(clubRef, {
    members: members.filter((id: string) => id !== userId),
    membersCount: increment(-1),
  });
}

export async function createClubMessage(clubId: string, senderId: string, content: string, mediaUrl?: string, mediaType?: string) {
  const messagesRef = collection(firestore, `clubs/${clubId}/messages`);
  await setDoc(doc(messagesRef), {
    senderId,
    content,
    mediaUrl: mediaUrl || null,
    mediaType: mediaType || null,
    createdAt: serverTimestamp(),
  });
}

export function listenToClubMessages(clubId: string, callback: (messages: Message[]) => void) {
  const q = query(
    collection(firestore, `clubs/${clubId}/messages`),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        conversationId: clubId,
        senderId: data.senderId,
        receiverId: '',
        content: data.content,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        isRead: true,
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    });
    callback(messages);
  });
}

// Group Chat Functions
interface GroupRecord {
  memberIds: string[];
  createdAt: Timestamp;
  lastMessageAt?: Timestamp;
  name?: string;
}

export async function getGroupInfo(groupId: string) {
  const groupRef = doc(firestore, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  
  if (!groupSnap.exists()) return null;
  
  const data = groupSnap.data() as GroupRecord;
  return {
    id: groupId,
    name: data.name,
    memberCount: data.memberIds?.length || 0,
    members: data.memberIds || [],
  };
}

export async function removeGroupMember(groupId: string, userId: string, requesterId: string) {
  const groupRef = doc(firestore, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  
  if (!groupSnap.exists()) {
    throw new Error('Group not found');
  }
  
  const groupData = groupSnap.data() as GroupRecord;
  
  // Only creator (first member) can remove members
  if (groupData.memberIds?.[0] !== requesterId) {
    throw new Error('Only group creator can remove members');
  }
  
  const updatedMembers = (groupData.memberIds || []).filter(id => id !== userId);
  
  if (updatedMembers.length === 0) {
    throw new Error('Cannot remove last member. Delete the group instead.');
  }
  
  await updateDoc(groupRef, {
    memberIds: updatedMembers,
  });
}

export async function createGroupChat(memberIds: string[], groupName?: string) {
  const groupsCollection = collection(firestore, 'groups');
  const sortedMembers = [...memberIds].sort();
  const groupId = sortedMembers.join('-');
  
  // Check if group already exists
  const groupRef = doc(groupsCollection, groupId);
  const existing = await getDoc(groupRef);
  
  if (existing.exists()) {
    return groupId; // Return existing group ID
  }
  
  // Create new group - only include name if provided
  const record: Partial<GroupRecord> = {
    memberIds: sortedMembers,
    createdAt: serverTimestamp() as Timestamp,
  };
  
  // Only add name if it's provided and not empty
  if (groupName && groupName.trim()) {
    record.name = groupName.trim();
  }
  
  await setDoc(groupRef, record);
  return groupId;
}

export async function sendGroupMessage(groupId: string, senderId: string, content: string, mediaUrl?: string, mediaType?: string) {
  const messagesRef = collection(firestore, `groups/${groupId}/messages`);
  await setDoc(doc(messagesRef), {
    senderId,
    content,
    mediaUrl: mediaUrl || null,
    mediaType: mediaType || null,
    createdAt: serverTimestamp(),
  });
  
  // Update group's lastMessageAt
  const groupRef = doc(firestore, 'groups', groupId);
  await updateDoc(groupRef, {
    lastMessageAt: serverTimestamp(),
  });
}

export async function leaveGroupChat(groupId: string, userId: string) {
  const groupRef = doc(firestore, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  
  if (!groupSnap.exists()) {
    throw new Error('Group not found');
  }
  
  const groupData = groupSnap.data() as GroupRecord;
  const memberIds = groupData.memberIds || [];
  
  // Remove user from group
  const updatedMembers = memberIds.filter(id => id !== userId);
  
  if (updatedMembers.length === 0) {
    // If no members left, delete the group
    await deleteDoc(groupRef);
    // Delete all messages in the group
    const messagesRef = collection(firestore, `groups/${groupId}/messages`);
    const messages = await getDocs(messagesRef);
    for (const msgDoc of messages.docs) {
      await deleteDoc(msgDoc.ref);
    }
  } else {
    // Otherwise, just update the member list
    await updateDoc(groupRef, {
      memberIds: updatedMembers,
    });
  }
}

export async function deleteGroupChat(groupId: string, userId: string) {
  const groupRef = doc(firestore, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  
  if (!groupSnap.exists()) {
    throw new Error('Group not found');
  }
  
  const groupData = groupSnap.data() as GroupRecord;
  
  // Only the first member (creator) can delete the entire group
  if (groupData.memberIds?.[0] !== userId) {
    // Non-creator just leaves
    return leaveGroupChat(groupId, userId);
  }
  
  // Delete group document
  await deleteDoc(groupRef);
  
  // Delete all messages in the group
  const messagesRef = collection(firestore, `groups/${groupId}/messages`);
  const messages = await getDocs(messagesRef);
  for (const msgDoc of messages.docs) {
    await deleteDoc(msgDoc.ref);
  }
}

export function listenToGroupMessages(groupId: string, callback: (messages: Message[]) => void) {
  const q = query(
    collection(firestore, `groups/${groupId}/messages`),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        conversationId: groupId,
        senderId: data.senderId,
        receiverId: '',
        content: data.content,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        isRead: true,
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    });
    callback(messages);
  });
}

export async function getOrCreateGroupChat(memberIds: string[], groupName?: string) {
  return createGroupChat(memberIds, groupName);
}

// Repair function to fix existing posts with incorrect types (student posts marked as official)
export async function repairPostTypes() {
  try {
    const postsSnap = await getDocs(postsCollection);
    const batch = [];
    
    for (const docSnap of postsSnap.docs) {
      const post = docSnap.data() as PostRecord;
      const userSnap = await getDoc(doc(usersCollection, post.authorId));
      
      if (!userSnap.exists()) continue;
      
      const userData = userSnap.data() as UserRecord;
      const userRole = userData.role || "student";
      const isAuthorized = userRole === "admin" || userRole === "official" || userRole === "teacher";
      
      // If student has official post, change it to regular post
      if (post.type === "official" && !isAuthorized) {
        await updateDoc(doc(postsCollection, docSnap.id), {
          type: "post",
          authorType: "user"
        });
        console.log(`Fixed post ${docSnap.id}: changed from official to post`);
      }
    }
    
    console.log("Post repair complete");
  } catch (error) {
    console.error("Error repairing posts:", error);
  }
}

// ========== ADMIN FUNCTIONS ==========

// Edit post (admin only)
export async function editPost(postId: string, userId: string, updates: { content?: string; images?: string[] }) {
  const postRef = doc(postsCollection, postId);
  const postSnap = await getDoc(postRef);
  
  if (!postSnap.exists()) {
    throw new Error("Post not found");
  }
  
  const postData = postSnap.data() as PostRecord;
  const userRef = doc(usersCollection, userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() as UserRecord;
  
  const isAdmin = userData?.role === "admin";
  const isOwner = postData.authorId === userId;
  
  if (!isAdmin && !isOwner) {
    throw new Error("You don't have permission to edit this post");
  }
  
  const updateData: any = {};
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.images !== undefined) updateData.images = updates.images;
  updateData.updatedAt = new Date();
  if (isAdmin && !isOwner) updateData.editedByAdmin = true;
  
  await updateDoc(postRef, updateData);
  await logActivity(userId, `Edited post ${postId}`, 'post', postId);
}

// Report system
export async function createReport(
  reportType: 'post' | 'user' | 'comment',
  targetId: string,
  reportedBy: string,
  reason: string,
  description: string,
  targetAuthorId?: string
) {
  const reportsCollection = collection(firestore, 'reports');
  
  const report = {
    type: reportType,
    targetId,
    targetAuthorId,
    reportedBy,
    reason,
    description,
    status: 'pending',
    createdAt: new Date(),
  };
  
  const docRef = await addDoc(reportsCollection, report);
  await logActivity(reportedBy, `Created report for ${reportType}`, reportType, targetId);
  
  return docRef.id;
}

export async function updateReportStatus(
  reportId: string,
  status: 'investigating' | 'resolved' | 'dismissed',
  adminId: string,
  notes?: string
) {
  const reportRef = doc(firestore, 'reports', reportId);
  
  await updateDoc(reportRef, {
    status,
    resolvedAt: new Date(),
    resolvedBy: adminId,
    resolutionNotes: notes,
  });
  
  await logActivity(adminId, `Updated report ${reportId} to ${status}`, 'report', reportId);
}

// Activity logging
export async function logActivity(
  userId: string,
  description: string,
  targetType?: string,
  targetId?: string
) {
  try {
    const logsCollection = collection(firestore, 'activityLogs');
    
    await addDoc(logsCollection, {
      userId,
      action: description,
      targetType,
      targetId,
      description,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// Delete user (admin only)
export async function deleteUser(userId: string, adminId: string) {
  const userRef = doc(usersCollection, userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error('User not found');
  }
  
  // Verify requester is admin
  const adminRef = doc(usersCollection, adminId);
  const adminSnap = await getDoc(adminRef);
  const adminData = adminSnap.data() as UserRecord;
  
  if (adminData?.role !== 'admin') {
    throw new Error('Only admins can delete users');
  }
  
  // Delete user's posts first
  const userPostsQuery = query(
    collection(firestore, 'posts'),
    where('authorId', '==', userId)
  );
  const userPostsSnap = await getDocs(userPostsQuery);
  for (const postDoc of userPostsSnap.docs) {
    await deleteDoc(postDoc.ref);
  }
  
  // Delete user document
  await deleteDoc(userRef);
  await logActivity(adminId, `Deleted user ${userId}`, 'user', userId);
}

// Ban/unban user
export async function updateUserStatus(userId: string, adminId: string, status: 'active' | 'banned' | 'suspended') {
  const userRef = doc(usersCollection, userId);
  
  await updateDoc(userRef, {
    accountStatus: status,
    statusUpdatedAt: new Date(),
    statusUpdatedBy: adminId,
  });
  
  await logActivity(adminId, `Changed user status to ${status}`, 'user', userId);
}

// Get reports (admin only)
export async function getReports(status?: string) {
  let reportsQuery;
  
  if (status) {
    reportsQuery = query(
      collection(firestore, 'reports'),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
  } else {
    reportsQuery = query(
      collection(firestore, 'reports'),
      orderBy('createdAt', 'desc')
    );
  }
  
  const snapshot = await getDocs(reportsQuery);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data
    } as any;
  });
}

// Get activity logs (admin only)
export async function getActivityLogs(limit_count: number = 100) {
  const logsQuery = query(
    collection(firestore, 'activityLogs'),
    orderBy('createdAt', 'desc'),
    limit(limit_count)
  );
  
  const snapshot = await getDocs(logsQuery);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data
    } as any;
  });
}