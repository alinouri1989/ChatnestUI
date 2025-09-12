import { z } from "zod";

export const changePasswordSchema = z.object({
    currentPassword: z.string()
        .nonempty({ message: "رمز عبور فعلی خود را وارد کنید." }),

    newPassword: z.string()
        .min(8, { message: "رمز عبور شما باید حداقل ۸ کاراکتر باشد." })
        .max(16, { message: "رمز عبور شما باید حداکثر ۱۶ کاراکتر باشد." })
        .regex(/^(?=.*[A-Z])(?=.*\d).*$/, {
            message: "رمز عبور شما باید حداقل یک حرف بزرگ و یک عدد داشته باشد."
        }),

    newPasswordAgain: z.string()
        .nonempty({ message: "لطفاً رمز عبور جدید خود را مجدداً وارد کنید." })
}).refine((data) => data.newPassword === data.newPasswordAgain, {
    message: "رمز عبورها مطابقت ندارند.",
    path: ["newPasswordAgain"],
});