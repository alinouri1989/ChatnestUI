
import { useParams } from "react-router-dom";

import WelcomeScreen from "../WelcomeScreen/WelcomeScreen";
import "../layout.scss";


function Archives() {
  const { id } = useParams();
  return (
    <>
      <div className='archive-general-box'>
        {!id && <WelcomeScreen text={"بایگانی‌های شخصی شما سرتاسر رمزگذاری شده‌اند"} />}
      </div>
    </>

  )
}

export default Archives;