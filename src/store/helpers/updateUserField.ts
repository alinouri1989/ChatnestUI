// @ts-nocheck
import { setUser } from "../Slices/auth/authSlice";

export const updateUserField = (dispatch, currentUser, field, value) => {
    if (!currentUser) return;

    dispatch(
        setUser({
            ...currentUser,
            user: {
                ...currentUser.user,
                [field]: value,
            },
        })
    );
};
