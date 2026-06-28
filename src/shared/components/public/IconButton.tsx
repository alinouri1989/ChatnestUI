// @ts-nocheck
import PropTypes from 'prop-types';

const IconButton = ({ children, onClick, ariaLabel }) => {
  return (
    <button
      className="icon-button"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
};

IconButton.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  ariaLabel: PropTypes.string,
};

export default IconButton;
