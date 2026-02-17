import { BsLinkedin } from "react-icons/bs";
import { BsGithub } from "react-icons/bs";
import { MdEmail } from "react-icons/md";

function Help() {
  return (
    <div className="help-box">
      <h3>راهنما</h3>
      <div className="version-info">
        <p>ChatNest برای وب</p>
        <span>نسخه 1.000.0.0</span>
      </div>
      <div className="contact-us">
        <p>تماس با ما</p>
        <span>دیدگاهتان دربارهٔ این برنامه را با ما به اشتراک بگذارید</span>
        <div className="rate-box">
          <a href="mailto:alinouri1989@gmail.com" target="_blank">تماس با ما</a>
          <a>به برنامه امتیاز دهید</a>
        </div>
        <a>مرکز راهنما</a>
        <a>مجوزها</a>
        <a>شرایط و سیاست حفظ حریم خصوصی</a>
      </div>
      <p className="developer-team-title">تیم توسعه</p>
      <div className="developers-box">
        <div className="developer-box">
          <div className="developer-image-and-info">
            <img src="/src/assets/svg/DefaultUserProfilePhoto.svg" alt="ali nouri" />
            <div className="developer-info">
              <span>علی نوری</span>
              <p>Frontend Developer</p>
            </div>
          </div>
          <div className="contact-informations-box">
            <a href="https://www.linkedin.com/alinouri1989/" target="_blank"><BsLinkedin /></a>
            <a href="https://github.com/alinouri1989" target="_blank"><BsGithub /></a>
            <a href="mailto:alinouri1989@gmail.com" target="_blank"><MdEmail /></a>
          </div>
        </div>
        <div className="developer-box">
          <div className="developer-image-and-info">
            <img src="/src/assets/svg/DefaultUserProfilePhoto.svg" alt="ali nouri" />
            <div className="developer-info">
              <span>علی نوری</span>
              <p>Backend Developer</p>
            </div>
          </div>
          <div className="contact-informations-box">
            <a href="https://www.linkedin.com/alinouri1989/" target="_blank"><BsLinkedin /></a>
            <a href="https://github.com/alinouri1989" target="_blank"><BsGithub /></a>
            <a href="mailto:alinouri1989@gmail.com" target="_blank"><MdEmail /></a>
          </div>
        </div>
        <div className="developer-box"></div>
      </div>
      <div className="copyright-box">
        <p>2026 © ChatNest</p>
      </div>
    </div>
  )
}

export default Help