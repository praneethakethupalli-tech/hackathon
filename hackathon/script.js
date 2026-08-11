/* =========================================================
   CropGuide — Frontend Prototype Script
   Handles: nav, reveals, smooth scroll, upload flow, loading,
   result transitions
   ========================================================= */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Year in footer ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  });

  /* ---------- Navbar scroll + mobile toggle + smooth scroll ---------- */
  function initNavbar() {
    var navbar = document.getElementById('navbar');
    var toggle = document.getElementById('navToggle');
    var menu = document.getElementById('navMenu');

    if (!navbar) return;

    // Scroll state
    function onScroll() {
      if (window.scrollY > 8) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Mobile toggle
    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      // Close on link click
      menu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          menu.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });

      // Close on outside click
      document.addEventListener('click', function (e) {
        if (!menu.classList.contains('open')) return;
        if (menu.contains(e.target) || toggle.contains(e.target)) return;
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    }

    // Smooth scroll for in-page anchors (enhanced version
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href');
        if (!href || href === '#') return;
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - 64;
        window.scrollTo({ top: top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveals() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (prefersReducedMotion) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Human-friendly format ---------- */
  function formatBytes(bytes) {
    if (!bytes || +bytes <= 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.min(3, Math.floor(Math.log(bytes) / Math.log(k)));
    var digits = i === 0 ? 0 : 1;
    return (bytes / Math.pow(k, i)).toFixed(digits) + ' ' + sizes[i];
  }

  /* ---------- Safe helpers to populate result UI from AI response ---------- */
  function severityClassAndText(severity, needsExpert, confidence) {
    var map = {
      Mild:    { cls: 'sev-mild',  clsName: '', text: 'Mild · Early stage' },
      Moderate:{ cls: 'sev-mod',   clsName: '', text: 'Moderate · Monitor closely' },
      Severe:  { cls: 'sev-severe', clsName:'', text: 'Severe · Action required' },
      Unknown: { cls: 'sev-unknown', clsName:'', text: 'Unknown · Image unclear' }
    };
    var s = map[severity] || map.Unknown;
    if (confidence !== null && confidence !== undefined && confidence < 50) {
      s.text += ' · Low confidence in image';
    }
    if (needsExpert) {
      s.text += ' · Expert confirmation recommended';
    }
    return s;
  }

  function renderSeverityDot(severity) {
    if (severity === 'Mild') return { cls: 'sev-mild', color: '#388E3C' };
    if (severity === 'Moderate') return { cls: 'sev-mod', color: '#C98A3A' };
    if (severity === 'Severe') return { cls: 'sev-severe', color: '#B23A3A' };
    return { cls: 'sev-unknown', color: '#6F8276' };
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildActionsHtml(items) {
    var html = '';
    var list = Array.isArray(items) ? items.filter(function (i) { return !!i; }) : [];
    if (list.length === 0) {
      return '<li><span class="action-num">1</span><p>Speak to a local certified agronomist for next steps.</p></li>';
    }
    for (var i = 0; i < list.length; i++) {
      var n = i + 1;
      html += '<li><span class="action-num">' + n + '</span><p>' + escapeHtml(list[i]) + '</p></li>';
    }
    return html;
  }

  function buildSymptomsHtml(items) {
    var html = '';
    var list = Array.isArray(items) ? items.filter(function (i) { return !!i; }) : [];
    if (list.length === 0) {
      return '<li>No distinct visible symptoms were confidently identified in this image — try again with better lighting or closer focus.</li>';
    }
    for (var i = 0; i < list.length; i++) {
      html += '<li>' + escapeHtml(list[i]) + '</li>';
    }
    return html;
  }

  function setSeverityVisual(severity, confidence, needsExpert) {
    var wrap = document.getElementById('diagSeverity');
    var dotEl = wrap ? wrap.querySelector('.sev-dot') : null;
    var txtEl = document.getElementById('diagSeverityText');
    var noteEl = document.getElementById('diagNote');
    var sevInfo = renderSeverityDot(severity);
    if (dotEl) {
      dotEl.className = 'sev-dot ' + sevInfo.cls;
    }
    if (txtEl) txtEl.textContent = (severity === 'Mild' ? 'Mild · Early signs' :
      severity === 'Moderate' ? 'Moderate · Monitor closely' :
      severity === 'Severe' ? 'Severe · Prompt action' : 'Unknown · Image unclear');
    if (txtEl && confidence < 50 && severity !== 'Unknown') {
      txtEl.textContent += ' — Low confidence';
    }
    if (noteEl) {
      if (needsExpert) {
        noteEl.textContent = 'A human agronomist review is recommended before taking significant action based on this image.';
      } else if (severity === 'Mild') {
        noteEl.textContent = 'Signs suggest limited to small areas — early intervention helps avoid spread.';
      } else if (severity === 'Moderate') {
        noteEl.textContent = 'Signs suggest progression is ongoing — timely action helps limit impact.';
      } else if (severity === 'Severe') {
        noteEl.textContent = 'Signs suggest significant impact — act quickly to reduce further crop stress.';
      } else {
        noteEl.textContent = 'Image quality or content limits a firm assessment. Reshoot if possible.';
      }
    }
  }

  function populateResult(data) {
    // Diagnosis card
    var diagnosis = data.diagnosis || 'Unable to identify the crop condition';
    var confidence = typeof data.confidence === 'number' ? Math.max(0, Math.min(100, data.confidence)) : 0;

    document.getElementById('diagDiagnosis').textContent = diagnosis;
    document.getElementById('diagConfidence').textContent = String(confidence) + '% Confidence';
    var barFill = document.getElementById('diagBarFill');
    if (barFill) {
      barFill.style.width = String(confidence) + '%';
    }
    var bar = document.getElementById('diagBar');
    if (bar) {
      bar.setAttribute('aria-label', String(confidence) + ' percent confidence');
    }

    // Severity
    var severity = (['Mild','Moderate','Severe','Unknown'].indexOf(data.severity) >= 0) ? data.severity : 'Unknown';
    setSeverityVisual(severity, confidence, !!data.needsExpertConfirmation);

    // Badge: if low confidence or non-crop message
    var badge = document.getElementById('diagBadge');
    if (badge) {
      if (confidence < 50) badge.textContent = 'Low confidence — review carefully';
      else if (data.needsExpertConfirmation) badge.textContent = 'Expert review recommended';
      else badge.textContent = 'AI result';
    }

    // Symptoms
    var symUl = document.getElementById('diagSymptoms');
    if (symUl) symUl.innerHTML = buildSymptomsHtml(data.visibleSymptoms || []);

    // Caution
    var cautionSpan = document.getElementById('diagCautionText');
    if (cautionSpan) {
      var c = data.caution || 'Image-based identification can be uncertain. Confirm with a local certified agronomist before applying chemical treatments or making costly interventions.';
      cautionSpan.textContent = c;
    }

    // Actions
    var actOl = document.getElementById('diagActions');
    if (actOl) actOl.innerHTML = buildActionsHtml(data.recommendedActions || []);

    // Weather (server populates defaults)
    var w = data.weather || {};
    if (w.bestTime) document.getElementById('diagWeatherTime').textContent = w.bestTime;
    if (w.note) document.getElementById('diagWeatherSub').textContent = w.note;
    if (w.rain) document.getElementById('diagWeatherRain').textContent = w.rain;
    if (w.humidity) document.getElementById('diagWeatherHum').textContent = w.humidity;
    if (w.temp) document.getElementById('diagWeatherTemp').textContent = w.temp;

    // Error section in case in case not needed)
    var errEl = document.getElementById('errorState');
    if (errEl) errEl.hidden = true;
  }

  function showError(title, detail, showResultShell) {
    if (showResultShell !== false) {
      // show the RESULT shell so the farmer has context
      var resultState = document.getElementById('resultState');
      if (resultState) resultState.hidden = false;
    }
    var errEl = document.getElementById('errorState');
    if (errEl) {
      document.getElementById('errorTitle').textContent = title || "We couldn't analyze this image.";
      document.getElementById('errorDetail').textContent = detail || 'Please check your connection and try again with a clearer crop image.';
      errEl.hidden = false;
    }
    // scroll error into view
    if (errEl) errEl.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
  }

  /* ---------- Analysis workspace state machine (real API) ---------- */
  function initAnalysis() {
    var uploadState = document.getElementById('uploadState');
    var previewState = document.getElementById('previewState');
    var loadingState = document.getElementById('loadingState');
    var resultState = document.getElementById('resultState');
    if (!uploadState) return; // not on analyze page

    var uploadArea = document.getElementById('uploadArea');
    var fileInput = document.getElementById('fileInput');
    var previewImg = document.getElementById('previewImg');
    var previewFilename = document.getElementById('previewFilename');
    var previewSize = document.getElementById('previewSize');
    var resultImg = document.getElementById('resultImg');
    var analyzeBtn = document.getElementById('analyzeBtn');
    var changeBtn = document.getElementById('changeBtn');
    var startOverBtn = document.getElementById('startOverBtn');
    var newAnalyzeBtn = document.getElementById('newAnalyzeBtn');
    var ringProgress = document.getElementById('ringProgress');

    var currentFile = null;
    var currentObjectUrl = null;
    var requestInFlight = false;
    var loadingAbortController = null;

    var currentRequestId = 0;

    function show(stateName) {
      uploadState.hidden = stateName !== 'upload';
      previewState.hidden = stateName !== 'preview';
      loadingState.hidden = stateName !== 'loading';
      resultState.hidden = stateName !== 'result';
      if (stateName !== 'result') {
        var err = document.getElementById('errorState');
        if (err) err.hidden = true;
      }
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }

    function resetFile() {
      currentFile = null;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = null;
      }
      if (fileInput) fileInput.value = '';
    }

    function cancelFlight() {
      if (requestInFlight && loadingAbortController) {
        try { loadingAbortController.abort(); } catch (e) {}
      }
      requestInFlight = false;
      loadingAbortController = null;
      if (analyzeBtn) {
        analyzeBtn.disabled = false;
        analyzeBtn.removeAttribute('aria-disabled');
      }
    }

    function acceptFile(file) {
      if (!file) return;
      var validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      var validExt = /\.(png|jpe?g)$/i;
      var maxBytes = 10 * 1024 * 1024;

      var typeOk = validTypes.indexOf(file.type) !== -1 || validExt.test(file.name || '');
      if (!typeOk) {
        alert('Unsupported file type. Please choose a PNG or JPG image.');
        return;
      }
      if (!file.size || file.size > maxBytes) {
        alert('File is too large. Maximum size is 10 MB.');
        return;
      }
      currentFile = file;
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = URL.createObjectURL(file);
      previewImg.src = currentObjectUrl;
      resultImg.src = currentObjectUrl;
      previewFilename.textContent = file.name;
      previewSize.textContent = formatBytes(file.size);
      show('preview');
    }

    // File picker via input
    if (fileInput) {
      fileInput.addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        acceptFile(f);
      });
    }

    // Keyboard activation of upload area
    if (uploadArea) {
      uploadArea.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (fileInput) fileInput.click();
        }
      });

      // Drag & drop
      ['dragenter', 'dragover'].forEach(function (ev) {
        uploadArea.addEventListener(ev, function (e) {
          e.preventDefault(); e.stopPropagation();
          uploadArea.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        uploadArea.addEventListener(ev, function (e) {
          e.preventDefault(); e.stopPropagation();
          uploadArea.classList.remove('dragover');
        });
      });
      uploadArea.addEventListener('drop', function (e) {
        var dt = e.dataTransfer;
        if (dt && dt.files && dt.files[0]) acceptFile(dt.files[0]);
      });
    }

    // Change image button (from preview -> back to upload)
    if (changeBtn) {
      changeBtn.addEventListener('click', function () {
        cancelFlight();
        resetFile();
        show('upload');
      });
    }

    // Start over / new analyze
    function startOver() {
      cancelFlight();
      resetFile();
      show('upload');
    }
    if (startOverBtn) startOverBtn.addEventListener('click', startOver);
    if (newAnalyzeBtn) newAnalyzeBtn.addEventListener('click', startOver);

    // Run the loading UI animation while waiting for real API
    function startLoadingUI(requestId) {
      var steps = document.querySelectorAll('.loading-state .step');
      if (!steps.length) return;
      var startedAt = Date.now();
      var markedDone = {};
      function tick() {
        if (requestId !== currentRequestId || !loadingState || loadingState.hidden) return;
        var elapsed = Date.now() - startedAt;
        var total = 22000; // server is in flight; keep the UI steps progress as gentle markers
        var idx = Math.min(steps.length - 1, Math.floor((elapsed / total) * steps.length));
        for (var i = 0; i < idx; i++) {
          if (!markedDone[i]) {
            steps[i].classList.remove('step-active');
            steps[i].classList.add('step-done');
            markedDone[i] = true;
          }
        }
        steps.forEach(function (x) { x.classList.remove('step-active'); });
        if (!markedDone[idx]) {
          steps[idx].classList.add('step-active');
        }
        setTimeout(tick, 120);
      }
      tick();
    }

    function stopLoadingUI() {
      var steps = document.querySelectorAll('.loading-state .step');
      steps.forEach(function (s) {
        s.classList.remove('step-active');
        s.classList.add('step-done');
      });
    }

    // Real analysis call to /api/analyze-crop
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', function () {
        if (!currentFile || requestInFlight) return;
        // Build FormData
        requestInFlight = true;
        currentRequestId += 1;
        var thisRequestId = currentRequestId;
        loadingAbortController = ('AbortController' in window) ? new AbortController() : null;
        analyzeBtn.disabled = true;
        analyzeBtn.setAttribute('aria-disabled', 'true');

        show('loading');
        startLoadingUI(thisRequestId);

        // Ring progress: animate continuously (since we don't know real server progress %)
        if (ringProgress) {
          (function spinRing() {
            if (thisRequestId !== currentRequestId || loadingState.hidden) return;
            var dur = 1400;
            var startT = performance.now();
            function tickRing(now) {
              if (thisRequestId !== currentRequestId || loadingState.hidden) return;
              var pct = ((now - startT) % dur) / dur;
              ringProgress.style.transform = 'rotate(' + (pct * 360) + 'deg)';
              requestAnimationFrame(tickRing);
            }
            requestAnimationFrame(tickRing);
          })();
        }

        var fd = new FormData();
        fd.append('image', currentFile, currentFile.name || 'crop.jpg');

        var endpoint = '/api/analyze-crop';
        var opts = {
          method: 'POST',
          body: fd
        };
        if (loadingAbortController) opts.signal = loadingAbortController.signal;

        var failed = false;
        fetch(endpoint, opts).then(function (resp) {
          if (thisRequestId !== currentRequestId) return; // stale
          return resp.text().then(function (txt) {
            var data = null;
            try { data = JSON.parse(txt); } catch (e) { data = null; }
            stopLoadingUI();
            if (!resp.ok || !data) {
              var title = "We couldn't analyze this image.";
              var detail = 'Please check your connection and try again with a clearer crop image.';
              if (data && data.error) title = data.error;
              if (data && data.detail) detail = data.detail;
              if (resp.status === 413) { title = 'File is too large'; detail = 'Maximum image size is 10 MB. Please upload a smaller photo.'; }
              if (resp.status === 415) { title = 'Unsupported file type'; detail = 'Only PNG and JPG images are supported for crop analysis.'; }
              if (resp.status === 400) { title = data && data.error ? data.error : 'Could not read the image'; detail = data && data.detail ? data.detail : 'Please choose a PNG or JPG under 10 MB and try again.'; }
              if (resp.status === 503) { title = data && data.error ? data.error : 'AI service unavailable'; detail = data && data.detail ? data.detail : 'Ask the server administrator to configure the AI key.'; }
              showError(title, detail, true);
              requestInFlight = false;
              analyzeBtn.disabled = false;
              analyzeBtn.removeAttribute('aria-disabled');
              show('result');
              return;
            }
            // Happy path: render real AI response
            populateResult(data);
            requestInFlight = false;
            analyzeBtn.disabled = false;
            analyzeBtn.removeAttribute('aria-disabled');
            show('result');
          });
        }).catch(function (err) {
          if (thisRequestId !== currentRequestId) return;
          stopLoadingUI();
          var aborted = err && (err.name === 'AbortError');
          if (aborted) {
            // silently user-canceled; don't show error
            requestInFlight = false;
            analyzeBtn.disabled = false;
            return;
          }
          showError(
            "We couldn't analyze this image.",
            'Please check your connection and try again with a clearer crop image.',
            true
          );
          show('result');
          requestInFlight = false;
          analyzeBtn.disabled = false;
          analyzeBtn.removeAttribute('aria-disabled');
        });
      });
    }
  }

  /* ---------- Boot ---------- */
  function boot() {
    initNavbar();
    initReveals();
    initAnalysis();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
