import React from 'react';
import { GlowEffect } from '../../components/core/glow-effect';
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogSubtitle,
  MorphingDialogDescription,
  MorphingDialogClose,
} from '../../components/core/morphing-dialog';

export function HeroWorkflowCards() {
  return (
    <div className="hero-workflow-wrapper mt-6">
      {/* Subheader with Morphing Dialog */}
      <MorphingDialog>
        <MorphingDialogTrigger className="inline-block w-full text-left cursor-pointer">
          <div className="workflow-steps-header group flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/90 hover:bg-emerald-100/90 transition-all border border-emerald-200/90 mb-6 shadow-sm">
            <div>
              <span className="workflow-eyebrow bg-emerald-700 text-white px-3 py-1 rounded-full text-xs font-extrabold tracking-wider inline-flex items-center gap-1.5">
                3-STEP PROTECTION WORKFLOW
                <span className="animate-pulse bg-white/30 rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px]">i</span>
              </span>
              <p className="workflow-subtitle text-xs sm:text-sm font-semibold text-emerald-900 mt-1.5">
                Follow these sequential steps to diagnose & protect your harvest
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-full border border-emerald-300 group-hover:scale-105 transition-transform shrink-0 ml-3 shadow-xs">
              View Guide ↗
            </span>
          </div>
        </MorphingDialogTrigger>

        <MorphingDialogContainer>
          <MorphingDialogContent className="max-w-lg p-6 rounded-3xl bg-white border-2 border-emerald-500/20 shadow-2xl relative">
            <MorphingDialogClose />
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🌱</span>
              <MorphingDialogTitle className="text-2xl font-extrabold text-emerald-950">
                3-Step Crop Protection Guide
              </MorphingDialogTitle>
            </div>
            <MorphingDialogSubtitle className="text-emerald-700 font-medium text-sm mb-4">
              How CropGuide protects your yield in 3 simple AI-driven stages
            </MorphingDialogSubtitle>

            <MorphingDialogDescription className="space-y-3.5 text-emerald-900 text-sm">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex gap-3">
                <span className="text-sm font-black text-emerald-700 bg-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-emerald-300">
                  01
                </span>
                <div>
                  <h4 className="font-bold text-emerald-950">1. Instant Visual Detection</h4>
                  <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                    Upload a photo of affected leaves or soil. Our computer vision neural model scans for 45+ crop diseases and pest threats.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex gap-3">
                <span className="text-sm font-black text-teal-700 bg-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-teal-300">
                  02
                </span>
                <div>
                  <h4 className="font-bold text-teal-950">2. Precise AI Diagnosis</h4>
                  <p className="text-xs text-teal-800 mt-0.5 leading-relaxed">
                    Get an instant confidence breakdown, severity level, disease details, and weather impact analysis.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex gap-3">
                <span className="text-sm font-black text-amber-700 bg-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-amber-300">
                  03
                </span>
                <div>
                  <h4 className="font-bold text-amber-950">3. Actionable Treatment Plan</h4>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    Receive organic and chemical treatment options with spray timing recommendations tailored to your local climate.
                  </p>
                </div>
              </div>

              <div className="pt-2 text-center">
                <a
                  href="analyze.html"
                  className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm px-6 py-2.5 rounded-full transition-all shadow-md"
                >
                  Start Scan Now →
                </a>
              </div>
            </MorphingDialogDescription>
          </MorphingDialogContent>
        </MorphingDialogContainer>
      </MorphingDialog>

      {/* 3 Square Cards with Glow Effect */}
      <ol className="feature-strip" aria-label="Core workflow steps">
        <li className="feature-strip-item relative group">
          <a href="analyze.html" className="square-card-btn detect-card relative z-10" title="Step 1: Detect crop issues">
            <GlowEffect
              colors={['#2E7D32', '#66BB6A', '#81C784', '#2E7D32']}
              mode="rotate"
              blur="medium"
              duration={4}
              className="opacity-40 group-hover:opacity-100 transition-opacity rounded-[24px]"
            />
            <span className="card-badge detect-badge">01 DETECT</span>
            <div className="card-icon-wrapper detect-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <div className="card-text-block">
              <h3 className="card-title">1. Detect</h3>
              <p className="card-desc">Upload crop photo</p>
            </div>
            <div className="card-action-btn detect-action-btn">
              <span>Start Scan</span>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="action-arrow">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </div>
          </a>
        </li>

        <li className="feature-strip-item relative group">
          <a href="#sample-diagnosis" className="square-card-btn diagnosis-card relative z-10" title="Step 2: View sample AI diagnosis">
            <GlowEffect
              colors={['#00897B', '#26A69A', '#80CBC4', '#00897B']}
              mode="rotate"
              blur="medium"
              duration={4}
              className="opacity-40 group-hover:opacity-100 transition-opacity rounded-[24px]"
            />
            <span className="card-badge diagnosis-badge">02 DIAGNOSIS</span>
            <div className="card-icon-wrapper diagnosis-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div className="card-text-block">
              <h3 className="card-title">2. Diagnosis</h3>
              <p className="card-desc">AI problem analysis</p>
            </div>
            <div className="card-action-btn diagnosis-action-btn">
              <span>View Analysis</span>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="action-arrow">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </div>
          </a>
        </li>

        <li className="feature-strip-item relative group">
          <a href="#how" className="square-card-btn act-card relative z-10" title="Step 3: Learn when and how to act">
            <GlowEffect
              colors={['#E65100', '#FB8C00', '#FFB74D', '#E65100']}
              mode="rotate"
              blur="medium"
              duration={4}
              className="opacity-40 group-hover:opacity-100 transition-opacity rounded-[24px]"
            />
            <span className="card-badge act-badge">03 ACT</span>
            <div className="card-icon-wrapper act-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="card-text-block">
              <h3 className="card-title">3. Act</h3>
              <p className="card-desc">Treatment guide</p>
            </div>
            <div className="card-action-btn act-action-btn">
              <span>Action Plan</span>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="action-arrow">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </div>
          </a>
        </li>
      </ol>
    </div>
  );
}
