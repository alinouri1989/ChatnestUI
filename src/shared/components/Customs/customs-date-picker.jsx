import PropTypes from "prop-types";
import { LuCalendarDays } from "react-icons/lu";

export const CustomDatePickerInput = ({ openCalendar, value, ...props }) => {
  return (
    <>
      <LuCalendarDays
        onClick={openCalendar}
        style={{ cursor: "pointer" }}
        size="28"
        color="#828A96"
      />

      <input onFocus={openCalendar} value={value} readOnly {...props} />
    </>
  );
};

CustomDatePickerInput.propTypes = {
  openCalendar: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
};
