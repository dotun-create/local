import React from 'react';
import './css/OurFocusPage.css';

const OurFocusPage = () => {
  return (
    <div className="our-focus-page">
      <div className="our-focus-container">
        
        {/* Hero Section */}
        <section className="hero-section">
          <h1 className="hero-title">Students don't just learn here—they teach. And that's the secret.</h1>
          <p className="hero-subtitle">
            Troupe Academy is a 1-on-1 peer tutoring platform where students master Maths and Science by teaching others.
          </p>
          <div className="hero-points">
            <p>AI supports the structure.</p>
            <p>Older students guide the sessions.</p>
            <p>Everyone improves.</p>
          </div>
        </section>

        {/* About Us Section */}
        <section className="about-section">
          <h2 className="section-title">About Us – Troupe Academy</h2>
          <p className="section-content">
            Troupe Academy is reimagining what it means to learn—by putting students in the role of teacher.
          </p>
          <p className="section-content">
            We are an AI-powered peer learning platform where students master Maths and Science by teaching each other in structured, one-on-one online sessions. Grounded in research and driven by lived experience, our model transforms passive learners into confident thinkers by guiding them to explain, reflect, and lead.
          </p>
        </section>

        {/* Our Mission Section */}
        <section className="mission-section">
          <h2 className="section-title">Our Mission</h2>
          <p className="section-content">
            To make elite, personalized education accessible to all, not just a privileged few—by using technology and the power of peer learning.
          </p>
        </section>

        {/* Our Story Section */}
        <section className="story-section">
          <h2 className="section-title">Our Story</h2>
          <p className="section-content">
            Troupe Academy was founded by two friends in love with education.
          </p>
          <p className="section-content">
            Together, they set out to build an educational platform that reflects what they needed growing up: accessible, high-quality learning led by relatable role models—students themselves.
          </p>
        </section>

        {/* What We Do Section */}
        <section className="what-we-do-section">
          <h2 className="section-title">What We Do</h2>
          <ul className="what-we-do-list">
            <li>
              <strong>Structured Peer Tutoring:</strong> High-achieving students are paired with younger learners in guided sessions.
            </li>
            <li>
              <strong>Pre-Session Preparation:</strong> Homework tasks and training emails ensure both students come ready to learn.
            </li>
            <li>
              <strong>Post-Session AI Feedback:</strong> Our technology provides personalized feedback and progress tracking after every session.
            </li>
          </ul>
          <p className="section-content">
            We believe students learn best when they teach—and we've built the system to make that happen, at scale.
          </p>
        </section>

        {/* Why It Works Section */}
        <section className="why-it-works-section">
          <h2 className="section-title">Why It Works</h2>
          <p className="section-content">
            Research shows that teaching others helps learners understand and retain knowledge more deeply (Fiorella & Mayer, 2013, 2014). We've turned this insight into a platform that empowers students and expands access to world-class learning.
          </p>
        </section>

        {/* Join the Movement Section */}
        <section className="join-movement-section">
          <h2 className="section-title">Join the Movement</h2>
          <p className="section-content">
            Whether you're a student, parent, educator, or partner—Troupe Academy is for you.
          </p>
          <p className="section-content">
            Together, we can make one-on-one learning the standard, not the exception.
          </p>
        </section>

      </div>
    </div>
  );
};

export default OurFocusPage;