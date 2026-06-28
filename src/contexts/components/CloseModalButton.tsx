// @ts-nocheck
import { MdClose } from 'react-icons/md';
import PropTypes from 'prop-types';
function CloseModalButton({ closeModal }) {
    return (
        <button className="modal-close" onClick={closeModal}>
            <MdClose />
        </button>
    )
}
CloseModalButton.propTypes = {
    closeModal: PropTypes.func.isRequired,  }
export default CloseModalButton