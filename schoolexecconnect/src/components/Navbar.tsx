import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import './Navbar.css'

const navLinksRow1 = [
    { label: 'Home', path: '/' },
    { label: 'About Us', path: '/about-us' },
    { label: 'Credo', path: '/credo' },
    { label: 'FAQs', path: '/faqs' },
    { label: 'Other Services', path: '/other-services' },
    { label: 'Available Positions', path: '/available-positions' },
    { label: 'Apply for a Position', path: '/available-positions' },
]

const navLinksRow2 = [
    { label: 'Completed Searches', path: '/completed-searches' },
    { label: 'Contact Us', path: '/contact-us' },
    { label: 'Admin', path: '#' },
]

export default function Navbar() {
    const [searchQuery, setSearchQuery] = useState('')
    const location = useLocation()

    return (
        <header className="navbar">
            <div className="navbar__top">
                <div className="navbar__top-inner">
                    {/* Logo */}
                    <Link to="/" className="navbar__logo" aria-label="School Exec Connect Home">
                        <span className="navbar__logo-school">SCHOOL EXEC</span>
                        <span className="navbar__logo-x">✕</span>
                        <span className="navbar__logo-connect">CONNECT</span>
                    </Link>

                    {/* Search Bar */}
                    <div className="navbar__search">
                        <input
                            type="text"
                            placeholder="SEARCH THIS WEBSITE"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="navbar__search-input"
                        />
                        <button className="navbar__search-btn" aria-label="Search">
                            <Search size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="navbar__nav">
                <div className="navbar__nav-inner">
                    <div className="navbar__links-row">
                        {navLinksRow1.map((link) => (
                            <Link
                                key={link.label}
                                to={link.path}
                                className={`navbar__link ${location.pathname === link.path ? 'navbar__link--active' : ''}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                    <div className="navbar__links-row">
                        {navLinksRow2.map((link) => (
                            <Link
                                key={link.label}
                                to={link.path}
                                className={`navbar__link ${location.pathname === link.path ? 'navbar__link--active' : ''}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </nav>
        </header>
    )
}
