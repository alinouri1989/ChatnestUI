import PropTypes from "prop-types";

const BaseIcon = ({ children, size = "1em", className = "", viewBox = "0 0 24 24", strokeWidth = 2, fill = "none", stroke = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    className={className}
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

BaseIcon.propTypes = {
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
  viewBox: PropTypes.string,
  strokeWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  fill: PropTypes.string,
  stroke: PropTypes.string,
};

export const NestDownloadIcon = ({ size, className }) => (
  <BaseIcon size={size} className={className}>
    <path d="M12 3.5V14.5" />
    <path d="M7.5 10.2L12 14.8L16.5 10.2" />
    <path d="M4 18.5H20" />
  </BaseIcon>
);

export const NestCloseIcon = ({ size, className }) => (
  <BaseIcon size={size} className={className}>
    <path d="M6 6L18 18" />
    <path d="M18 6L6 18" />
  </BaseIcon>
);

export const NestSingleCheckIcon = ({ size, className }) => (
  <BaseIcon size={size} className={className}>
    <path d="M5 12.4L9.2 16.5L19 7.2" />
  </BaseIcon>
);

export const NestDoubleCheckIcon = ({ size, className }) => (
  <BaseIcon size={size} className={className}>
    <path d="M1.8 12.8L6 17L10.3 12.7" />
    <path d="M8.4 12.8L12.6 17L22.2 7.4" />
  </BaseIcon>
);

export const NestPendingIcon = ({ size, className }) => (
  <BaseIcon size={size} className={className} viewBox="0 0 26 26">
    <circle cx="13" cy="13" r="8.2" />
    <path d="M4.4 13H1.8M24.2 13H21.6M13 4.4V1.8M13 24.2V21.6" />
    <path d="M13 9.2V13L16.2 14.8" />
  </BaseIcon>
);

export const NestFileIcon = ({ size, className }) => (
  <BaseIcon size={size} className={className}>
    <path d="M7 3.5H14.5L19 8V20.5H7V3.5Z" />
    <path d="M14.5 3.5V8H19" />
    <path d="M9.5 12H16.5M9.5 15.2H16.5M9.5 18.4H14" />
  </BaseIcon>
);

export const NestPlayIcon = ({ size, className }) => (
  <BaseIcon size={size} className={className} fill="currentColor" stroke="none">
    <path d="M8.4 6.1C8.4 5.45 9.1 5.03 9.68 5.34L18.32 10.23C18.94 10.58 18.94 11.48 18.32 11.83L9.68 16.72C9.1 17.03 8.4 16.61 8.4 15.96V6.1Z" />
  </BaseIcon>
);

export const NestPauseIcon = ({ size, className }) => (
  <BaseIcon size={size} className={className} fill="currentColor" stroke="none">
    <rect x="7.4" y="5.6" width="3.8" height="11.6" rx="1.4" />
    <rect x="12.8" y="5.6" width="3.8" height="11.6" rx="1.4" />
  </BaseIcon>
);

NestDownloadIcon.propTypes = { size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), className: PropTypes.string };
NestCloseIcon.propTypes = { size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), className: PropTypes.string };
NestSingleCheckIcon.propTypes = { size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), className: PropTypes.string };
NestDoubleCheckIcon.propTypes = { size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), className: PropTypes.string };
NestPendingIcon.propTypes = { size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), className: PropTypes.string };
NestFileIcon.propTypes = { size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), className: PropTypes.string };
NestPlayIcon.propTypes = { size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), className: PropTypes.string };
NestPauseIcon.propTypes = { size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), className: PropTypes.string };
