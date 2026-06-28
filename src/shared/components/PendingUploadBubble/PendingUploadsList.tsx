// @ts-nocheck
import PropTypes from "prop-types";
import { useMemo } from "react";
import { useSelector } from "react-redux";

import PendingUploadBubble from "./PendingUploadBubble";

function PendingUploadsList({ chatId, chatType }) {
  const pendingUploadItems = useSelector((state) => state.pendingUploads.items);
  const pendingItems = useMemo(
    () =>
      pendingUploadItems.filter(
      (item) => item.chatType === chatType && String(item.chatId) === String(chatId)
    ),
    [pendingUploadItems, chatId, chatType]
  );

  return pendingItems.map((pendingItem) => (
    <PendingUploadBubble key={pendingItem.id} item={pendingItem} />
  ));
}

PendingUploadsList.propTypes = {
  chatId: PropTypes.string.isRequired,
  chatType: PropTypes.oneOf(["Individual", "Group"]).isRequired,
};

export default PendingUploadsList;
