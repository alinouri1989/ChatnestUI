export const getFirebaseAuthErrorMessage = (error) => {
    const errorMessages = {
        "auth/account-exists-with-different-credential":
            "برای این ایمیل، روش ورود دیگری استفاده شده است.",
        "auth/popup-closed-by-user": "پنجرهٔ ورود بسته شد. دوباره تلاش کنید.",
        "auth/cancelled-popup-request":
            "درخواست ورود قبلی لغو شد. دوباره تلاش کنید.",
        "auth/popup-blocked":
            "مرورگر پنجرهٔ پاپ‌آپ را مسدود کرده است. پس از دادن مجوز دوباره تلاش کنید.",
        "auth/invalid-credential":
            "اطلاعات ورود نامعتبر است. اطلاعات حساب کاربری خود را بررسی کنید.",
        "auth/operation-not-allowed": "این روش ورود غیرفعال شده است.",
        "auth/weak-password": "گذرواژه شما خیلی ضعیف است. یک گذرواژه قوی‌تر انتخاب کنید.",
        "auth/user-disabled": "این حساب غیرفعال شده است.",
        "auth/user-not-found":
            "کاربری با این ایمیل پیدا نشد.",
        "auth/wrong-password": "گذرواژه را اشتباه وارد کرده‌اید.",
        "auth/too-many-requests":
            "تعداد تلاش‌های ناموفق ورود بیش از حد مجاز است. لطفا بعدا دوباره تلاش کنید.",
    };

    return errorMessages[error.code] || "یک خطای ناشناخته رخ داد.";
};
