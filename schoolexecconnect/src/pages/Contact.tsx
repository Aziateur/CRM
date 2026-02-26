import { useState } from 'react'
import './Contact.css'

export default function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        alert('Thank you for your message. We will get back to you shortly.')
        setFormData({ name: '', email: '', subject: '', message: '' })
    }

    return (
        <div className="page-content">
            <h1>Contact Us</h1>

            <div className="contact-info">
                <p><strong>SCHOOL EXEC CONNECT</strong></p>
                <p>805 W. Lake Street</p>
                <p>#301</p>
                <p>Oak Park, IL 60301</p>
                <p>Phone: (312)-780-1462</p>
                <p>Fax: (312)-277-1081</p>
            </div>

            <form className="contact-form" onSubmit={handleSubmit}>
                <div className="contact-form__group">
                    <label htmlFor="name">Your name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="contact-form__group">
                    <label htmlFor="email">Your email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="contact-form__group">
                    <label htmlFor="subject">Subject</label>
                    <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="contact-form__group">
                    <label htmlFor="message">Your message (optional)</label>
                    <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        rows={10}
                    />
                </div>

                <button type="submit" className="contact-form__submit">Submit</button>
            </form>
        </div>
    )
}
