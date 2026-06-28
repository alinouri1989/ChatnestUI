// @ts-nocheck
import PropTypes from 'prop-types';

const ImageModal = ({ imageUrl, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <img src={imageUrl} alt="Full size" className="modal-image" />
    </div>
  );
};

ImageModal.propTypes = {
  imageUrl: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ImageModal;
