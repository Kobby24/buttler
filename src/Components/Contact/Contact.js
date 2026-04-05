import React from 'react'
import './Contact.css'

const Contact = () => {
  return (
    <div className="contact-page">
      <form className="contact-card">
        <h2>Contact Us</h2>

        <div className="contact-fields">
          <input type="text" id="name" name="name" placeholder="Full Name" required />
          <input type="email" id="email" name="email" placeholder="Email" required />
          <textarea id="message" name="message" placeholder="Your Message" required></textarea>
        </div>

        <button type="submit" className="contact-btn">Send Message</button>

        <p className="contact-note">
          We'll get back to you within 24 hours.
        </p>
      </form>
    </div>
  )
}

export default Contact