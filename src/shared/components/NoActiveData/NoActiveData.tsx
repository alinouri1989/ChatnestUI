// @ts-nocheck
import PropTypes from 'prop-types';
import "./style.scss";
import NoData from "../../../assets/images/Home/noData.webp";

function NoActiveData({ text }) {
    return (
        <div className="no-active-datas">
            <img src={NoData} alt="هیچ داده‌ای یافت نشد" />
            <p>{text}</p>
        </div>
    );
}

NoActiveData.propTypes = {
    text: PropTypes.string.isRequired,
};

export default NoActiveData;