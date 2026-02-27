export const SECURITY_QUESTION_OPTIONS = [
  {
    key: "private_phrase",
    label: "عبارت محرمانه شخصی",
    text: "عبارت محرمانه‌ای که فقط خودتان برای بازیابی حساب تعیین می‌کنید چیست؟",
  },
  {
    key: "home_nickname",
    label: "لقب خانوادگی خصوصی",
    text: "نام یا لقبی که فقط اعضای نزدیک خانواده شما استفاده می‌کنند چیست؟",
  },
  {
    key: "personal_hint",
    label: "کلمه یادآور شخصی",
    text: "کلمه یادآور شخصی شما برای مواقع اضطراری چیست؟",
  },
  {
    key: "first_goal",
    label: "کلمه کلیدی هدف شخصی",
    text: "کلمه کلیدی یکی از هدف‌های شخصی قدیمی شما که فقط خودتان می‌دانید چیست؟",
  },
  {
    key: "custom",
    label: "سؤال اختصاصی",
    text: "سؤال اختصاصی (پیشنهاد می‌شود سؤال شخصی و غیرقابل‌حدس انتخاب کنید)",
  },
];

export const getSecurityQuestionByKey = (key) =>
  SECURITY_QUESTION_OPTIONS.find((item) => item.key === key) ?? null;
