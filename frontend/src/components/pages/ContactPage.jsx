import React, { useState } from 'react';
import './css/ContactPage.css';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    try {
      // Here you would typically send the data to your backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitMessage('Thank you for your message! We\'ll get back to you soon.');
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      setSubmitMessage('Sorry, there was an error sending your message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-container">
        <header className="contact-header">
          <h1 className="contact-title">Contact Us</h1>
          <p className="contact-subtitle">
            Get in touch with our team at Troupe Academy. We're here to help you on your learning journey.
          </p>
        </header>

        <div className="contact-content">
          <div className="contact-info-section">
            <div className="contact-info-card">
              <h2>Get In Touch</h2>
              <p>
                Whether you have questions about our courses, need technical support, or want to learn more about becoming a tutor, we're here to help.
              </p>
              
              <div className="contact-details">
                <div className="contact-item">
                  <div className="contact-icon">📧</div>
                  <div className="contact-text">
                    <strong>Email</strong>
                    <p>support@troupe.academy</p>
                  </div>
                </div>
                
                <div className="contact-item">
                  <div className="contact-icon">📱</div>
                  <div className="contact-text">
                    <strong>Phone</strong>
                    <p>+44 (0) 20 7946 0958</p>
                  </div>
                </div>
                
                <div className="contact-item">
                  <div className="contact-icon">🕒</div>
                  <div className="contact-text">
                    <strong>Office Hours</strong>
                    <p>Monday - Friday: 9:00 AM - 6:00 PM GMT</p>
                    <p>Saturday: 10:00 AM - 4:00 PM GMT</p>
                  </div>
                </div>
                
                <div className="contact-item">
                  <div className="contact-icon">📍</div>
                  <div className="contact-text">
                    <strong>Address</strong>
                    <p>Troupe Academy<br/>
                       123 Education Street<br/>
                       London, UK EC1A 1BB</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="quick-links-card">
              <h3>Quick Links</h3>
              <ul className="quick-links-list">
                <li><a href="/faq">Frequently Asked Questions</a></li>
                <li><a href="/courses">Browse Our Courses</a></li>
                <li><a href="/session-booking">Book a Session</a></li>
                <li><a href="/tutor">Become a Tutor</a></li>
              </ul>
            </div>
          </div>

          <div className="contact-form-section">
            <div className="contact-form-card">
              <h2>Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="subject">Subject *</label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="course">Course Information</option>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing & Payments</option>
                    <option value="tutor">Becoming a Tutor</option>
                    <option value="partnership">Partnership Opportunities</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows="6"
                    placeholder="Tell us how we can help you..."
                  ></textarea>
                </div>
                
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
                
                {submitMessage && (
                  <div className={`submit-message ${submitMessage.includes('error') ? 'error' : 'success'}`}>
                    {submitMessage}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        <div className="contact-bottom-section">
          <div className="support-options">
            <h3>Other Ways to Get Support</h3>
            <div className="support-grid">
              <div className="support-option">
                <div className="support-icon">💬</div>
                <h4>Live Chat</h4>
                <p>Chat with our support team during office hours</p>
                <button className="support-btn">Start Chat</button>
              </div>
              
              <div className="support-option">
                <div className="support-icon">📚</div>
                <h4>Help Center</h4>
                <p>Browse our comprehensive knowledge base</p>
                <a href="/faq" className="support-btn">Visit FAQ</a>
              </div>
              
              <div className="support-option">
                <div className="support-icon">🎥</div>
                <h4>Video Tutorials</h4>
                <p>Watch step-by-step guides and tutorials</p>
                <button className="support-btn">Watch Now</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;