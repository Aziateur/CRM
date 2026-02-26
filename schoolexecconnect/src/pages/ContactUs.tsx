import { useState, FormEvent } from 'react'
import { Mail, Phone, MapPin, Send, Printer } from 'lucide-react'
import './About.css'
import './ContactUs.css'

export default function ContactUs() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    })
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
        setSubmitted(true)
        // In production, this would send to a backend
    }

    return (
        <div className="contact-page">
            <section className="page-hero">
                <div className="page-hero__bg">
                    <img src="https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=1400&q=80" alt="" />
                    <div className="page-hero__overlay" />
                </div>
                <div className="page-hero__content">
                    <div className="section-badge">
                        <Mail size={14} />
                        Get in Touch
                    </div>
                    <h1>Contact Us</h1>
                    <p>We'd love to hear from you. Reach out to learn more about our services.</p>
                </div>
            </section>

            <div className="page-content">
                <div className="contact-layout">
                    {/* Contact Info */}
                    <div className="contact-info">
                        <div className="contact-info__card">
                            <h3>School Exec Connect</h3>
                            <div className="contact-info__details">
                                <div className="contact-info__item">
                                    <MapPin size={18} className="contact-info__icon" />
                                    <div>
                                        <p>805 W. Lake Street</p>
                                        <p>#301</p>
                                        <p>Oak Park, IL 60301</p>
                                    </div>
                                </div>
                                <div className="contact-info__item">
                                    <Phone size={18} className="contact-info__icon" />
                                    <div>
                                        <p>Phone: (312)-780-1462</p>
                                    </div>
                                </div>
                                <div className="contact-info__item">
                                    <Printer size={18} className="contact-info__icon" />
                                    <div>
                                        <p>Fax: (312)-277-1081</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="contact-form-wrap">
                        {submitted ? (
                            <div className="contact-success">
                                <div className="contact-success__icon">
                                    <Send size={32} />
                                </div>
                                <h3>Message Sent!</h3>
                                <p>Thank you for reaching out. We'll get back to you within 1-2 business days.</p>
                                <button className="btn btn-primary" onClick={() => setSubmitted(false)}>
                                    Send Another Message
                                </button>
                            </div>
                        ) : (
                            <form className="contact-form" onSubmit={handleSubmit}>
                                <div className="contact-form__group">
                                    <label htmlFor="name" className="contact-form__label">Your name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        className="contact-form__input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="contact-form__group">
                                    <label htmlFor="email" className="contact-form__label">Your email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        className="contact-form__input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="contact-form__group">
                                    <label htmlFor="subject" className="contact-form__label">Subject</label>
                                    <input
                                        type="text"
                                        id="subject"
                                        className="contact-form__input"
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="contact-form__group">
                                    <label htmlFor="message" className="contact-form__label">Your message (optional)</label>
                                    <textarea
                                        id="message"
                                        className="contact-form__textarea"
                                        rows={6}
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary">
                                    <Send size={16} />
                                    Send Message
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
