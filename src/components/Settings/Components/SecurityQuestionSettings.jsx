import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { ErrorAlert, SuccessAlert } from "../../../helpers/customAlert";
import { SECURITY_QUESTION_OPTIONS, getSecurityQuestionByKey } from "../../../constants/securityQuestions";
import { useUpdateSecurityQuestionMutation } from "../../../store/Slices/userSettings/userSettingsApi";

const securityQuestionSchema = z
  .object({
    questionKey: z.string().nonempty({ message: "انتخاب سؤال امنیتی الزامی است." }),
    customQuestionText: z.string().optional(),
    answer: z
      .string()
      .min(2, { message: "پاسخ سؤال امنیتی الزامی است." })
      .max(200, { message: "پاسخ سؤال امنیتی نباید بیشتر از 200 کاراکتر باشد." }),
    answerAgain: z.string().nonempty({ message: "تکرار پاسخ سؤال امنیتی الزامی است." }),
  })
  .superRefine((data, ctx) => {
    if (data.questionKey === "custom") {
      const customText = (data.customQuestionText || "").trim();
      if (customText.length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customQuestionText"],
          message: "متن سؤال اختصاصی باید حداقل 10 کاراکتر باشد.",
        });
      }

      const forbidden = ["نام مادر", "نام پدر", "محل تولد", "تاریخ تولد", "کد ملی", "شماره ملی"];
      if (forbidden.some((item) => customText.includes(item))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customQuestionText"],
          message: "لطفاً از سؤال‌های عمومی یا قابل‌حدس استفاده نکنید.",
        });
      }
    }

    if (data.answer !== data.answerAgain) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answerAgain"],
        message: "پاسخ‌ها با هم مطابقت ندارند.",
      });
    }
  });

function SecurityQuestionSettings() {
  const user = useSelector((state) => state.auth?.user);
  const [updateSecurityQuestion, { isLoading }] = useUpdateSecurityQuestionMutation();

  const currentKey = user?.userSettings?.securityQuestionKey || "";
  const currentText = user?.userSettings?.securityQuestionText || "";
  const hasAnswer = Boolean(user?.userSettings?.securityQuestionAnswerConfigured);

  const defaultQuestion = useMemo(() => getSecurityQuestionByKey(currentKey), [currentKey]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(securityQuestionSchema),
    defaultValues: {
      questionKey: currentKey || SECURITY_QUESTION_OPTIONS[0].key,
      customQuestionText: currentKey === "custom" ? currentText : "",
      answer: "",
      answerAgain: "",
    },
  });

  const selectedQuestionKey = watch("questionKey");

  const onSubmit = async (data) => {
    try {
      const selectedQuestion = getSecurityQuestionByKey(data.questionKey);
      const securityQuestionTextPreview =
        data.questionKey === "custom"
          ? (data.customQuestionText || "").trim()
          : selectedQuestion?.text || "";

      await updateSecurityQuestion({
        questionKey: data.questionKey,
        customQuestionText: data.questionKey === "custom" ? (data.customQuestionText || "").trim() : null,
        answer: data.answer,
        securityQuestionTextPreview,
      }).unwrap();

      SuccessAlert("پرسش امنیتی با موفقیت ذخیره شد.");
      reset({
        questionKey: data.questionKey,
        customQuestionText: data.questionKey === "custom" ? (data.customQuestionText || "").trim() : "",
        answer: "",
        answerAgain: "",
      });
    } catch (error) {
      ErrorAlert(error?.data?.message || "ذخیره پرسش امنیتی انجام نشد.");
    }
  };

  return (
    <div style={{ marginTop: "20px", borderTop: "1px solid #d9dde5", paddingTop: "16px" }}>
      <h4 style={{ marginBottom: "8px" }}>پرسش امنیتی بازیابی رمز عبور</h4>
      <p style={{ fontSize: "13px", lineHeight: 1.8, marginBottom: "10px", opacity: 0.85 }}>
        برای ریست رمز عبور بدون ایمیل، یک پرسش امنیتی غیرعمومی و پاسخ محرمانه تعیین کنید.
      </p>

      <div style={{ fontSize: "13px", marginBottom: "12px", lineHeight: 1.8 }}>
        <div>سؤال فعلی: {currentText || defaultQuestion?.text || "در حال تنظیم پیش‌فرض..."}</div>
        <div>وضعیت پاسخ: {hasAnswer ? "ثبت شده" : "ثبت نشده"}</div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: "8px" }}>
        <select {...register("questionKey")} disabled={isLoading} style={{ padding: "10px", borderRadius: "8px" }}>
          {SECURITY_QUESTION_OPTIONS.map((item) => (
            <option key={item.key} value={item.key}>{item.label}</option>
          ))}
        </select>
        {errors.questionKey && <span className="error-messages">{errors.questionKey.message}</span>}

        {selectedQuestionKey !== "custom" && (
          <div style={{ fontSize: "13px", lineHeight: 1.8, padding: "10px", borderRadius: "8px", background: "rgba(88,92,225,0.06)" }}>
            {getSecurityQuestionByKey(selectedQuestionKey)?.text}
          </div>
        )}

        {selectedQuestionKey === "custom" && (
          <>
            <input
              {...register("customQuestionText")}
              type="text"
              placeholder="متن سؤال اختصاصی (غیرعمومی و غیرقابل‌حدس)"
              disabled={isLoading}
              style={{ padding: "10px", borderRadius: "8px" }}
            />
            {errors.customQuestionText && <span className="error-messages">{errors.customQuestionText.message}</span>}
          </>
        )}

        <input
          {...register("answer")}
          type="password"
          placeholder="پاسخ محرمانه"
          disabled={isLoading}
          style={{ padding: "10px", borderRadius: "8px" }}
        />
        {errors.answer && <span className="error-messages">{errors.answer.message}</span>}

        <input
          {...register("answerAgain")}
          type="password"
          placeholder="تکرار پاسخ محرمانه"
          disabled={isLoading}
          style={{ padding: "10px", borderRadius: "8px" }}
        />
        {errors.answerAgain && <span className="error-messages">{errors.answerAgain.message}</span>}

        <button className="edit-btn" type="submit" disabled={isLoading} style={{ width: "fit-content", padding: "8px 12px" }}>
          ذخیره پرسش امنیتی
        </button>
      </form>
    </div>
  );
}

export default SecurityQuestionSettings;
