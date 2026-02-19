import { useState } from "react";
import { useSelector } from "react-redux";
import useScreenWidth from "../../../hooks/useScreenWidth";

import SearchInput from "./SearchInput";
import UserCallCard from "./UserCallCard";

import { opacityEffect } from "../../../shared/animations/animations";
import { getUserIdFromToken } from "../../../helpers/getUserIdFromToken";
import NoActiveData from "../../../shared/components/NoActiveData/NoActiveData";
import PreLoader from "../../../shared/components/PreLoader/PreLoader";

import { motion } from 'framer-motion';
import "./style.scss";

function CallsList() {

  const { token } = useSelector(state => state.auth);
  const { callRecipientList, calls, isInitialCallsReady } = useSelector(state => state.call);
  const userId = getUserIdFromToken(token);
  const isSmallScreen = useScreenWidth(900);

  const [searchTerm, setSearchTerm] = useState("");

  if (!Array.isArray(calls)) {
    return null;
  }

  const processedCalls = calls.map(call => {
    const participants = Array.isArray(call?.participants)
      ? call.participants
      : Array.isArray(call?.callParticipants)
        ? call.callParticipants
            .map((participant) =>
              typeof participant === "string" ? participant : participant?.userId
            )
            .filter(Boolean)
        : [];

    const otherParticipantId = participants.find(participant => participant !== userId);
    const recipientInfo = Array.isArray(callRecipientList)
      ? callRecipientList.find(recipient => recipient.id === otherParticipantId)
      : null;
    const isOutgoingCall = participants[0] === userId;

    return {
      id: call.id,
      name: recipientInfo?.displayName || "Unknown",
      image: recipientInfo?.profilePhoto || defaultProfilePhoto,
      status: recipientInfo?.lastConnectionDate || "offline",
      callStatus: call.status,
      callType: call.type,
      callDuration: call.callDuration,
      createdDate: new Date(call.createdDate),
      isOutgoingCall
    };
  });

  const sortedCalls = processedCalls.sort((a, b) => b.createdDate - a.createdDate);
  const filteredCalls = sortedCalls.filter(call =>
    call.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="call-list-box">
      {isSmallScreen && <h2 className="mobil-menu-title">تماس‌ها</h2>}
      <SearchInput
        placeholder={"جستجو کنید یا تماس جدید شروع کنید"}
        value={searchTerm}
        onChange={setSearchTerm}
      />
      <div className="list-flex">
        <motion.div
          className="user-list"
          variants={opacityEffect(0.8)}
          initial="initial"
          animate="animate"
        >
          {filteredCalls.length > 0 ? (
            filteredCalls.map(callInfo => (
              <motion.div
                key={callInfo.id}
                variants={opacityEffect(0.8)}
                style={{ marginBottom: "10px" }}
              >
                <UserCallCard
                  callId={callInfo.id}
                  image={callInfo.image}
                  status={callInfo.status}
                  callType={callInfo.callType}
                  name={callInfo.name}
                  callStatus={callInfo.callStatus}
                  createdDate={callInfo.createdDate}
                  isOutgoingCall={callInfo.isOutgoingCall}
                />
              </motion.div>
            ))
          ) : (
            isInitialCallsReady ? <NoActiveData text={searchTerm ? "تماس مطابقی پیدا نشد" : "سابقهٔ تماسی ندارید."} />
              : <PreLoader />
          )}
        </motion.div>

      </div>
    </div>
  );
}

export default CallsList;
