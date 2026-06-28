// @ts-nocheck
import CryptoJS from "crypto-js";

export function decryptMessage(encryptedContent, chatId) {
  try {
    if (!encryptedContent) return "";

    const bytes = CryptoJS.AES.decrypt(encryptedContent, chatId);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    // If decryption fails CryptoJS often returns empty string
    if (!decrypted) {
      // console.warn("Decryption failed or wrong key:", encryptedContent);
      return encryptedContent;
    }

    return decrypted;
  } catch {
    // console.error("Error decrypting message:", error);
    return encryptedContent; // fallback so UI doesn't crash
  }
}

export function encryptMessage(content, chatId) {
  const key = chatId;
  const encrypted = CryptoJS.AES.encrypt(content, key).toString();
  return encrypted;
}
