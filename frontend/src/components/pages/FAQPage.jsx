import React, { useState } from 'react';
import './css/FAQPage.css';

const FAQPage = () => {
  const [expandedItems, setExpandedItems] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpand = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // PLACEHOLDER CONTENT - Replace with exact content from original FAQ page
  const faqData = [
    {
      category: "General Information",
      items: [
        {
          id: "general-1",
          question: "What is Troupe Academy?",
          answer: "An innovative online learning platform that uses cutting edge methods to offer interactive, personalized education."
        },
        {
          id: "general-2",
          question: "Who can benefit from Troupe Academy?",
          answer: "Students of various ages and learning styles, particularly those seeking engaging and interactive educational experiences. So, students that want to be elite really."
        },
        {
          id: "general-3",
          question: "How does your method of learning work?",
          answer: "We ask students questions that gradually lead them to realisation of knowledge."
        },
        {
          id: "general-4",
          question: "What courses do you offer?",
          answer: "A range of subjects focusing on mathematics and science, and critical reasoning with plans to expand."
        },
        {
          id: "general-5",
          question: "What makes Troupe Academy different?",
          answer: "Our unique focus on interactive learning and content creation by students sets us apart."
        }
      ]
    },
    {
      category: "Pricing & Payments",
      items: [
        {
          id: "pricing-1",
          question: "How much does it cost?",
          answer: "We offer several subscription tiers, including a free version and when you are ready to get your hands dirty: weekly access to troupe.academy live, a one-hour session with the best tutors (if you are on our priority plan, your session will be at a fixed time every week). With our full access plan, you'd have to complete the week's task before you can book a session. You also get the ability to create, share your own content, and receive income."
        },
        {
          id: "pricing-2",
          question: "Can I try Troupe Academy before subscribing?",
          answer: "Yes, we offer a trial period for you to experience our platform firsthand."
        },
        {
          id: "pricing-3",
          question: "What payment methods do you accept?", 
          answer: "We accept payment via debit card, credit card and paypal"
        },
        {
          id: "pricing-4",
          question: "Are there any setup fees?",
          answer: "There are no setup fees"
        }
      ]
    },
    {
      category: "Scheduling & Sessions",
      items: [
        {
          id: "scheduling-1",
          question: "What is the troupe.academy tutor session like?",
          answer: "Here you can get answers to your questions. Your expert will verify your understanding. Practice under test-like conditions. And of course, connect with others in your group."
        },
        {
          id: "scheduling-2",
          question: "How do I book a session?",
          answer: "Very easy, once you sign up your wards and they enroll in a course they can easily book any session they want and they are up an going"
        },
        {
          id: "scheduling-3",
          question: "Can I reschedule sessions?",
          answer: "Yes you can reschedule or cancel 24 hrs to the session. Your credits wull be used towards another session"
        },
        {
          id: "scheduling-4",
          question: "What happens if I miss a session?",
          answer: "If a session is missed without giving us 24 hour notice the credit will be considered used"
        }
      ]
    },
    {
      category: "Tutors & Quality",
      items: [
        {
          id: "tutors-1",
          question: "How are tutors selected?",
          answer: "Tutors are students who have mastered the subjects and have excelled in exams"
        },
        {
          id: "tutors-2",
          question: "What qualifications do tutors have?",
          answer: "Tutors are certified black belters based on thier previous outsanding peformance in this subject"
        },
        {
          id: "tutors-3",
          question: "Can I request a specific tutor?",
          answer: "Yes you can based on the schdule you like"
        }
      ]
    }
  ];

  const filteredFAQ = faqData.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <div className="faq-page">
      <div className="faq-container">
        <header className="faq-header">
          <h1 className="faq-title">Frequently Asked Questions</h1>
          <p className="faq-subtitle">Find answers to common questions about Troupe Academy</p>
          
          <div className="faq-search">
            <input
              type="text"
              placeholder="Search frequently asked questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="faq-search-input"
            />
          </div>
        </header>

        <main className="faq-content">
          {filteredFAQ.length === 0 ? (
            <div className="faq-no-results">
              <p>No questions found matching your search.</p>
            </div>
          ) : (
            filteredFAQ.map((category, categoryIndex) => (
              <section key={categoryIndex} className="faq-category">
                <h2 className="faq-category-title">{category.category}</h2>
                
                <div className="faq-items">
                  {category.items.map((item) => (
                    <div 
                      key={item.id} 
                      className={`faq-item ${expandedItems[item.id] ? 'expanded' : ''}`}
                    >
                      <button
                        className="faq-question-btn"
                        onClick={() => toggleExpand(item.id)}
                        aria-expanded={expandedItems[item.id]}
                      >
                        <span className="faq-question">{item.question}</span>
                        <span className="faq-toggle-icon">
                          {expandedItems[item.id] ? '−' : '+'}
                        </span>
                      </button>
                      
                      <div className={`faq-answer-wrapper ${expandedItems[item.id] ? 'expanded' : ''}`}>
                        <div className="faq-answer">
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </main>

        <footer className="faq-footer">
          <div className="faq-contact">
            <h3>Still have questions?</h3>
            <p>Can't find what you're looking for? Get in touch with our support team.</p>
            <a href="mailto:support@troupe.academy" className="faq-contact-btn">
              Contact Support
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default FAQPage;