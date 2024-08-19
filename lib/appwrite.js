import {
  Account,
  Avatars,
  Client,
  Databases,
  ID,
  Query,
  Storage,
} from "react-native-appwrite";

export const config = {
  endpoint: "https://cloud.appwrite.io/v1",
  platform: "com.vm.aorafirst",
  projectId: "66bb7186001cf733d3a6",
  databaseId: "66bbac8b001867a0ef1f",
  userCollectionId: "66bbacc9003486ee2e9a",
  videoCollectionId: "66bbad0a0026ef04d5b6",
  storageId: "66bbaf9300372acf9fd5",
};

const {
  endpoint,
  platform,
  projectId,
  databaseId,
  userCollectionId,
  videoCollectionId,
  storageId,
} = config;

// Инициализация SDK для React Native
const client = new Client();

client
  .setEndpoint(config.endpoint) // Устанавливаем endpoint Appwrite
  .setProject(config.projectId) // Устанавливаем ID проекта
  .setPlatform(config.platform); // Устанавливаем ID или bundle ID приложения

const account = new Account(client);
const avatars = new Avatars(client);
const databases = new Databases(client);
const storage = new Storage(client);

export const createUser = async (email, password, username) => {
  try {
    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      username
    );

    if (!newAccount) {
      throw new Error("Account creation failed");
    }

    const avatarUrl = avatars.getInitials(username);

    // Авторизация после создания аккаунта
    await signIn(email, password);

    const newUser = await databases.createDocument(
      config.databaseId,
      config.userCollectionId,
      ID.unique(),
      {
        accountId: newAccount.$id,
        email,
        username,
        avatar: avatarUrl,
      }
    );

    return newUser;
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error(`Error creating user: ${error.message}`);
  }
};

export const signIn = async (email, password) => {
  try {
    const newSession = await account.createEmailPasswordSession(
      email,
      password
    );
    return newSession;
  } catch (error) {
    console.error("Error signing in:", error);
    throw new Error(`Error signing in: ${error.message}`);
  }
};

export const getCurrentUser = async () => {
  try {
    const currentAccount = await account.get();

    if (!currentAccount) {
      throw new Error("Account not found");
    }

    const { documents } = await databases.listDocuments(
      config.databaseId,
      config.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

    if (documents.length === 0) {
      throw new Error("User not found");
    }

    return documents[0];
  } catch (error) {
    console.error("Error fetching current user:", error);
    throw new Error(`Error fetching current user: ${error.message}`);
  }
};

export const getAllPosts = async () => {
  try {
    const posts = await databases.listDocuments(databaseId, videoCollectionId, [
      Query.orderDesc("$createdAt"),
    ]);

    return posts.documents;
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw new Error(`Error fetching posts: ${error.message}`);
  }
};

export const getLatestPosts = async () => {
  try {
    const posts = await databases.listDocuments(databaseId, videoCollectionId, [
      Query.orderDesc("$createdAt", Query.limit(7)),
    ]);

    return posts.documents;
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw new Error(`Error fetching posts: ${error.message}`);
  }
};

export const searchPosts = async (query) => {
  try {
    const posts = await databases.listDocuments(databaseId, videoCollectionId, [
      Query.search("title", query),
    ]);

    return posts.documents;
  } catch (error) {
    throw new Error(`Error searching posts: ${error.message}`);
  }
};

export const getUserPosts = async (userId) => {
  try {
    const posts = await databases.listDocuments(databaseId, videoCollectionId, [
      Query.equal("creator", userId),
      Query.orderDesc("$createdAt"),
    ]);

    return posts.documents;
  } catch (error) {
    throw new Error(`Error searching user posts: ${error.message}`);
  }
};

export const signOut = async () => {
  try {
    const session = await account.deleteSession("current");

    return session;
  } catch (error) {
    console.error("Error signing out:", error);
    throw new Error(`Error signing out: ${error.message}`);
  }
};

export const getFilePreview = async (fileId, type) => {
  let fileUrl;
  try {
    if (type === "video") {
      fileUrl = storage.getFileView(storageId, fileId);
    } else if (type === "image") {
      fileUrl = storage.getFilePreview(
        storageId,
        fileId,
        2000,
        2000,
        "top",
        100
      );
    } else {
      throw new Error("Invalid file type");
    }

    if (!fileUrl) {
      throw new Error("File not found");
    }

    return fileUrl;
  } catch (error) {
    throw new Error(`Error getting file preview: ${error.message}`);
  }
};

export const uploadFile = async (file, type) => {
  if (!file) return;

  const asset = {
    name: file.fileName,
    type: file.mimeType,
    size: file.fileSize,
    uri: file.uri,
  };

  try {
    const uploadFile = await storage.createFile(storageId, ID.unique(), asset);

    const fileUrl = await storage.getFileView(storageId, uploadFile.$id);

    return fileUrl;
  } catch (error) {
    throw new Error(`Error uploading file: ${error.message}`);
  }
};

export const createVideo = async (form) => {
  try {
    const [thumbnailUrl, videoUrl] = await Promise.all([
      uploadFile(form.thumbnail, "image"),
      uploadFile(form.video, "video"),
    ]);

    const newPost = await databases.createDocument(
      databaseId,
      videoCollectionId,
      ID.unique(),
      {
        title: form.title,
        thumbnail: thumbnailUrl,
        video: videoUrl,
        prompt: form.prompt,
        creator: form.userId,
      }
    );

    return newPost;
  } catch (error) {
    throw new Error(`Error creating video: ${error.message}`);
  }
};
