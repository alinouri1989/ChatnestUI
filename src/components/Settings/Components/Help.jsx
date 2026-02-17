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
          <a href="mailto:ChatNest.destek@gmail.com" target="_blank">تماس با ما</a>
          <a>Uygulamaya puan ver</a>
        </div>
        <a>مرکز راهنما</a>
        <a>Lisanslar</a>
        <a>شرایط و سیاست حفظ حریم خصوصی</a>
      </div>
      <p className="developer-team-title">تیم توسعه</p>
      <div className="developers-box">
        <div className="developer-box">
          <div className="developer-image-and-info">
            <img src="https://media.licdn.com/dms/image/v2/D4D03AQFtUmvID7fG8w/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1711049966022?e=1747872000&v=beta&t=11Uockt7nWDYNuATjq9AnuV3I30XxTgy-TW0gAl7xk8" alt="Hamza" />
            <div className="developer-info">
              <span>Hamza Doğan</span>
              <p>Frontend Developer</p>
            </div>
          </div>
          <div className="contact-informations-box">
            <a href="https://www.linkedin.com/in/hamzadogann/" target="_blank"><BsLinkedin /></a>
            <a href="https://github.com/HamzaDogann" target="_blank"><BsGithub /></a>
            <a href="mailto:hamzaalidogantr@gmail.com" target="_blank"><MdEmail /></a>
          </div>
        </div>
        <div className="developer-box">
          <div className="developer-image-and-info">
            <img src="https://media.licdn.com/dms/image/v2/D4D03AQFKMmOugHW2hA/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1697381628491?e=1747872000&v=beta&t=PMwcLtdzb0w5AGziCGKZWyZdntlwcZfFrLQNqmtlImc" alt="Nazmi" />
            <div className="developer-info">
              <span>Nazmi Koçak</span>
              <p>Backend Developer</p>
            </div>
          </div>
          <div className="contact-informations-box">
            <a href="https://www.linkedin.com/in/nazmikocak/" target="_blank"><BsLinkedin /></a>
            <a href="https://github.com/nazmikocak" target="_blank"><BsGithub /></a>
            <a href="mailto:nazmikocak.dev@hotmail.com" target="_blank"><MdEmail /></a>
          </div>
        </div>
        <div className="developer-box"></div>
      </div>
      <div className="copyright-box">
        <p>2025 © ChatNest</p>
      </div>
    </div>
  )
}

export default Help