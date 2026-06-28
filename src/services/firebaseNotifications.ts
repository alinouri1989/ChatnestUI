// @ts-nocheck
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { app } from "./firebaseConfig";
import { getAccessToken } from "../store/helpers/tokenStorage";
import { createData } from "../core/http-service/createData";

let warnedInvalidVapidKey = false;
const VAPID_KEY = getValidVapidKey(import.meta.env.VITE_FIREBASE_VAPID_KEY);

let registeredToken = null;
let lastTokenSentForAccessToken = null;

function normalizeEnvValue(value) {
  return String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const decoded = atob(paddedBase64);

  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function getValidVapidKey(value) {
  const key = normalizeEnvValue(value);

  if (!key) {
    return "";
  }

  try {
    const bytes = base64UrlToBytes(key);
    const isUncompressedP256PublicKey = bytes.length === 65 && bytes[0] === 4;

    if (isUncompressedP256PublicKey) {
      return key;
    }
  } catch {
    // Fall through to the warning below.
  }

  if (!warnedInvalidVapidKey) {
    warnedInvalidVapidKey = true;
    console.warn(
      "Firebase notifications are disabled because VITE_FIREBASE_VAPID_KEY is not a valid Web Push public key."
    );
  }

  return "";
}

async function getServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register("/service-worker.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

async function sendTokenToServer(token) {
  const accessToken = getAccessToken();
  if (!accessToken || lastTokenSentForAccessToken === `${accessToken}:${token}`) {
    return;
  }

  await createData("User/FirebaseToken", {
    method: "POST",
    body: {
      token,
      platform: "web",
    },
  });

  lastTokenSentForAccessToken = `${accessToken}:${token}`;
}

export async function registerBrowserFirebaseToken({ forceSync = false } = {}) {
  if (registeredToken) {
    if (forceSync) {
      await sendTokenToServer(registeredToken);
    }
    return registeredToken;
  }

  if (!VAPID_KEY || !(await isSupported())) {
    return registeredToken;
  }

  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return null;
    }
  }

  if (Notification.permission !== "granted") {
    return null;
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return null;
  }

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (token) {
    registeredToken = token;
    await sendTokenToServer(token);
  }

  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || "ChatNest";
    const body = payload.notification?.body || "New message";

    if (document.visibilityState === "visible") {
      return;
    }

    registration.showNotification(title, {
      body,
      icon: "/pwa-192.png",
      badge: "/pwa-192.png",
      data: payload.data,
    });
  });

  return token;
}
