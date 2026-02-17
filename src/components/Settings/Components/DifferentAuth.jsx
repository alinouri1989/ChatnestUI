import PropTypes from 'prop-types';
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";

function DifferentAuth({ providerId }) {
    return (
        <div className="different-auth">
            <h3>تغییر گذرواژه</h3>
            <div className="different-auth-box">
                {providerId === "google.com" ? <FcGoogle /> : <FaFacebook className="fb" />}
                <p>با {providerId === "google.com" ? "Google" : "Facebook"} وارد شده‌اید</p>
                <span>می‌توانید گذرواژه را از حساب خود تغییر دهید.</span>
            </div>
        </div>
    )
}

// PropTypes validation
DifferentAuth.propTypes = {
    providerId: PropTypes.string.isRequired,
};

export default DifferentAuth
