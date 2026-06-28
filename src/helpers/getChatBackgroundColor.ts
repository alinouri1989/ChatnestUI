// @ts-nocheck
import { ChatBackgroundColors } from "../constants/ChatBackgroundColors";

export const getChatBackgroundColor = (colorId) => {
  const color = ChatBackgroundColors.find((item) => item.id === colorId);
  return color ? color.backgroundImage : null;

};
