// @ts-nocheck
import { toast } from 'react-hot-toast';

export const SuccessAlert = (message, duration = 3500, width = 'auto') => {
  toast.success(message, {
    duration: duration,
    style: {
      border: '0px solid #713200',
      padding: '16px 20px',
      color: '#585CE1',
      fontSize: "15px",
      background: "#E8EBFD",
      width: width,
      maxWidth: '95%',
    },
    iconTheme: {
      primary: '#585CE1',
      secondary: '#ffffff',
    },
  });
};

export const ErrorAlert = (message, duration = 4000, width = 'auto') => {
  toast.error(message, {
    duration: duration,
    style: {
      border: '0px solid #713200',
      padding: '16px 20px',
      color: '#EB6262',
      fontSize: "14px",
      width: width,
      maxWidth: '100%',
    },
    iconTheme: {
      primary: '#EB6262',
      secondary: '#ffffff',
    },
  });
};
