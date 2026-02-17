import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import PreLoader from "../../../shared/components/PreLoader/PreLoader";
import { useChangePasswordMutation } from "../../../store/Slices/userSettings/userSettingsApi";
import { ErrorAlert, SuccessAlert } from "../../../helpers/customAlert";
import { changePasswordSchema } from "../../../schemas/SecuritySchemas";

function ChangePassword() {

    const [changePassword, { isLoading }] = useChangePasswordMutation();

    const { register, handleSubmit, formState: { errors }, reset } = useForm({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            newPasswordAgain: "",
        }
    });

    const onSubmit = async (formData) => {
        try {
            await changePassword(formData).unwrap();
            SuccessAlert("گذرواژه با موفقیت تغییر کرد!");

            reset({
                currentPassword: "",
                newPassword: "",
                newPasswordAgain: "",
            });
        } catch (error) {
            ErrorAlert(error.data.message);
        }
    };

    return (
        <div className="change-password-box">
            <h3>تغییر گذرواژه</h3>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="inputs-box">
                    <div className="input-box">
                        <p>گذرواژه فعلی</p>
                        <input
                            type="password"
                            {...register("currentPassword")}
                            autoComplete="current-password"
                        />
                        {errors.currentPassword && <span className="error-messages">{errors.currentPassword.message}</span>}
                    </div>

                    <div className="input-box">
                        <p>گذرواژه جدید</p>
                        <input
                            type="password"
                            {...register("newPassword")}
                            autoComplete="new-password"
                        />
                        {errors.newPassword && <span className="error-messages">{errors.newPassword.message}</span>}
                    </div>

                    <div className="input-box">
                        <p>تکرار گذرواژه جدید</p>
                        <input
                            type="password"
                            {...register("newPasswordAgain")}
                            autoComplete="new-password"
                        />
                        {errors.newPasswordAgain && <span className="error-messages">{errors.newPasswordAgain.message}</span>}
                    </div>
                </div>

                <div className="option-buttons">
                    <button type="submit" className="savePassword">
                        ذخیره
                    </button>
                </div>
            </form>

            {isLoading && <PreLoader />}
        </div>
    );
}

export default ChangePassword;
