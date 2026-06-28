// @ts-nocheck
import defaultGroupProfilePhoto from "../assets/svg/DefaultGroupProfileImage.svg";
import groupImage from "../assets/users/GroupImage.png";

const fallbackGroupPhotos = [defaultGroupProfilePhoto, groupImage];

const hashSeed = (value) => {
  const text = String(value || "group");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const isBackendDefaultGroupPhoto = (photoUrl) => {
  if (!photoUrl) return false;
  const normalized = String(photoUrl).toLowerCase();
  return (
    normalized.includes("defaultgroupprofileimage") ||
    normalized.includes("groupimage") ||
    normalized.includes("/image/default")
  );
};

export const resolveGroupPhoto = ({ photoUrl, groupId, groupName }) => {
  if (photoUrl && !isBackendDefaultGroupPhoto(photoUrl)) {
    return photoUrl;
  }

  const seed = groupId || groupName || "group";
  const index = hashSeed(seed) % fallbackGroupPhotos.length;
  return fallbackGroupPhotos[index];
};

export const groupFallbackPhotos = fallbackGroupPhotos;
