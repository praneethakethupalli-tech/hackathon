import React from 'react';
import { TextEffect } from '../../components/core/text-effect';
import { TextShimmer } from '../../components/core/text-shimmer';

export function HeroTextHeadline() {
  return (
    <div className="hero-headline-container">
      <div className="mb-3">
        <TextShimmer className="font-bold text-xs uppercase tracking-widest text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200 inline-block">
          ✨ AI-POWERED CROP CARE & PROTECTION
        </TextShimmer>
      </div>
      <h1 className="headline" style={{ fontSize: '2.6rem', fontWeight: 800, lineHeight: 1.18, color: '#1B2B1B', marginBottom: '1rem' }}>
        <TextEffect per="word" preset="slide" delay={0.05}>
          Instant crop insights.
        </TextEffect>
        <br />
        <span className="headline-accent" style={{ color: '#2E7D32' }}>
          <TextEffect per="char" preset="blur" delay={0.4}>
            Smarter
          </TextEffect>
        </span>{' '}
        <TextEffect per="word" preset="slide" delay={0.7}>
          decisions.
        </TextEffect>
      </h1>
    </div>
  );
}
