import React from 'react';
import ReactDOM from 'react-dom/client';
import { AnimatedNavFramer } from '../components/ui/navigation-menu';
import { HeroTextHeadline } from './components/HeroTextHeadline';
import { HeroWorkflowCards } from './components/HeroWorkflowCards';
import { HeroImageContainer } from './components/HeroImageContainer';

// Mount Navbar
const navContainer = document.getElementById('animated-nav-root');
if (navContainer) {
  ReactDOM.createRoot(navContainer).render(
    <React.StrictMode>
      <AnimatedNavFramer />
    </React.StrictMode>
  );
}

// Mount Hero Text Headline (with TextEffect)
const headlineContainer = document.getElementById('hero-text-headline-root');
if (headlineContainer) {
  ReactDOM.createRoot(headlineContainer).render(
    <React.StrictMode>
      <HeroTextHeadline />
    </React.StrictMode>
  );
}

// Mount Hero Workflow Cards (with Subheader MorphingDialog & GlowEffect Cards)
const workflowContainer = document.getElementById('hero-workflow-cards-root');
if (workflowContainer) {
  ReactDOM.createRoot(workflowContainer).render(
    <React.StrictMode>
      <HeroWorkflowCards />
    </React.StrictMode>
  );
}

// Mount Hero Image Container (with AnimatedBackground)
const imageContainer = document.getElementById('hero-image-root');
if (imageContainer) {
  ReactDOM.createRoot(imageContainer).render(
    <React.StrictMode>
      <HeroImageContainer />
    </React.StrictMode>
  );
}
