import { useSelector } from "react-redux";
import { createContext, useContext, useState } from "react";
import IncomingCall from "../components/Calls/Components/IncomingCall/IncomingCall";
import PropTypes from 'prop-types';

const defaultModalContextValue = {
  modalContent: null,
  showModal: () => { },
  closeModal: () => { },
};

const ModalContext = createContext(defaultModalContextValue);

export const ModalProvider = ({ children }) => {
  const [modalContent, setModalContent] = useState(null);
  const { isRingingIncoming, callType, callerProfile, callId } = useSelector((state) => state.call);

  const showModal = (content) => {
    setModalContent(content);
  };

  const closeModal = () => {
    setModalContent(null);
  };


  return (
    <ModalContext.Provider value={{ modalContent, showModal, closeModal }}>
      {children}
      {modalContent && (
        <div className="modal-overlay">
          <div className="modal-card">{modalContent}</div>
        </div>
      )}
      {isRingingIncoming && <IncomingCall callType={callType} callId={callId} callerProfile={callerProfile} />}
    </ModalContext.Provider>
  );
};
ModalProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
export const useModal = () => useContext(ModalContext);
