import React from 'react';
import './css/StudentContainer.css';

const StudentContainer = ({ image, texts, phrase, link, imageSide }) => {
  // Function to highlight the phrase in a given text and make it a link
  const renderTextWithLink = (textContent) => {
    if (!phrase || !link) {
      return textContent;
    }
    
    const phraseIndex = textContent.indexOf(phrase);
    if (phraseIndex === -1) {
      return textContent;
    }
    
    const beforePhrase = textContent.substring(0, phraseIndex);
    const afterPhrase = textContent.substring(phraseIndex + phrase.length);
    
    // Check if it's an internal link
    const isInternalLink = link.startsWith('/') || link.startsWith('#');
    
    return (
      <>
        {beforePhrase}
        <a 
          href={link} 
          className="highlighted-link" 
          {...(!isInternalLink && { target: "_blank", rel: "noopener noreferrer" })}
        >
          {phrase}
        </a>
        {afterPhrase}
      </>
    );
  };

  return (
    <div className={`student-container ${imageSide === 'right' ? 'image-right' : 'image-left'}`}>
      <div className="student-image-column">
        <img src={image} alt="Student" className="student-image" />
      </div>
      
      <div className="student-text-column">
        {texts && texts.length > 0 && (
          <div className="text-grid">
            <div className="text-row header-row">
              <h2 className="student-header">
                {renderTextWithLink(texts[0])}
              </h2>
            </div>
            {texts.slice(1).map((text, index) => (
              <div key={index} className="text-row">
                <p className="student-text">
                  {renderTextWithLink(text)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentContainer;