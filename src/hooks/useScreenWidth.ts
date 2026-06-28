// @ts-nocheck
import { useEffect, useState } from "react";

const useScreenWidth = (maxWidth) => {
    const [isScreenSmall, setIsScreenSmall] = useState(window.innerWidth <= maxWidth);

    useEffect(() => {
        const handleResize = () => {
            setIsScreenSmall(window.innerWidth <= maxWidth);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [maxWidth]);

    return isScreenSmall;
};

export default useScreenWidth;
