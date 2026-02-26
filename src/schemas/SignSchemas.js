import { z } from "zod";

export const signInSchema = z.object({
  Email: z.string().email("فرمت ایمیل وارد شده صحیح نیست."),
  Password: z.string().nonempty("رمز عبور نمی‌تواند خالی باشد."),
});

export const signUpSchema = z
  .object({
    DisplayName: z
      .string()
      .min(5, { message: "نام نمایشی باید بین 5 تا 50 کاراکتر باشد." })
      .max(50, { message: "نام نمایشی باید بین 5 تا 50 کاراکتر باشد." })
      .regex(/^[\u0600-\u06FFA-Za-z0-9\s]+$/, {
        message: "نام نمایشی فقط می‌تواند شامل حروف فارسی/انگلیسی، عدد و فاصله باشد.",
      }),

    Email: z
      .string()
      .email({ message: "فرمت ایمیل وارد شده صحیح نیست." })
      .max(30, { message: "ایمیل وارد شده نباید بیشتر از 30 کاراکتر باشد." }),

    Password: z
      .string()
      .min(8, { message: "رمز عبور باید حداقل 8 کاراکتر باشد." })
      .max(16, { message: "رمز عبور نباید بیشتر از 16 کاراکتر باشد." })
      .regex(/^(?=.*[A-Z])(?=.*\d).*$/, {
        message: "رمز عبور باید حداقل یک حرف بزرگ و یک عدد داشته باشد.",
      }),

    PasswordAgain: z.string(),

    BirthDate: z
      .date({
        invalid_type_error: "تاریخ تولد وارد شده صحیح نیست.",
      })
      .refine((date) => date <= new Date(), {
        message: "تاریخ تولد نمی‌تواند در آینده باشد.",
      }),
  })
  .refine((data) => data.Password === data.PasswordAgain, {
    message: "رمز عبور تکراری مطابقت ندارد.",
    path: ["PasswordAgain"],
  });

export const resetPasswordSchema = z.object({
  Email: z
    .string()
    .email({ message: "فرمت ایمیل وارد شده صحیح نیست." })
    .nonempty({ message: "ایمیل نباید خالی باشد." }),
});

export const resetPasswordConfirmSchema = z
  .object({
    Email: z
      .string()
      .email({ message: "فرمت ایمیل وارد شده صحیح نیست." })
      .nonempty({ message: "ایمیل الزامی است." }),
    Token: z.string().nonempty({ message: "توکن بازیابی الزامی است." }),
    NewPassword: z
      .string()
      .min(8, { message: "رمز عبور باید حداقل 8 کاراکتر باشد." })
      .max(16, { message: "رمز عبور نباید بیشتر از 16 کاراکتر باشد." })
      .regex(/^(?=.*[A-Z])(?=.*\d).*$/, {
        message: "رمز عبور باید حداقل شامل یک حرف بزرگ و یک عدد باشد.",
      }),
    NewPasswordAgain: z.string().nonempty({ message: "تکرار رمز عبور الزامی است." }),
  })
  .refine((data) => data.NewPassword === data.NewPasswordAgain, {
    message: "رمزهای عبور مطابقت ندارند.",
    path: ["NewPasswordAgain"],
  });

export const resetPasswordFallbackSchema = z
  .object({
    Email: z
      .string()
      .email({ message: "فرمت ایمیل وارد شده صحیح نیست." })
      .nonempty({ message: "ایمیل الزامی است." }),
    QuestionKey: z.string().nonempty({ message: "ابتدا پرسش امنیتی حساب را دریافت کنید." }),
    Answer: z
      .string()
      .min(2, { message: "پاسخ پرسش امنیتی الزامی است." })
      .max(200, { message: "پاسخ پرسش امنیتی بیش از حد مجاز است." }),
    NewPassword: z
      .string()
      .min(8, { message: "رمز عبور باید حداقل 8 کاراکتر باشد." })
      .max(16, { message: "رمز عبور نباید بیشتر از 16 کاراکتر باشد." })
      .regex(/^(?=.*[A-Z])(?=.*\d).*$/, {
        message: "رمز عبور باید حداقل شامل یک حرف بزرگ و یک عدد باشد.",
      }),
    NewPasswordAgain: z.string().nonempty({ message: "تکرار رمز عبور الزامی است." }),
  })
  .refine((data) => data.NewPassword === data.NewPasswordAgain, {
    message: "رمزهای عبور مطابقت ندارند.",
    path: ["NewPasswordAgain"],
  });
