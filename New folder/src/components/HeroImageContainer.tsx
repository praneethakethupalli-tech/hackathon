import React, { useState } from 'react';
import { AnimatedBackground } from '../../components/core/animated-background';

const IMAGE_MODES = [
  {
    id: 'field',
    label: '🌾 Field View',
    src: '/src/assets/images/hero_background_1786428785983.jpg',
    badge: 'LIVE FIELD SCAN',
    status: 'Optimal Growth Status',
  },
  {
    id: 'scan',
    label: '🔍 AI Scanner',
    src: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Macro%20close-up%20photograph%20of%20a%20healthy%20green%20plant%20leaf%20with%20subtle%20AI%20digital%20scanner%20lines%20and%20health%20indicators%2C%20clean%20agricultural%20tech%2C%20vibrant%20green%2C%20crisp%20details&image_size=landscape_4_3',
    badge: 'AI NEURAL VISION',
    status: 'Leaf Health 98%',
  },
  {
    id: 'radar',
    label: '🛰️ Pest Radar',
    src: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Overhead%20aerial%20drone%20view%20of%20lush%20green%20farm%20crop%20rows%20with%20clean%20precision%20agriculture%20grid%20overlays%2C%20golden%20hour%20lighting&image_size=landscape_4_3',
    badge: 'SATELLITE RADAR',
    status: 'Zero Threat Risk',
  },
];

export function HeroImageContainer() {
  const [selectedId, setSelectedId] = useState('field');
  const activeMode = IMAGE_MODES.find((m) => m.id === selectedId) || IMAGE_MODES[0];

  return (
    <div className="hero-visual-wrapper relative">
      {/* Animated Background Selector Tabs */}
      <div className="mb-3.5 flex justify-center sm:justify-start">
        <div className="bg-emerald-950/10 p-1.5 rounded-2xl border border-emerald-800/20 backdrop-blur-md inline-flex shadow-xs">
          <AnimatedBackground
            defaultValue="field"
            onValueChange={(id) => id && setSelectedId(id)}
            className="bg-emerald-700 text-white rounded-xl shadow-md"
            transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
          >
            {IMAGE_MODES.map((mode) => (
              <button
                key={mode.id}
                data-id={mode.id}
                type="button"
                className={`px-3.5 py-1.5 text-xs font-bold transition-colors rounded-xl cursor-pointer ${
                  selectedId === mode.id ? 'text-white' : 'text-emerald-900 hover:text-emerald-950'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </AnimatedBackground>
        </div>
      </div>

      {/* Main Hero Image Frame */}
      <div className="hero-img-wrap relative overflow-hidden rounded-3xl border-2 border-emerald-800/20 shadow-2xl group transition-all">
        <img
          src={activeMode.src}
          alt={activeMode.label}
          className="hero-img w-full h-[320px] sm:h-[400px] object-cover transition-all duration-500 group-hover:scale-105"
        />

        {/* Floating Mode Badge */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[11px] font-extrabold tracking-wider px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          {activeMode.badge}
        </div>

        {/* Status Overlay Pill */}
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md text-emerald-950 text-xs font-bold px-3.5 py-2 rounded-2xl border border-emerald-200 shadow-xl flex items-center gap-2">
          <span className="text-emerald-600 font-extrabold">✓</span>
          {activeMode.status}
        </div>
      </div>
    </div>
  );
}
