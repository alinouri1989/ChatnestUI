import { useSelector } from "react-redux";

/**
 * هوکی که تصویر مناسب را بر می‌گرداند.
 * @param lightImg  تصویر حالت روشن
 * @param darkImg   تصویر حالت تاریک
 * @returns مسیر تصویر مناسب
 */
const useThemeImage = (lightImg: string, darkImg: string): string => {
  const theme = useSelector(
    (state: any) => state.auth?.user?.userSettings?.theme
  );

  // پیش‌فرض اگر مقدار موجود نباشد، حالت روشن در نظر گرفته می‌شود
  return theme === "Dark" ? darkImg : lightImg;
};

export default useThemeImage;
