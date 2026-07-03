(function() {
  // Prevent duplicate instantiation
  if (window.__FreeUnAppFeedbackInitialized) return;
  window.__FreeUnAppFeedbackInitialized = true;

  // 1. Detect backend origin URL automatically from the script src
  let apiOrigin = 'http://localhost:3000';
  if (document.currentScript) {
    try {
      const url = new URL(document.currentScript.src);
      apiOrigin = url.origin;
    } catch (e) {
      console.warn('[Feedback Widget] Failed to parse script origin, defaulting to local host:', e);
    }
  }

  // 2. Intercept and cache console errors
  const cachedLogs = [];
  const maxLogs = 5;
  const originalConsoleError = console.error;
  console.error = function(...args) {
    cachedLogs.push('[Error] ' + args.join(' '));
    if (cachedLogs.length > maxLogs) cachedLogs.shift();
    originalConsoleError.apply(console, args);
  };
  window.addEventListener('error', function(event) {
    cachedLogs.push(`[Exception] ${event.message} at ${event.filename}:${event.lineno}`);
    if (cachedLogs.length > maxLogs) cachedLogs.shift();
  });

  // 3. Inject CSS styling
  const style = document.createElement('style');
  style.textContent = `
    .fu-w { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; box-sizing: border-box; }
    .fu-w *, .fu-w *::before, .fu-w *::after { box-sizing: inherit; }
    
    /* Side Tab */
    .fu-tab {
      position: fixed;
      right: 0;
      top: calc(50% - 20px);
      background: #18181B;
      color: #FAFAFA;
      padding: 10px 14px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      z-index: 999998;
      border: 1px solid #27272A;
      border-right: none;
      border-radius: 4px 0 0 4px;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: background 0.15s;
    }
    .fu-tab:hover { background: #27272A; }
    
    /* Drawer Card */
    .fu-card {
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 320px;
      background: #FFFFFF;
      border: 1px solid #E4E4E7;
      border-radius: 3px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      z-index: 999999;
      display: none;
      flex-direction: column;
      overflow: hidden;
      color: #18181B;
    }
    .fu-card-hd {
      padding: 14px 16px;
      border-bottom: 1px solid #E4E4E7;
      font-weight: 700;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      background: #FAFAFA;
    }
    .fu-card-close { cursor: pointer; color: #A1A1AA; font-size: 1.2rem; line-height: 1; }
    .fu-card-close:hover { color: #18181B; }
    
    .fu-card-bd { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
    
    /* Emojis */
    .fu-emojis { display: flex; justify-content: space-around; gap: 10px; }
    .fu-emoji-btn {
      flex: 1;
      padding: 8px;
      border: 1px solid #E4E4E7;
      border-radius: 3px;
      font-size: 1.4rem;
      cursor: pointer;
      background: #FAFAFA;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .fu-emoji-btn:hover { background: #F4F4F5; border-color: #A1A1AA; }
    .fu-emoji-btn.active { background: #EEF2FF; border-color: #6366F1; box-shadow: 0 0 0 2px rgba(99,102,241,0.15); }
    
    /* Intents */
    .fu-intents { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .fu-intent-btn {
      padding: 6px 8px;
      border: 1px solid #E4E4E7;
      border-radius: 3px;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      background: #FAFAFA;
      color: #52525B;
      text-align: center;
      transition: all 0.12s;
    }
    .fu-intent-btn:hover { background: #F4F4F5; color: #18181B; }
    .fu-intent-btn.active { background: #18181B; color: #FFFFFF; border-color: #18181B; }
    
    /* Text input */
    .fu-field { display: flex; flex-direction: column; gap: 4px; }
    .fu-field label { font-size: 0.65rem; font-weight: 600; color: #52525B; text-transform: uppercase; }
    .fu-textarea {
      width: 100%;
      height: 70px;
      padding: 8px;
      border: 1px solid #E4E4E7;
      border-radius: 3px;
      font-size: 0.78rem;
      resize: none;
      outline: none;
      transition: border 0.15s;
      background: #FFFFFF;
      color: #18181B;
    }
    .fu-textarea:focus { border-color: #A1A1AA; }
    
    /* Checkbox */
    .fu-check-row { display: flex; align-items: center; gap: 8px; font-size: 0.74rem; color: #52525B; cursor: pointer; }
    .fu-check-row input { cursor: pointer; accent-color: #6366F1; }
    
    /* Actions */
    .fu-actions { display: flex; gap: 6px; justify-content: flex-end; padding-top: 8px; border-top: 1px solid #E4E4E7; }
    .fu-btn {
      padding: 6px 12px;
      font-weight: 600;
      font-size: 0.74rem;
      border-radius: 3px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.12s;
    }
    .fu-btn-c { color: #52525B; background: none; border: none; }
    .fu-btn-c:hover { background: #F4F4F5; color: #18181B; }
    .fu-btn-p { background: #6366F1; color: #FFFFFF; border: 1px solid #6366F1; }
    .fu-btn-p:hover { background: #4338CA; border-color: #4338CA; }
    .fu-btn-p:disabled { background: #A1A1AA; border-color: #A1A1AA; cursor: not-allowed; }
    
    /* Toast */
    .fu-toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #18181B;
      color: #FAFAFA;
      padding: 8px 14px;
      border-radius: 3px;
      font-size: 0.72rem;
      font-weight: 600;
      border: 1px solid #27272A;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000000;
      display: none;
      align-items: center;
      gap: 6px;
    }
    .fu-toast-dot { width: 6px; height: 6px; border-radius: 50%; background: #22C55E; }
  `;
  document.head.appendChild(style);

  // 4. Create HTML elements
  const container = document.createElement('div');
  container.className = 'fu-w';
  container.innerHTML = `
    <!-- Tab -->
    <div class="fu-tab" id="fu-feedback-tab">
      <span>💬</span><span>Feedback</span>
    </div>
    
    <!-- Card -->
    <div class="fu-card" id="fu-feedback-card">
      <div class="fu-card-hd">
        <span>Share Feedback</span>
        <span class="fu-card-close" id="fu-feedback-close">&times;</span>
      </div>
      <div class="fu-card-bd">
        <div class="fu-emojis">
          <button class="fu-emoji-btn" data-val="😠" title="Bug/Friction">😠</button>
          <button class="fu-emoji-btn" data-val="😐" title="Neutral/Okay">😐</button>
          <button class="fu-emoji-btn active" data-val="😊" title="Nice/Great">😊</button>
        </div>
        
        <div class="fu-intents">
          <button class="fu-intent-btn active" data-val="suggestion">💡 Suggestion</button>
          <button class="fu-intent-btn" data-val="bug">🐛 Bug Report</button>
          <button class="fu-intent-btn" data-val="question">❓ Question</button>
          <button class="fu-intent-btn" data-val="compliment">💖 Compliment</button>
        </div>
        
        <div class="fu-field">
          <label>What's on your mind?</label>
          <textarea class="fu-textarea" id="fu-comment" placeholder="Tell us how we can make this better..."></textarea>
        </div>
        
        <label class="fu-check-row">
          <input type="checkbox" id="fu-screenshot-check" checked>
          <span>Include page screenshot</span>
        </label>
        
        <div class="fu-actions">
          <button class="fu-btn fu-btn-c" id="fu-btn-cancel">Cancel</button>
          <button class="fu-btn fu-btn-p" id="fu-btn-submit">Submit</button>
        </div>
      </div>
    </div>
    
    <!-- Success Toast -->
    <div class="fu-toast" id="fu-feedback-toast">
      <span class="fu-toast-dot"></span>
      <span>Thank you! Your feedback has been sent.</span>
    </div>
  `;
  document.body.appendChild(container);

  // 5. State & Elements binding
  const tab = document.getElementById('fu-feedback-tab');
  const card = document.getElementById('fu-feedback-card');
  const closeBtn = document.getElementById('fu-feedback-close');
  const cancelBtn = document.getElementById('fu-btn-cancel');
  const submitBtn = document.getElementById('fu-btn-submit');
  const toast = document.getElementById('fu-feedback-toast');
  const textarea = document.getElementById('fu-comment');
  const screenshotCheck = document.getElementById('fu-screenshot-check');

  let selectedEmoji = '😊';
  let selectedCategory = 'suggestion';

  // Emoji selection
  const emojiButtons = container.querySelectorAll('.fu-emoji-btn');
  emojiButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      emojiButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedEmoji = btn.dataset.val;
      // Auto-toggle category default based on selection
      if (selectedEmoji === '😠') {
        setCategoryActive('bug');
      } else if (selectedEmoji === '😊') {
        setCategoryActive('compliment');
      }
    });
  });

  // Category selection
  const categoryButtons = container.querySelectorAll('.fu-intent-btn');
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setCategoryActive(btn.dataset.val);
    });
  });

  function setCategoryActive(cat) {
    categoryButtons.forEach(b => b.classList.remove('active'));
    const target = container.querySelector(`.fu-intent-btn[data-val="${cat}"]`);
    if (target) {
      target.classList.add('active');
      selectedCategory = cat;
    }
  }

  // Draggable Tab logic (vertical dragging on right screen edge)
  let isTabDragging = false;
  let tabMoved = false;
  let tabStartY, tabStartTop;

  tab.style.cursor = 'ns-resize';
  tab.addEventListener('mousedown', (e) => {
    isTabDragging = true;
    tabMoved = false;
    tabStartY = e.clientY;
    const rect = tab.getBoundingClientRect();
    tabStartTop = rect.top;
    
    tab.style.top = tabStartTop + 'px';
    
    document.addEventListener('mousemove', tabDragMove);
    document.addEventListener('mouseup', tabDragEnd);
    e.preventDefault();
  });

  function tabDragMove(e) {
    if (!isTabDragging) return;
    const dy = e.clientY - tabStartY;
    if (Math.abs(dy) > 4) {
      tabMoved = true;
    }
    let newTop = tabStartTop + dy;
    const rect = tab.getBoundingClientRect();
    const maxY = window.innerHeight - rect.height;
    if (newTop < 0) newTop = 0;
    if (newTop > maxY) newTop = maxY;
    tab.style.top = newTop + 'px';
  }

  function tabDragEnd() {
    isTabDragging = false;
    document.removeEventListener('mousemove', tabDragMove);
    document.removeEventListener('mouseup', tabDragEnd);
    
    // Only open the card drawer if the user didn't drag the tab
    if (!tabMoved) {
      card.style.display = card.style.display === 'flex' ? 'none' : 'flex';
    }
  }
  closeBtn.addEventListener('click', closeDrawer);
  cancelBtn.addEventListener('click', closeDrawer);

  function closeDrawer() {
    card.style.display = 'none';
    textarea.value = '';
  }

  function showSuccess() {
    toast.style.display = 'flex';
    setTimeout(() => { toast.style.display = 'none'; }, 4000);
  }

  // Dynamic html2canvas Loader
  function captureScreen(callback) {
    if (!screenshotCheck.checked) {
      callback(null);
      return;
    }

    if (window.html2canvas) {
      runCapture();
    } else {
      const script = document.createElement('script');
      script.src = `${apiOrigin}/html2canvas.min.js`;
      script.onload = runCapture;
      script.onerror = () => {
        console.warn('[Feedback Widget] html2canvas failed to load from local server. Skipping screenshot.');
        callback(null);
      };
      document.head.appendChild(script);
    }

    function runCapture() {
      // Temporarily hide the widget elements so they don't block the screen capture
      tab.style.display = 'none';
      card.style.display = 'none';

      // Temporarily disable stylesheets containing "oklch" to prevent html2canvas parsing errors
      const disabledSheets = [];
      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        try {
          let hasOklch = false;
          const rules = sheet.cssRules || sheet.rules;
          if (rules) {
            for (let j = 0; j < rules.length; j++) {
              if (rules[j].cssText.includes('oklch')) {
                hasOklch = true;
                break;
              }
            }
          }
          if (hasOklch) {
            sheet.disabled = true;
            disabledSheets.push(sheet);
          }
        } catch (e) {
          // Cross-origin stylesheet, ignore
        }
      }

      window.html2canvas(document.body, {
        logging: false,
        useCORS: true,
        allowTaint: true,
        scale: 1
      }).then(canvas => {
        // Restore elements
        tab.style.display = 'flex';
        card.style.display = 'flex';
        
        // Restore stylesheets
        disabledSheets.forEach(sheet => { sheet.disabled = false; });

        canvas.toBlob(blob => {
          callback(blob);
        }, 'image/png');
      }).catch(err => {
        console.error('[Feedback Widget] Capture failed:', err);
        tab.style.display = 'flex';
        card.style.display = 'flex';
        
        // Restore stylesheets
        disabledSheets.forEach(sheet => { sheet.disabled = false; });

        callback(null);
      });
    }
  }

  // Submission logic
  submitBtn.addEventListener('click', async () => {
    const text = textarea.value.trim();
    if (!text) {
      textarea.style.borderColor = '#EF4444';
      setTimeout(() => { textarea.style.borderColor = '#E4E4E7'; }, 1500);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';

    captureScreen(async (screenshotBlob) => {
      let uploadPaths = [];

      // A. Upload screenshot if captured
      if (screenshotBlob) {
        try {
          const fd = new FormData();
          fd.append('files', screenshotBlob, `user-feedback-${Date.now()}.png`);
          
          submitBtn.textContent = 'Sending details...';
          const uploadRes = await fetch(`${apiOrigin}/api/upload`, {
            method: 'POST',
            body: fd
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            uploadPaths = data.paths || [];
          }
        } catch (e) {
          console.warn('[Feedback Widget] Screenshot upload failed, sending report without image:', e);
        }
      }

      // B. Post feedback issue parameters
      const mappedSeverity = selectedEmoji === '😠' ? 'severe' : selectedEmoji === '😐' ? 'medium' : 'pass';
      
      const payload = {
        title: `[User Feedback] ${selectedCategory.toUpperCase()} - Rating: ${selectedEmoji}`,
        category: 'other',
        customCategory: 'User Feedback',
        severity: mappedSeverity,
        status: 'open',
        assignee: '',
        dueDate: '',
        problems: [
          `User Feedback comment:\n${text}`,
          `Page URL: ${window.location.href}`,
          `Browser Specification: ${navigator.userAgent}`,
          `Viewport Dimensions: ${window.innerWidth}x${window.innerHeight} @ ${window.devicePixelRatio}dpr`
        ],
        recommendation: [
          'Review user-submitted page screenshot and check console stack logs.'
        ],
        screenshots: uploadPaths,
        source: 'user'
      };

      // Add intercepted console logs to the problems list if any exist
      if (cachedLogs.length > 0) {
        payload.problems.push(`Harvester intercepted Console Errors:\n` + cachedLogs.join('\n'));
      }

      try {
        const res = await fetch(`${apiOrigin}/api/issues`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showSuccess();
          closeDrawer();
          // Write to localstorage to avoid repeated pops if configured later
          try { localStorage.setItem('freeunapp_feedback_nudge_dismissed', 'true'); } catch (err) {}
        } else {
          alert('Failed to send feedback. Please try again.');
        }
      } catch (err) {
        console.error('[Feedback Widget] Submit failed:', err);
        alert('Network error. Failed to reach the feedback server.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
      }
    });
  });
})();

