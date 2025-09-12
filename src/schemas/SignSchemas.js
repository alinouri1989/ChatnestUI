import { z } from "zod";

export const signInSchema = z.object({
    Email: z.string().email("لطفاً آدرس ایمیل معتبری وارد کنید"),
    Password: z.string().nonempty("رمز عبور خود را وارد کنید"),
});

export const signUpSchema = z.object({
    DisplayName: z.string()
        .min(5, { message: "نام و نام خانوادگی باید حداقل ۵ و حداکثر ۵۰ کاراکتر باشد." })
        .max(50, { message: "نام و نام خانوادگی باید حداقل ۵ و حداکثر ۵۰ کاراکتر باشد." })
        .regex(/^(?!.*\d)[\u0600-\u06FFA-Za-z]+(?: [\u0600-\u06FFA-Za-z]+)?$/, {
            message: "فقط باید شامل حروف باشد و حداکثر یک فاصله داشته باشد.",
        }),

    Email: z.string()
        .email({ message: "لطفاً آدرس ایمیل معتبری وارد کنید." })
        .max(30, { message: "آدرس ایمیل شما باید حداکثر ۳۰ کاراکتر باشد." }),
    
    Password: z.string()
        .min(8, { message: "رمز عبور شما باید حداقل ۸ کاراکتر باشد." })
        .max(16, { message: "رمز عبور شما باید حداکثر ۱۶ کاراکتر باشد." })
        .regex(/^(?=.*[A-Z])(?=.*\d).*$/, {
            message: "رمز عبور شما باید حداقل یک حرف بزرگ و یک عدد داشته باشد.",
        }),
    
    PasswordAgain: z.string(),
    
    BirthDate: z.date({
        invalid_type_error: "لطفاً تاریخ معتبری وارد کنید.",
    }).refine(date => date <= new Date(), {
        message: "تاریخ تولد نمی‌تواند در آینده باشد.",
    }),
}).refine(data => data.Password === data.PasswordAgain, {
    message: "رمز عبورها مطابقت ندارند.",
    path: ["PasswordAgain"],
});

export const resetPasswordSchema = z.object({
    Email: z.string()
        .email({ message: "لطفاً آدرس ایمیل معتبری وارد کنید." })
        .nonempty({ message: "آدرس ایمیل نمی‌تواند خالی باشد." })
});