// @ts-nocheck
import { PiPhoneFill } from "react-icons/pi";
import { HiMiniVideoCamera } from "react-icons/hi2";
import PropTypes from 'prop-types';
import { formatCallDuration, formatTimeHoursMinutes } from "../../../helpers/dateHelper";

const CallStatus = ({ status, type, userId, participants, callDuration, createdDate }) => {
    let callStatusText;
    let callStatusColor = "#828A96";
    let icon = type === 0 ? <PiPhoneFill className="icon" /> : <HiMiniVideoCamera className="icon" />;

    const isOutgoingCall = participants?.[0] === userId;

    switch (status) {
        case 1:
            if (isOutgoingCall) {
                callStatusText = type === 1 ? "تماس تصویری خروجی" : "تماس صوتی خروجی";
            } else {
                callStatusText = type === 1 ? "تماس تصویری ورودی" : "تماس صوتی ورودی";
            }
            icon = type === 0 ? <PiPhoneFill className="icon" /> : <HiMiniVideoCamera className="icon" />;
            break;
        case 2:
            callStatusText = "مشغول";
            callStatusColor = "#EB6262";
            break;
        case 3:
            callStatusText = "لغو شده";
            icon = type === 0 ? <PiPhoneFill className="icon" /> : <HiMiniVideoCamera className="icon" />;
            callStatusColor = "#EB6262";
            break;
        case 4:
            if (isOutgoingCall) {
                callStatusText = "تماس بی‌پاسخ خروجی";
            } else {
                callStatusText = "تماس بی‌پاسخ ورودی";
            }
            callStatusColor = "#EB6262";
            icon = type === 0 ? <PiPhoneFill className="icon" /> : <HiMiniVideoCamera className="icon" />;
            break;
        default:
            callStatusText = "نامشخص";
            break;
    }

    const formattedDuration = callDuration ? `مدت تماس: ${formatCallDuration(callDuration)}` : "پاسخ داده نشد";

    return (
        <div className="status-box">
            <div className="call-status-box" style={{ color: callStatusColor }}>
                {icon}
                <p>{callStatusText} {formatTimeHoursMinutes(createdDate)}</p>
            </div>
            <p>{formattedDuration}</p>
        </div>
    );
};

CallStatus.propTypes = {
    status: PropTypes.number.isRequired,
    type: PropTypes.number.isRequired,
    userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    participants: PropTypes.array,
    callDuration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    createdDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]).isRequired,
};

CallStatus.defaultProps = {
    participants: [],
    callDuration: null,
};

export default CallStatus;
