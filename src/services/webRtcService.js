export const handleRemoteSDP = async (sdp, peerConnection) => {
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
  } catch {
    /* empty */
  }
};

export const addIceCandidate = async (candidate, peerConnection) => {
  if (!peerConnection) {
    return;
  }

  try {
    await peerConnection.current.addIceCandidate(candidate);
  } catch {
    /* empty */
  }
};

export const sendSdp = async (callId, sdp, callConnection) => {
  await callConnection.invoke("SendSdp", callId, sdp);
};

export const sendIceCandidate = async (callId, candidate, callConnection) => {
  await callConnection.invoke("SendIceCandidate", callId, candidate);
};

export const createAndSendOffer = async (
  callId,
  callConnection,
  peerConnection
) => {
  if (!peerConnection?.current) {
    throw new Error("Peer connection is not initialized");
  }

  if (!callConnection) {
    throw new Error("Call connection is not available");
  }

  const offer = await peerConnection.current.createOffer();
  const prioritizedOffer = prioritizeOpusCodec(offer);
  await peerConnection.current.setLocalDescription(prioritizedOffer);
  await sendSdp(callId, prioritizedOffer, callConnection);
};

const prioritizeOpusCodec = (offer) => {
  const sdpLines = offer.sdp.split("\n");
  const opusPayloadType = sdpLines
    .find((line) => line.includes("opus/48000"))
    ?.match(/:(\d+)/)?.[1];

  if (opusPayloadType) {
    const audioLineIndex = sdpLines.findIndex((line) =>
      line.startsWith("m=audio")
    );
    if (audioLineIndex !== -1) {
      const audioLine = sdpLines[audioLineIndex];
      const audioLineParts = audioLine.split(" ");

      const updatedAudioLine = [
        audioLineParts[0],
        audioLineParts[1],
        audioLineParts[2],
        opusPayloadType,
        ...audioLineParts.slice(3).filter((pt) => pt !== opusPayloadType),
      ].join(" ");

      sdpLines[audioLineIndex] = updatedAudioLine;
    }
  }

  offer.sdp = sdpLines.join("\n");
  return offer;
};
