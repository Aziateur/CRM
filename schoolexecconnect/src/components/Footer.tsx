import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import './Footer.css'

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer__main">
                <div className="footer__inner">
                    {/* Column 1 - Follow Us */}
                    <div className="footer__col">
                        <h4 className="footer__heading">FOLLOW US FOR SEC UPDATES</h4>
                        <div className="footer__socials">
                            <a
                                href="https://www.linkedin.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="footer__social-link"
                                aria-label="LinkedIn"
                            >
                                <span className="footer__social-icon footer__social-icon--linkedin">in</span>
                            </a>
                            <a
                                href="https://x.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="footer__social-link"
                                aria-label="X (Twitter)"
                            >
                                <span className="footer__social-icon footer__social-icon--x">𝕏</span>
                            </a>
                        </div>
                    </div>

                    {/* Column 2 - Links */}
                    <div className="footer__col">
                        <h4 className="footer__heading">SCHOOL EXEC CONNECT</h4>
                        <ul className="footer__links">
                            <li><Link to="/contact-us" className="footer__link">Contact Us</Link></li>
                            <li><Link to="/credo" className="footer__link">Privacy Policy</Link></li>
                            <li><Link to="/credo" className="footer__link">Terms of Use</Link></li>
                        </ul>
                    </div>

                    {/* Column 3 - Search */}
                    <div className="footer__col">
                        <h4 className="footer__heading">SEARCH OUR SITE</h4>
                        <div className="footer__search">
                            <input
                                type="text"
                                placeholder="SEARCH THIS WEBSITE"
                                className="footer__search-input"
                            />
                            <button className="footer__search-btn" aria-label="Search">
                                <Search size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="footer__bottom">
                <p className="footer__copyright">
                    COPYRIGHT &copy; {new Date().getFullYear()} &middot; EXECUTIVE PRO ON GENESIS FRAMEWORK &middot; WORDPRESS &middot; LOG IN
                </p>
            </div>
        </footer>
    )
}
