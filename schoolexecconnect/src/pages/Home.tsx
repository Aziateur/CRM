import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './Home.css'

/* ===== Hero Slider Data ===== */
const heroSlides = [
    {
        title: 'School Exec Connect',
        description: 'provides a wide range of educational services including searches for school executives, board development workshops, superintendent evaluation, strategic planning, communication assessments, mentoring, conflict resolution, and executive coaching for improving administrators\' skills.',
        image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80',
    },
    {
        title: 'National Search & Consulting Firm',
        description: 'We provide customized services to boards of education, school districts, and candidates seeking employment. Our consultants are nationally recognized and among the most successful in the field.',
        image: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&q=80',
    },
]

/* ===== Top Row Tiles ===== */
const topTiles = [
    {
        title: 'ABOUT SCHOOL EXEC CONNECT',
        image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&q=80',
        link: '/about-us',
    },
    {
        title: 'OUR CREDO',
        image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80',
        link: '/credo',
    },
    {
        title: 'ADDITIONAL SERVICES',
        image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80',
        link: '/other-services',
    },
]

/* ===== Bottom Row Tiles ===== */
const bottomTilesRow1 = [
    {
        title: 'AVAILABLE POSITIONS',
        image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&q=80',
        link: '/available-positions',
    },
    {
        title: 'APPLY FOR A POSITION',
        image: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=400&q=80',
        link: '/available-positions',
    },
    {
        title: 'COMPLETED SEARCHES',
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80',
        link: '/completed-searches',
    },
]

export default function Home() {
    const [currentSlide, setCurrentSlide] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
        }, 6000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="home">
            {/* ===== HERO SLIDER ===== */}
            <section className="hero">
                {heroSlides.map((slide, i) => (
                    <div
                        key={i}
                        className={`hero__slide ${currentSlide === i ? 'hero__slide--active' : ''}`}
                    >
                        <img src={slide.image} alt="" className="hero__slide-bg" />
                    </div>
                ))}

                {/* Text Box Overlay */}
                <div className="hero__text-box">
                    <h2 className="hero__title">{heroSlides[currentSlide].title}</h2>
                    <p className="hero__description">{heroSlides[currentSlide].description}</p>
                </div>

                {/* Slide Dots */}
                <div className="hero__dots">
                    {heroSlides.map((_, i) => (
                        <button
                            key={i}
                            className={`hero__dot ${currentSlide === i ? 'hero__dot--active' : ''}`}
                            onClick={() => setCurrentSlide(i)}
                            aria-label={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>
            </section>

            {/* ===== MAIN CONTENT ===== */}
            <div className="home__content">
                {/* Introduction Text */}
                <div className="home__intro">
                    <p>
                        <strong>SCHOOL EXEC CONNECT</strong> is a national search and consulting firm that provides customized services to boards of education, school districts and candidates seeking employment. We offer full consulting services that are designed to meet every district's particular needs.
                    </p>

                    <p>
                        <strong>SCHOOL EXEC CONNECT</strong> specializes in finding leaders for schools including superintendents, central office administrators and principals. Boards of education consistently find our search process outstanding and our consultants professional and knowledgeable. Our wide network of professional consultants enables our firm to have a national outreach that is one of the best in the field. We make educational connections that have powerful, positive results.
                    </p>

                    <p>
                        <strong>SCHOOL EXEC CONNECT</strong> provides a wide range of educational services including searches for school executives, board development workshops, superintendent evaluation, strategic planning, communication assessments, mentoring, conflict resolution, and executive coaching for improving administrators' skills.
                    </p>

                    <p>
                        <strong>Our Consultants</strong> are nationally recognized and among the most successful in the field. They have extensive school executive experience, have worked closely with boards of education and understand the complex needs of today's school districts.
                    </p>

                    <p>
                        <strong>Our Vision</strong> is to move student learning forward through finding excellent leaders of schools and to provide quality services that improve leadership skills at all levels.
                    </p>

                    <p>
                        <strong>SCHOOL EXEC CONNECT</strong> supports Equal Opportunity Employment Laws.
                    </p>

                    <p>
                        <strong>SCHOOL EXEC CONNECT</strong> is committed to providing all persons and organizations with equal access to its services without regard to race, color, religion, national origin, gender, age, marital status, disability, or sexual orientation.
                    </p>
                </div>

                {/* ===== TOP TILES (3 boxes) ===== */}
                <div className="home__tiles-row">
                    {topTiles.map((tile, i) => (
                        <Link to={tile.link} key={i} className="home__tile">
                            <h3 className="home__tile-title">{tile.title}</h3>
                            <div className="home__tile-image">
                                <img src={tile.image} alt={tile.title} />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ===== CTA BANNER ===== */}
            <section className="cta-banner">
                <div className="cta-banner__inner">
                    <div className="cta-banner__text">
                        <h2>Let Us Know How We Can Help You</h2>
                        <p>SCHOOL EXEC CONNECT provides customized services to boards of education, school districts and candidates seeking employment. We offer full consulting services that are designed to meet every district's particular needs.</p>
                    </div>
                    <Link to="/contact-us" className="cta-banner__btn">
                        Contact Us Today
                    </Link>
                </div>
            </section>

            {/* ===== BOTTOM TILES ===== */}
            <div className="home__content">
                <div className="home__tiles-row">
                    {bottomTilesRow1.map((tile, i) => (
                        <Link to={tile.link} key={i} className="home__tile">
                            <h3 className="home__tile-title">{tile.title}</h3>
                            <div className="home__tile-image">
                                <img src={tile.image} alt={tile.title} />
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Bottom 2-column row */}
                <div className="home__tiles-row home__tiles-row--two">
                    <div className="home__tile home__tile--text-only">
                        <h3 className="home__tile-title">NOVEMBER PROFESSIONAL DEVELOPMENT OPPORTUNITY</h3>
                    </div>
                    <div className="home__tile">
                        <h3 className="home__tile-title">BECOME A SEC ASSOCIATE</h3>
                        <div className="home__join-ribbon">
                            <Link to="/contact-us" className="home__join-link">
                                JOIN OUR TEAM
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
