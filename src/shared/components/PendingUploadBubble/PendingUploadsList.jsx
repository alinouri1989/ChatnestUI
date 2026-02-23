import PropTypes from "prop-types";
import { useSelector } from "react-redux";

import PendingUploadBubble from "./PendingUploadBubble.jsx";

function PendingUploadsList({ chatId, chatType }) {
  const pendingItems = useSelector((state) =>
    state.pendingUploads.items.filter(
      (item) => item.chatType === chatType && String(item.chatId) === String(chatId)
    )
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
