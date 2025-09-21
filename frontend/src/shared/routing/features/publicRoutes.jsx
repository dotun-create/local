/**
 * Public Feature Routes
 * Routes for public pages, marketing, and information
 */

import { createLazyComponent, PageLoadingFallback } from '../../utils/lazyLoader';

// Create lazy-loaded public components
const createPublicComponent = (importFunction, pageName) => {
  return createLazyComponent(importFunction, {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackComponent: () => <PageLoadingFallback title={`Loading ${pageName}...`} />,
    preload: false
  });
};

export const PublicComponents = {
  HomePage: createLazyComponent(
    () => import('../../../components/general/HomePage'),
    {
      maxRetries: 3,
      retryDelay: 1000,
      fallbackComponent: () => <PageLoadingFallback title="Loading Home..." />,
      preload: true // Preload home page
    }
  ),
  AboutPage: createPublicComponent(
    () => import('../../../components/pages/AboutPage'),
    'About Us'
  ),
  OurFocusPage: createPublicComponent(
    () => import('../../../components/pages/OurFocusPage'),
    'Our Focus'
  ),
  FAQPage: createPublicComponent(
    () => import('../../../components/pages/FAQPage'),
    'FAQ'
  ),
  ContactPage: createPublicComponent(
    () => import('../../../components/pages/ContactPage'),
    'Contact Us'
  ),
  PricingPage: createPublicComponent(
    () => import('../../../components/pages/PricingPage'),
    'Pricing'
  ),
  FeaturesPage: createPublicComponent(
    () => import('../../../components/pages/FeaturesPage'),
    'Features'
  ),
  TestimonialsPage: createPublicComponent(
    () => import('../../../components/pages/TestimonialsPage'),
    'Testimonials'
  ),
  BlogPage: createPublicComponent(
    () => import('../../../components/blog/BlogPage'),
    'Blog'
  ),
  BlogPostPage: createPublicComponent(
    () => import('../../../components/blog/BlogPostPage'),
    'Blog Post'
  ),
  PrivacyPolicyPage: createPublicComponent(
    () => import('../../../components/legal/PrivacyPolicyPage'),
    'Privacy Policy'
  ),
  TermsOfServicePage: createPublicComponent(
    () => import('../../../components/legal/TermsOfServicePage'),
    'Terms of Service'
  ),
  CookiePolicyPage: createPublicComponent(
    () => import('../../../components/legal/CookiePolicyPage'),
    'Cookie Policy'
  )
};

export const publicRoutes = [
  {
    path: '/',
    element: PublicComponents.HomePage,
    title: 'Home',
    description: 'Welcome to Troupe - Your comprehensive learning platform',
    isPublic: true,
    preload: true,
    meta: {
      keywords: 'education, learning, online courses, tutoring, students',
      robots: 'index,follow'
    }
  },
  {
    path: '/about',
    element: PublicComponents.AboutPage,
    title: 'About Us',
    description: 'Learn more about our mission and team',
    isPublic: true,
    meta: {
      keywords: 'about, mission, team, company',
      robots: 'index,follow'
    }
  },
  {
    path: '/how-it-works',
    element: PublicComponents.OurFocusPage,
    title: 'How It Works',
    description: 'Discover how our platform transforms learning',
    isPublic: true,
    meta: {
      keywords: 'how it works, process, learning method',
      robots: 'index,follow'
    }
  },
  {
    path: '/features',
    element: PublicComponents.FeaturesPage,
    title: 'Features',
    description: 'Explore our comprehensive learning features',
    isPublic: true,
    meta: {
      keywords: 'features, capabilities, tools, learning platform',
      robots: 'index,follow'
    }
  },
  {
    path: '/pricing',
    element: PublicComponents.PricingPage,
    title: 'Pricing',
    description: 'Choose the perfect plan for your learning needs',
    isPublic: true,
    meta: {
      keywords: 'pricing, plans, cost, subscription',
      robots: 'index,follow'
    }
  },
  {
    path: '/testimonials',
    element: PublicComponents.TestimonialsPage,
    title: 'Testimonials',
    description: 'Hear from our successful students and tutors',
    isPublic: true,
    meta: {
      keywords: 'testimonials, reviews, success stories',
      robots: 'index,follow'
    }
  },
  {
    path: '/faq',
    element: PublicComponents.FAQPage,
    title: 'FAQ',
    description: 'Frequently asked questions and answers',
    isPublic: true,
    meta: {
      keywords: 'faq, questions, help, support',
      robots: 'index,follow'
    }
  },
  {
    path: '/contact',
    element: PublicComponents.ContactPage,
    title: 'Contact Us',
    description: 'Get in touch with our team',
    isPublic: true,
    meta: {
      keywords: 'contact, support, help, reach out',
      robots: 'index,follow'
    }
  },
  {
    path: '/blog',
    element: PublicComponents.BlogPage,
    title: 'Blog',
    description: 'Latest insights on education and learning',
    isPublic: true,
    meta: {
      keywords: 'blog, articles, education, insights',
      robots: 'index,follow'
    }
  },
  {
    path: '/blog/:slug',
    element: PublicComponents.BlogPostPage,
    title: 'Blog Post',
    description: 'Read our latest blog post',
    isPublic: true,
    meta: {
      robots: 'index,follow'
    }
  },
  {
    path: '/privacy',
    element: PublicComponents.PrivacyPolicyPage,
    title: 'Privacy Policy',
    description: 'Our privacy policy and data handling practices',
    isPublic: true,
    meta: {
      keywords: 'privacy, policy, data protection',
      robots: 'index,follow'
    }
  },
  {
    path: '/terms',
    element: PublicComponents.TermsOfServicePage,
    title: 'Terms of Service',
    description: 'Terms and conditions for using our platform',
    isPublic: true,
    meta: {
      keywords: 'terms, service, conditions, legal',
      robots: 'index,follow'
    }
  },
  {
    path: '/cookies',
    element: PublicComponents.CookiePolicyPage,
    title: 'Cookie Policy',
    description: 'Information about our cookie usage',
    isPublic: true,
    meta: {
      keywords: 'cookies, policy, tracking',
      robots: 'index,follow'
    }
  }
];

export default publicRoutes;