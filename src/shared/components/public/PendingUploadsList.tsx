// @ts-nocheck
import PropTypes from 'prop-types';

const PendingUploadsList = ({ pendingUploads, onUploadCancel }) => {
  return (
    <div className="pending-uploads">
      {pendingUploads.map((upload) => (
        <div key={upload.id} className="upload-item">
          <span>{upload.fileName}</span>
          <button onClick={() => onUploadCancel(upload.id)}>Cancel</button>
        </div>
      ))}
    </div>
  );
};

PendingUploadsList.propTypes = {
  pendingUploads: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      fileName: PropTypes.string,
    })
  ).isRequired,
  onUploadCancel: PropTypes.func.isRequired,
};

export default PendingUploadsList;
