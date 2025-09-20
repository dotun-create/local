# Project Directory Structure

This document outlines the reorganized directory structure for the Course Card Component project.

## 📁 New Directory Structure

```
src/
├── App.jsx                 # Main application component
├── App.css                 # Main application styles
├── index.js               # React app entry point
├── components/            # All React components
│   ├── CourseCard.jsx
│   ├── CourseCategoryComponent.jsx
│   ├── CourseDisplayComponent.jsx
│   ├── CoursePage.jsx
│   ├── CourseSectionComponent.jsx
│   ├── FooterComponent.jsx
│   ├── HeaderMenu.jsx
│   ├── HeroPage.jsx
│   ├── HowItWorksCard.jsx
│   ├── HowItWorksContainer.jsx
│   ├── HttpHelpersDemo.jsx
│   ├── LoginBar.jsx
│   ├── PaymentGateway.jsx
│   ├── PaymentsPage.jsx
│   ├── SessionBookingDemo.jsx
│   ├── SessionBookingForm.jsx
│   ├── StudentContainer.jsx
│   ├── TroupeHeaderComponent.jsx
│   ├── ZoomMeetingManager.jsx
│   └── css/               # Component stylesheets
│       ├── CourseCard.css
│       ├── CourseCategoryComponent.css
│       ├── CourseDisplayComponent.css
│       ├── CoursePage.css
│       ├── CourseSectionComponent.css
│       ├── FooterComponent.css
│       ├── HeaderMenu.css
│       ├── HeroPage.css
│       ├── HowItWorksCard.css
│       ├── HowItWorksContainer.css
│       ├── HttpHelpersDemo.css
│       ├── LoginBar.css
│       ├── PaymentGateway.css
│       ├── PaymentsPage.css
│       ├── SessionBookingDemo.css
│       ├── SessionBookingForm.css
│       ├── StudentContainer.css
│       ├── TroupeHeaderComponent.css
│       └── ZoomMeetingManager.css
├── config/                # Application configuration
│   ├── appConfig.js       # Main app configuration
│   └── index.js           # Config exports
├── utils/                 # Utility functions
│   ├── httpHelpers.js     # HTTP request helpers
│   ├── paymentHelpers.js  # Payment processing utilities
│   └── zoomHelpers.js     # Zoom API integration
└── resources/             # Static assets
    └── images/            # Image assets
        ├── facebook.svg
        ├── how1.png
        ├── how2.png
        ├── how3.png
        ├── img4.webp
        ├── instagram.svg
        ├── linkedin.svg
        ├── logo.jpeg
        ├── twitter.svg
        └── youtube.svg
```

## 🔧 Import Path Changes

### In App.jsx (from src/):
```javascript
// Component imports
import ComponentName from './components/ComponentName';

// Config imports (unchanged)
import { appConfig } from './config';

// App CSS (unchanged)
import './App.css';
```

### In Components (from src/components/):
```javascript
// Other component imports (unchanged - same directory)
import OtherComponent from './OtherComponent';

// CSS imports
import './css/ComponentName.css';

// Config imports
import { appConfig } from '../config';

// Utils imports
import { helperFunction } from '../utils/helperName';
```

## 📝 Benefits of New Structure

### 1. **Better Organization**
- All components are grouped together
- CSS files are in a dedicated subdirectory
- Clear separation of concerns

### 2. **Easier Navigation**
- Components are easy to find in one location
- CSS files are organized in their own folder
- Consistent naming convention

### 3. **Scalability**
- Easy to add new components
- CSS organization prevents conflicts
- Modular structure supports growth

### 4. **Maintainability**
- Clear import paths
- Logical file grouping
- Easy to understand structure

## 🚀 Component Categories

### **Core UI Components**
- `CourseCard.jsx` - Individual course display card
- `HeaderMenu.jsx` - Navigation menu component
- `FooterComponent.jsx` - Page footer
- `HeroPage.jsx` - Hero section component

### **Page Components**
- `CoursePage.jsx` - Courses listing page
- `PaymentsPage.jsx` - Payment processing page
- `SessionBookingDemo.jsx` - Session booking demonstration

### **Feature Components**
- `PaymentGateway.jsx` - Payment processing integration
- `SessionBookingForm.jsx` - Session booking form
- `ZoomMeetingManager.jsx` - Zoom meeting management
- `HttpHelpersDemo.jsx` - HTTP utilities demonstration

### **Layout Components**
- `HowItWorksContainer.jsx` - How it works section
- `StudentContainer.jsx` - Student information section
- `TroupeHeaderComponent.jsx` - Main header component

### **Utility Components**
- `CourseDisplayComponent.jsx` - Course display logic
- `CourseCategoryComponent.jsx` - Course categorization
- `CourseSectionComponent.jsx` - Course section display
- `LoginBar.jsx` - Login interface

## 🔄 Migration Notes

### **Completed Changes:**
✅ All component files moved to `src/components/`  
✅ All CSS files moved to `src/components/css/`  
✅ App.jsx imports updated to use `./components/` prefix  
✅ Component CSS imports updated to use `./css/` prefix  
✅ Config imports updated to use `../config` from components  
✅ Utils imports updated to use `../utils/` from components  
✅ Build process tested and verified  

### **Import Pattern Examples:**

**App.jsx imports:**
```javascript
import CoursePage from './components/CoursePage';
import PaymentsPage from './components/PaymentsPage';
```

**Component internal imports:**
```javascript
import './css/ComponentName.css';
import { appConfig } from '../config';
import { helperFunction } from '../utils/helperName';
```

This reorganization provides a cleaner, more maintainable codebase structure that follows React best practices for component organization.