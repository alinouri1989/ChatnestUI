// @ts-nocheck
import { jwtDecode } from "jwt-decode";

export const getUserIdFromToken = (token) => {
    if (token) {
        const decodedToken = jwtDecode(token);
        const userId = decodedToken.sub;
        return userId;

    }
    return null;
};