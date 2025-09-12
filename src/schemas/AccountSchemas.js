import { z } from "zod";

export const displayNameSchema = z.object({
    displayName: z.string()
        .min(5, { message: 'نام و نام خانوادگی شما باید حداقل ۵ کاراکتر باشد.' })
        .max(50, { message: 'نام و نام خانوادگی شما باید حداکثر ۵۰ کاراکتر باشد.' })
        .regex(/^[\u0600-\u06FFa-zA-Z]+(?: [\u0600-\u06FFa-zA-Z]+)*$/, { 
            message: 'نام و نام خانوادگی شما باید فقط از حروف تشکیل شده باشد و بین کلمات حداکثر یک فاصله باشد.' 
        })
});

export const phoneNumberSchema = z.object({
    phoneNumber: z.string()
        .min(8, { message: "شماره تلفن باید حداقل ۸ رقم باشد." })
        .max(15, { message: "شماره تلفن باید حداکثر ۱۵ رقم باشد." })
        .regex(/^(\+?[0-9]{1,3})?[0-9]{8,14}$/, { 
            message: "لطفاً شماره تلفن معتبری وارد کنید." 
        })
        .refine((value) => !/\s/.test(value), {
            message: "شماره تلفن نمی‌تواند فاصله داشته باشد.",
        })
});

export const biographySchema = z.object({
    bio: z.string()
        .min(1, { message: 'بیوگرافی شما باید حداقل ۱ کاراکتر باشد.' })
        .max(100, { message: 'بیوگرافی شما باید حداکثر ۱۰۰ کاراکتر باشد.' })
});