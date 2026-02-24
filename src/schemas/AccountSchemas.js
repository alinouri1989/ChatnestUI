import { z } from "zod";

export const displayNameSchema = z.object({
  displayName: z
    .string()
    .min(5, { message: "نام نمایشی باید حداقل 5 کاراکتر باشد." })
    .max(50, { message: "نام نمایشی نباید بیشتر از 50 کاراکتر باشد." })
    .regex(/^[\u0600-\u06FFa-zA-Z0-9\s]+$/, {
      message:
        "نام نمایشی فقط می‌تواند شامل حروف فارسی/انگلیسی، عدد و فاصله باشد.",
    }),
});

export const userIdentifierSchema = z.object({
  userIdentifier: z
    .string()
    .min(4, { message: "شناسه کاربر باید حداقل 4 کاراکتر باشد." })
    .max(30, { message: "شناسه کاربر نباید بیشتر از 30 کاراکتر باشد." })
    .regex(/^[A-Za-z0-9_]+$/, {
      message: "شناسه کاربر فقط می‌تواند شامل حروف انگلیسی، عدد و _ باشد.",
    }),
});

export const phoneNumberSchema = z.object({
  phoneNumber: z
    .string()
    .min(8, { message: "شماره تلفن باید حداقل 8 رقم باشد." })
    .max(15, { message: "شماره تلفن نباید بیشتر از 15 رقم باشد." })
    .regex(/^(\+?[0-9]{1,3})?[0-9]{8,14}$/, {
      message: "شماره تلفن وارد شده صحیح نیست.",
    })
    .refine((value) => !/\s/.test(value), {
      message: "شماره تلفن نمی‌تواند شامل فاصله باشد.",
    }),
});

export const biographySchema = z.object({
  bio: z
    .string()
    .min(1, { message: "بیوگرافی باید حداقل 1 کاراکتر باشد." })
    .max(100, { message: "بیوگرافی نباید بیشتر از 100 کاراکتر باشد." }),
});
