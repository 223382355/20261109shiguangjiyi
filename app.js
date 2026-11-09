(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = {
    photo: null,
    exif: {},
    story: "",
    style: "文艺",
    recipe: null,
    pageUrl: "",
    randomQueue: [],
    randomBusy: false,
    copyRound: 0,
    copyBusy: false
  };

  // ---------------- 通用 UI ----------------
  let toastTimer = null;
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function setStep(step) {
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    if (step === "result") {
      $("panel-result").classList.add("active");
    } else {
      $(`panel-${step}`).classList.add("active");
    }
    document.querySelectorAll(".step-dot").forEach((dot) => {
      const n = Number(dot.dataset.step);
      dot.classList.toggle("active", step === "result" ? true : n <= step);
    });
  }

  const loadingTexts = [
    "正在看看这张照片…",
    "正在想想今天的故事…",
    "正在挑一句温柔的话…",
    "正在把照片放进画框…",
    "正在写下祝福…",
    "快好了，再等一下下…"
  ];
  let loadingTimer = null;

  function showLoading(on) {
    $("loading").classList.toggle("hidden", !on);
  }
  function startLoading() {
    let i = 0;
    $("loading-text").textContent = loadingTexts[0];
    clearInterval(loadingTimer);
    loadingTimer = setInterval(() => {
      i = (i + 1) % loadingTexts.length;
      $("loading-text").textContent = loadingTexts[i];
    }, 2300);
  }
  function stopLoading() { clearInterval(loadingTimer); }

  // ---------------- 拍照 / 相册 ----------------
  async function handleFile(file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
      toast("请选择一张照片");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast("照片太大了，请换一张");
      return;
    }
    try {
      const buf = await file.arrayBuffer();
      state.exif = SnapStory.parseExif(buf);
      const raw = await SnapStory.fileToDataUrl(file);
      const compressed = await SnapStory.compressDataUrl(raw, 1400, 0.86);
      state.photo = compressed;
      $("shot-preview").src = compressed;
      setStep(2);
    } catch (e) {
      console.error(e);
      toast("这张照片打不开，换一张试试");
    }
  }

  $("camera-input").addEventListener("change", (e) => handleFile(e.target.files[0]));
  $("album-input").addEventListener("change", (e) => handleFile(e.target.files[0]));
  $("album-btn").addEventListener("click", () => $("album-input").click());

  // ---------------- 语音转文字 ----------------
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let voiceState = "idle"; // idle | starting | listening
  let voiceMode = "browser"; // browser | cloud
  let voiceSupported = !!SpeechRecognition;
  let voiceTimer = null;
  let voiceBase = "";
  let voiceFinal = "";
  let voiceStoppedByUser = false;
  let voiceError = "";

  function setVoiceUI(state) {
    voiceState = state;
    const btn = $("voice-btn");
    btn.classList.toggle("recording", state === "listening");
    btn.classList.toggle("starting", state === "starting");
    if (state === "starting") {
      $("voice-label").textContent = voiceMode === "cloud" ? "正在打开麦克风…" : "正在启动… 再点一下取消";
    } else if (state === "listening") {
      $("voice-label").textContent = voiceMode === "cloud" ? "正在录音… 点一下结束" : "正在听… 点一下结束";
    } else {
      $("voice-label").textContent = voiceSupported ? "点一下，说话" : "用键盘话筒";
    }
  }

  function setVoiceFallbackUI(on) {
    const tip = $("voice-tip");
    const keyboardBtn = $("voice-keyboard");
    if (tip) tip.classList.toggle("error", on);
    if (keyboardBtn) keyboardBtn.classList.toggle("attention", on);
  }

  function focusKeyboardVoice() {
    const input = $("story-input");
    input.focus();
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    setVoiceFallbackUI(false);
    $("voice-tip").textContent = "请点手机键盘上的话筒图标说话，说完文字会出现在输入框里";
  }

  function showVoiceFallback(message) {
    $("voice-tip").textContent = message;
    setVoiceFallbackUI(true);
  }

  function clearVoiceTimer() {
    if (voiceTimer) {
      clearTimeout(voiceTimer);
      voiceTimer = null;
    }
  }

  function stopRecognition(tip) {
    clearVoiceTimer();
    voiceStoppedByUser = true;
    if (recognition && voiceState !== "idle") {
      try { recognition.stop(); } catch (e) { /* 忽略 */ }
      setTimeout(() => {
        if (voiceState !== "idle") {
          try { recognition.abort(); } catch (e) { /* 忽略 */ }
          setVoiceUI("idle");
        }
      }, 800);
    }
    setVoiceUI("idle");
    if (tip) $("voice-tip").textContent = tip;
  }

  function stopVoiceIfListening() {
    if (voiceState === "idle") return;
    if (voiceMode === "cloud") stopCloudRecording(true);
    else stopRecognition();
  }

  function initBrowserVoice() {
    voiceMode = "browser";
    const btn = $("voice-btn");
    const keyboardBtn = $("voice-keyboard");

    if (!voiceSupported) {
      btn.classList.add("keyboard-mode");
      $("voice-label").textContent = "用键盘话筒";
      $("voice-tip").textContent = "这个浏览器不支持网页语音，点按钮打开输入框，再点键盘上的话筒";
      btn.addEventListener("click", focusKeyboardVoice);
      if (keyboardBtn) keyboardBtn.classList.add("hidden");
      return;
    }

    try {
      recognition = new SpeechRecognition();
    } catch (e) {
      voiceSupported = false;
      btn.classList.add("keyboard-mode");
      $("voice-label").textContent = "用键盘话筒";
      $("voice-tip").textContent = "语音启动失败，请点按钮打开输入框，再用键盘上的话筒";
      btn.addEventListener("click", focusKeyboardVoice);
      if (keyboardBtn) keyboardBtn.classList.add("hidden");
      return;
    }

    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (voiceState === "idle") {
        // 用户已经取消，但浏览器这时才真正启动
        try { recognition.abort(); } catch (e) { /* 忽略 */ }
        return;
      }
      clearVoiceTimer();
      voiceStoppedByUser = false;
      voiceError = "";
      setVoiceUI("listening");
      setVoiceFallbackUI(false);
      $("voice-tip").textContent = "请马上说话，说完点一下结束";
      voiceTimer = setTimeout(() => {
        if (voiceState === "listening") {
          stopRecognition(voiceFinal ? "先转成文字，不够再点一次" : "没有识别到文字，请点「用键盘话筒」");
          if (!voiceFinal) {
            setVoiceFallbackUI(true);
          }
        }
      }, 30000);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) voiceFinal += text;
        else interim += text;
      }
      $("story-input").value = (voiceBase + voiceFinal + interim).slice(0, 200);
      if (voiceFinal) {
        setVoiceFallbackUI(false);
        $("voice-tip").textContent = "已转成文字，可以修改";
      }
    };

    recognition.onerror = (event) => {
      clearVoiceTimer();
      const code = event.error || "";
      voiceError = code;
      console.warn("语音识别失败：", code);
      setVoiceUI("idle");
      if (code === "aborted") {
        // 用户主动取消，不覆盖现有提示
        return;
      }
      if (code === "not-allowed" || code === "service-not-allowed") {
        showVoiceFallback("没有麦克风权限。请在浏览器设置里允许，或点「用键盘话筒」");
      } else if (code === "no-speech") {
        showVoiceFallback("没有听到声音，再点一次，或点「用键盘话筒」");
      } else if (code === "network") {
        showVoiceFallback("语音服务连不上，请点「用键盘话筒」，用手机键盘上的话筒说话");
      } else if (code === "audio-capture") {
        showVoiceFallback("没找到麦克风，请点「用键盘话筒」");
      } else {
        showVoiceFallback("语音识别没成功，请点「用键盘话筒」");
      }
    };

    recognition.onend = () => {
      clearVoiceTimer();
      const hadText = !!voiceFinal;
      setVoiceUI("idle");
      if (voiceError) {
        voiceError = "";
        return;
      }
      if (voiceStoppedByUser) {
        voiceStoppedByUser = false;
        return;
      }
      if (hadText) {
        $("voice-tip").textContent = "已转成文字，可以修改";
      } else {
        showVoiceFallback("没有识别到文字。这个浏览器的语音服务可能连不上，请点「用键盘话筒」");
      }
    };

    btn.addEventListener("click", () => {
      if (voiceState !== "idle") {
        const hadText = !!voiceFinal;
        stopRecognition(hadText ? "已停止，可以继续修改文字" : "没有识别到文字，请点「用键盘话筒」");
        if (!hadText) {
          setVoiceFallbackUI(true);
        }
        return;
      }

      voiceBase = $("story-input").value;
      voiceFinal = "";
      voiceStoppedByUser = false;
      voiceError = "";
      setVoiceUI("starting");
      setVoiceFallbackUI(false);
      $("voice-tip").textContent = "正在启动语音… 再点一下取消";

      clearVoiceTimer();
      voiceTimer = setTimeout(() => {
        if (voiceState === "starting") {
          stopRecognition("语音没有启动成功，请点「用键盘话筒」");
          setVoiceFallbackUI(true);
        }
      }, 4500);

      try {
        recognition.start();
      } catch (e) {
        clearVoiceTimer();
        try { recognition.abort(); } catch (e2) { /* 忽略 */ }
        setVoiceUI("idle");
        showVoiceFallback("语音启动失败，请点「用键盘话筒」");
      }
    });

    if (keyboardBtn) {
      keyboardBtn.addEventListener("click", focusKeyboardVoice);
    }
  }

  // ---------------- 录音上传，云端转文字（硅基流动） ----------------
  let mediaRecorder = null;
  let mediaStream = null;
  let audioChunks = [];
  let cloudTimer = null;
  let cloudCancelled = false;
  let voiceTranscribing = false;

  function clearCloudTimer() {
    if (cloudTimer) {
      clearTimeout(cloudTimer);
      cloudTimer = null;
    }
  }

  function stopMediaStream() {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
  }

  function pickAudioMime() {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    for (const type of types) {
      try {
        if (MediaRecorder.isTypeSupported(type)) return type;
      } catch (e) { /* 忽略 */ }
    }
    return "";
  }

  function audioExt(type) {
    if (type.includes("mp4")) return "m4a";
    if (type.includes("ogg")) return "ogg";
    if (type.includes("wav")) return "wav";
    return "webm";
  }

  function micErrorMessage(err) {
    const name = err && err.name;
    if (name === "NotAllowedError" || name === "SecurityError") {
      return "没有麦克风权限。请在浏览器设置里允许，或点「用键盘话筒」";
    }
    if (name === "NotFoundError") {
      return "没找到麦克风，请点「用键盘话筒」";
    }
    return "打不开麦克风，请点「用键盘话筒」";
  }

  function initCloudVoice() {
    voiceMode = "cloud";
    voiceSupported = true;
    const btn = $("voice-btn");
    const keyboardBtn = $("voice-keyboard");

    // 预先授权一次麦克风权限（立即释放），让浏览器记住授权，后面用语音就不再弹权限框
    let preAuthorized = false;
    async function preAuthorizeMic() {
      if (preAuthorized) return;
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
        preAuthorized = true;
      } catch (e) { /* 用户可能拒绝了，正常使用时还会再弹一次 */ }
    }

    function onPressStart(e) {
      if (voiceTranscribing) {
        $("voice-tip").textContent = "正在转文字，请稍等…";
        e.preventDefault();
        return;
      }
      if (voiceState !== "idle") {
        stopCloudRecording(false);
        e.preventDefault();
        return;
      }
      const cfg = SnapStory.getConfig();
      if (!cfg.asrKey) {
        $("ai-modal").classList.remove("hidden");
        $("asr-key").focus();
        showVoiceFallback("请先在设置里填「硅基流动 API Key」，保存后再按话筒");
        e.preventDefault();
        return;
      }
      // 提前预授权，让浏览器缓存权限
      if (!preAuthorized) preAuthorizeMic();
      startCloudRecording(cfg.asrKey);
      e.preventDefault(); // 阻止 click 触发两次
    }

    function onPressEnd(e) {
      if (voiceState === "listening" || voiceState === "starting") {
        stopCloudRecording(false);
        e.preventDefault();
      }
    }

    // 按压事件（同时支持鼠标和触屏）
    btn.addEventListener("mousedown", onPressStart);
    btn.addEventListener("mouseup", onPressEnd);
    btn.addEventListener("mouseleave", onPressEnd); // 拖着手指移开也停止
    btn.addEventListener("touchstart", onPressStart, { passive: false });
    btn.addEventListener("touchend", onPressEnd, { passive: false });
    btn.addEventListener("touchcancel", onPressEnd, { passive: false });

    if (keyboardBtn) {
      keyboardBtn.addEventListener("click", focusKeyboardVoice);
    }

    $("voice-tip").textContent = SnapStory.getConfig().asrKey
      ? "按住话筒说话，松开自动转文字"
      : "首次使用请点右上角 AI 填语音 Key；也可以点「用键盘话筒」";
  }

  async function startCloudRecording(key) {
    setVoiceUI("starting");
    setVoiceFallbackUI(false);
    $("voice-tip").textContent = "正在打开麦克风…";
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
    } catch (e) {
      if (voiceState === "idle") return;
      setVoiceUI("idle");
      showVoiceFallback(micErrorMessage(e));
      return;
    }
    if (voiceState === "idle") {
      stopMediaStream();
      return;
    }

    const mime = pickAudioMime();
    try {
      mediaRecorder = mime ? new MediaRecorder(mediaStream, { mimeType: mime }) : new MediaRecorder(mediaStream);
    } catch (e) {
      try {
        mediaRecorder = new MediaRecorder(mediaStream);
      } catch (e2) {
        stopMediaStream();
        setVoiceUI("idle");
        showVoiceFallback("这个浏览器不支持网页录音，请点「用键盘话筒」");
        return;
      }
    }

    audioChunks = [];
    cloudCancelled = false;
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size) audioChunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const cancelled = cloudCancelled;
      const type = (mediaRecorder && mediaRecorder.mimeType) || mime || "audio/webm";
      const chunks = audioChunks;
      audioChunks = [];
      stopMediaStream();
      mediaRecorder = null;
      if (cancelled) return;
      const blob = new Blob(chunks, { type });
      if (blob.size < 800) {
        setVoiceUI("idle");
        showVoiceFallback("没有录到声音，请再点一次");
        return;
      }
      transcribeAudio(blob, key, type);
    };

    try {
      mediaRecorder.start();
    } catch (e) {
      stopMediaStream();
      mediaRecorder = null;
      setVoiceUI("idle");
      showVoiceFallback("录音启动失败，请点「用键盘话筒」");
      return;
    }

    setVoiceUI("listening");
    $("voice-tip").textContent = "正在录音… 松开手指结束";
    clearCloudTimer();
    cloudTimer = setTimeout(() => {
      if (voiceState === "listening") stopCloudRecording(false);
    }, 30000);
  }

  function stopCloudRecording(cancel) {
    clearCloudTimer();
    if (cancel) cloudCancelled = true;
    const wasStarting = voiceState === "starting";
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      setVoiceUI("idle");
      $("voice-tip").textContent = cancel ? "已取消录音" : "正在转文字…";
      try {
        mediaRecorder.stop();
      } catch (e) {
        stopMediaStream();
        mediaRecorder = null;
        showVoiceFallback("录音结束失败，请再点一次");
      }
      return;
    }
    stopMediaStream();
    setVoiceUI("idle");
    if (cancel || wasStarting) $("voice-tip").textContent = "已取消录音";
  }

  async function transcribeAudio(blob, key, type) {
    voiceTranscribing = true;
    $("voice-tip").textContent = "正在转文字…";
    const form = new FormData();
    form.append("model", "FunAudioLLM/SenseVoiceSmall");
    form.append("file", blob, "voice." + audioExt(type));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);

    try {
      const resp = await fetch("https://api.siliconflow.cn/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: "Bearer " + key },
        body: form,
        signal: controller.signal
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = data.message || (data.error && data.error.message) || ("HTTP " + resp.status);
        if (resp.status === 401 || resp.status === 403) {
          showVoiceFallback("语音 Key 无效，请点右上角 AI 重新填");
        } else {
          showVoiceFallback("语音转文字失败：" + msg);
        }
        return;
      }
      const text = String(data.text || data.result || (data.data && data.data.text) || "").trim();
      if (!text) {
        showVoiceFallback("没有识别到文字，请再说一次");
        return;
      }
      const input = $("story-input");
      const base = input.value.trim();
      input.value = (base ? base + text : text).slice(0, 200);
      setVoiceFallbackUI(false);
      $("voice-tip").textContent = "已转成文字，可以修改";
    } catch (e) {
      if (e.name === "AbortError") showVoiceFallback("转文字超时，请检查网络后再试");
      else showVoiceFallback("语音转文字失败，请检查网络或 Key");
      console.warn("语音转文字失败：", e);
    } finally {
      clearTimeout(timer);
      voiceTranscribing = false;
    }
  }

  function initVoiceMode() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) {
      initCloudVoice();
    } else {
      initBrowserVoice();
    }
  }

  // 页面首次交互时预授权一次麦克风（立即释放），让浏览器记住权限
  // 这样用户只要点一次"允许"，后续所有语音都不再弹权限框
  let audioPreAuthorized = false;
  function tryPreAuthorizeAudio() {
    if (audioPreAuthorized) return;
    audioPreAuthorized = true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
      s.getTracks().forEach((t) => t.stop());
    }).catch(() => { /* 用户拒绝了也没关系 */ });
  }
  // 监听第一次用户交互（点屏幕/触屏）触发预授权
  ["click", "touchstart", "keydown"].forEach((evt) => {
    document.addEventListener(evt, tryPreAuthorizeAudio, { once: true, passive: true });
  });

  try {
    initVoiceMode();
  } catch (e) {
    console.warn("语音初始化失败：", e);
    $("voice-btn").addEventListener("click", focusKeyboardVoice);
    $("voice-label").textContent = "用键盘话筒";
    $("voice-tip").textContent = "语音初始化失败，请点按钮打开输入框，再用键盘上的话筒";
  }

  // ---------------- 文字 ----------------
  $("skip-story").addEventListener("click", () => {
    stopVoiceIfListening();
    state.story = "";
    $("story-input").value = "";
    setStep(3);
  });
  $("story-input").addEventListener("input", () => {
    state.story = $("story-input").value.trim();
  });
  $("next-story").addEventListener("click", () => {
    stopVoiceIfListening();
    state.story = $("story-input").value.trim();
    setStep(3);
  });

  // ---------------- 风格 ----------------
  const styleCards = document.querySelectorAll(".style-card");
  function selectStyle(style) {
    state.style = style;
    SnapStory.setCurrentStyle(style);
    styleCards.forEach((c) => c.classList.toggle("selected", c.dataset.style === style));
  }
  styleCards.forEach((card) => {
    card.addEventListener("click", () => selectStyle(card.dataset.style));
  });
  selectStyle("文艺");

  // ---------------- 生成 ----------------
  const posterCanvas = document.createElement("canvas");

  function normalizeTitle(title, style) {
    let t = String(title || "").replace(/[《》“”"'。，、！？!?：:\-—\s]/g, "");
    if (Array.from(t).length < 2 || Array.from(t).length > 10) {
      t = SnapStory.FALLBACK_TITLES[style] || "美好时光";
    }
    return t;
  }

  async function generate() {
    if (!state.photo) { setStep(1); return; }
    SnapStory.setCurrentStyle(state.style);
    showLoading(true);
    startLoading();
    try {
      const captured = state.exif.date || new Date();
      const oldPhoto = Math.abs(Date.now() - captured.getTime()) > 24 * 3600 * 1000;
      const coords = state.exif.gps || await SnapStory.getCoords(3500);

      const [pw, ai] = await Promise.all([
        SnapStory.resolvePlaceWeather(coords, oldPhoto),
        SnapStory.analyzePhoto(state.photo, state.story)
      ]);

      const a = ai.analysis;
      const recipe = {
        id: SnapStory.newId(),
        syncKey: SnapStory.newSyncKey(),
        style: state.style,
        photo: state.photo,
        dateText: SnapStory.formatDateCN(captured),
        weather: oldPhoto ? "" : (pw.weather || ""),
        location: pw.place || a.locationGuess || "",
        title: normalizeTitle(a.title, state.style),
        caption: a.caption || SnapStory.FALLBACK_CAPTIONS[state.style],
        event: a.event || "今天的好光景",
        scene: a.scene || "",
        emotion: a.emotion || "",
        keywords: a.keywords || [],
        blessing: a.blessing || SnapStory.FALLBACK_BLESSINGS[state.style],
        story: state.story,
        comments: [],
        createdAt: Date.now(),
        aiUsed: !!ai.aiUsed
      };

      await showResult(recipe, ai);
    } catch (e) {
      console.error(e);
      toast("生成失败，请再试一次");
    } finally {
      stopLoading();
      showLoading(false);
    }
  }

  // ---------------- 家人留言同步 ----------------
  let stopCommentSync = null;
  let refreshTimer = null;

  function commentSignature(c) {
    return `${Number(c.at) || 0}|${c.name || ""}|${c.content || ""}`;
  }

  function mergeComments(recipe, incoming) {
    recipe.comments = Array.isArray(recipe.comments) ? recipe.comments : [];
    const seen = new Set(recipe.comments.map(commentSignature));
    let added = 0;
    (incoming || []).forEach((c) => {
      if (!c || !c.content) return;
      const comment = {
        name: String(c.name || "家人").slice(0, 12),
        content: String(c.content).slice(0, 200),
        at: Number(c.at) || Date.now()
      };
      const sig = commentSignature(comment);
      if (seen.has(sig)) return;
      seen.add(sig);
      recipe.comments.push(comment);
      added += 1;
    });
    recipe.comments.sort((a, b) => (Number(a.at) || 0) - (Number(b.at) || 0));
    return added;
  }

  function schedulePosterRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      if (!state.recipe) return;
      try {
        await SnapStory.renderPoster(posterCanvas, state.recipe);
        const dataUrl = posterCanvas.toDataURL("image/jpeg", 0.92);
        $("poster-img").src = dataUrl;
        $("download").href = dataUrl;
      } catch (e) {
        console.warn("更新海报失败：", e);
      }
    }, 220);
  }

  function startCommentSync(recipe) {
    if (stopCommentSync) {
      stopCommentSync();
      stopCommentSync = null;
    }
    const note = $("sync-note");
    const key = recipe.syncKey;
    if (!key || !window.SnapSync) {
      note.textContent = "这张海报是旧链接，留言只保存在家人手机上";
      return;
    }

    note.textContent = "家人留言会自动出现在海报上";
    SnapSync.fetchAll(key).then((list) => {
      if (mergeComments(recipe, list)) {
        SnapStory.updatePoster(recipe);
        schedulePosterRefresh();
      }
    }).catch(() => { /* 忽略，实时通道仍会尝试 */ });

    stopCommentSync = SnapSync.subscribe(key, (c) => {
      if (mergeComments(recipe, [c])) {
        SnapStory.updatePoster(recipe);
        schedulePosterRefresh();
        toast(`${c.name || "家人"} 留言了`);
      }
    }, (status) => {
      if (status === "open") {
        note.textContent = "已连接，家人留言会自动出现";
      } else if (status === "error") {
        note.textContent = "实时同步暂不可用，家人可以复制留言发给您";
      }
    });
  }

  async function showResult(recipe, ai) {
    state.recipe = recipe;
    resetRandomCycle();
    await SnapStory.renderPoster(posterCanvas, recipe);

    const dataUrl = posterCanvas.toDataURL("image/jpeg", 0.92);
    $("poster-img").src = dataUrl;
    $("download").href = dataUrl;

    // 把海报传到同步通道，家人扫码时就能直接看到图片
    if (recipe.syncKey && window.SnapSync) {
      SnapSync.uploadPoster(dataUrl, `snapstory-${recipe.id}.jpg`, recipe.syncKey)
        .catch(() => { /* 上传失败时家人仍可看文字版 */ });
    }

    const pageUrl = SnapStory.pageUrlFor(recipe);
    state.pageUrl = pageUrl;
    const qr = SnapStory.makeQrCanvas(pageUrl, 560);
    $("qr-img").src = qr.toDataURL("image/png");
    $("page-link").href = pageUrl;

    renderInsight(recipe, ai);
    const ok = SnapStory.savePoster(recipe);
    if (!ok) toast("本机存储空间不足，留言页可能打不开");

    setStep("result");
    startCommentSync(recipe);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderInsight(recipe, ai) {
    const box = $("insight");
    if (!box) return;
    const parts = [];
    if (recipe.scene) parts.push(`<p><span>画面</span>${escapeHtml(recipe.scene)}</p>`);
    if (recipe.emotion) parts.push(`<p><span>情绪</span>${escapeHtml(recipe.emotion)}</p>`);
    if (recipe.keywords && recipe.keywords.length) {
      parts.push(`<p><span>关键词</span>${recipe.keywords.map((k) => `<b>${escapeHtml(k)}</b>`).join("")}</p>`);
    }
    const note = ai && ai.aiUsed ? "AI 已识别照片并生成文案" : "";
    box.innerHTML = `${note ? `<div class="insight-head">${note}</div>` : ""}${parts.join("")}`;
    box.classList.toggle("hidden", !note && parts.length === 0);
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function dataUrlToBlob(dataUrl) {
    const parts = String(dataUrl || "").split(",");
    if (parts.length !== 2) return null;
    const mime = (parts[0].match(/data:([^;]+)/) || [])[1] || "image/jpeg";
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  $("generate-btn").addEventListener("click", generate);

  // ---------------- 结果操作 ----------------
  $("share").addEventListener("click", async () => {
    const url = state.pageUrl;
    const dataUrl = $("poster-img").src;

    // 优先直接分享海报图片，家人在聊天里就能看到
    if (navigator.share && navigator.canShare && dataUrl.startsWith("data:")) {
      try {
        const blob = dataUrlToBlob(dataUrl);
        const file = new File([blob], "记忆相册-海报.jpg", { type: "image/jpeg" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: "给你做了一张海报" });
          return;
        }
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }

    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "记忆相册", text: "给你做了一张海报，点开看看", url });
        return;
      } catch (e) { /* 用户取消 */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("链接已复制，发给家人吧");
    } catch (e) {
      window.prompt("复制这个链接发给家人：", url);
    }
  });

  $("download").addEventListener("click", () => {
    toast("正在保存，若没反应请长按海报保存");
  });

  function resetRandomCycle() {
    state.randomQueue = [];
    state.randomBusy = false;
    state.copyRound = 0;
    state.copyBusy = false;
    const hint = $("random-hint");
    if (hint) hint.textContent = "随机风格换配色；更换文案只换主文案；也可以直接点海报上的文案修改。";
    const btn = $("random-style");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "随机风格";
    }
    const copyBtn = $("change-copy");
    if (copyBtn) {
      copyBtn.disabled = false;
      copyBtn.textContent = "更换文案";
    }
  }

  async function changeRandomStyle() {
    if (!state.recipe || state.randomBusy || state.copyBusy) return;
    const styles = (SnapStory.RANDOM_STYLES || []).slice();
    if (!styles.length) return;

    if (!state.randomQueue.length) {
      state.randomQueue = styles;
      for (let i = state.randomQueue.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.randomQueue[i], state.randomQueue[j]] = [state.randomQueue[j], state.randomQueue[i]];
      }
      if (state.randomQueue[0] === state.recipe.style && state.randomQueue.length > 1) {
        state.randomQueue.push(state.randomQueue.shift());
      }
    }

    const style = state.randomQueue.shift();
    const btn = $("random-style");
    state.randomBusy = true;
    btn.disabled = true;
    btn.textContent = "正在换…";

    try {
      const recipe = state.recipe;
      recipe.style = style;
      state.copyRound = 0;
      recipe.manualCopy = false;
      SnapStory.setCurrentStyle(style);
      $("random-hint").textContent = "正在根据照片和心情写文案…";

      const ai = await SnapStory.analyzePhoto(recipe.photo, recipe.story);
      const a = ai.analysis;
      recipe.title = normalizeTitle(a.title, style);
      recipe.caption = a.caption || SnapStory.FALLBACK_CAPTIONS[style];
      recipe.event = a.event || recipe.event || "今天的好光景";
      recipe.scene = a.scene || recipe.scene || "";
      recipe.emotion = a.emotion || recipe.emotion || "";
      recipe.keywords = a.keywords || [];
      recipe.blessing = a.blessing || SnapStory.FALLBACK_BLESSINGS[style];
      recipe.aiUsed = !!ai.aiUsed;

      await SnapStory.renderPoster(posterCanvas, recipe);
      const dataUrl = posterCanvas.toDataURL("image/jpeg", 0.92);
      $("poster-img").src = dataUrl;
      $("download").href = dataUrl;

      const pageUrl = SnapStory.pageUrlFor(recipe);
      state.pageUrl = pageUrl;
      $("page-link").href = pageUrl;
      $("qr-img").src = SnapStory.makeQrCanvas(pageUrl, 560).toDataURL("image/png");
      renderInsight(recipe, ai);
      SnapStory.savePoster(recipe);

      if (recipe.syncKey && window.SnapSync) {
        SnapSync.uploadPoster(dataUrl, `snapstory-${recipe.id}.jpg`, recipe.syncKey)
          .catch(() => { /* 忽略，留言仍可同步 */ });
      }

      const left = state.randomQueue.length;
      $("random-hint").textContent = left
        ? `已换成「${style}」，还能换 ${left} 种`
        : `已换成「${style}」，6 种都看过了，再点从头开始`;
    } catch (e) {
      console.error(e);
      $("random-hint").textContent = "换风格失败，请再试一次";
      toast("换风格失败，请再试一次");
    } finally {
      state.randomBusy = false;
      btn.disabled = false;
      btn.textContent = "随机风格";
    }
  }

  async function refreshRecipeView(recipe, ai) {
    await SnapStory.renderPoster(posterCanvas, recipe);
    const dataUrl = posterCanvas.toDataURL("image/jpeg", 0.92);
    $("poster-img").src = dataUrl;
    $("download").href = dataUrl;

    const pageUrl = SnapStory.pageUrlFor(recipe);
    state.pageUrl = pageUrl;
    $("page-link").href = pageUrl;
    $("qr-img").src = SnapStory.makeQrCanvas(pageUrl, 560).toDataURL("image/png");

    renderInsight(recipe, ai || { aiUsed: !!recipe.aiUsed });
    const ok = SnapStory.savePoster(recipe);
    if (!ok) toast("本机存储空间不足，留言页可能打不开");

    if (recipe.syncKey && window.SnapSync) {
      SnapSync.uploadPoster(dataUrl, `snapstory-${recipe.id}.jpg`, recipe.syncKey)
        .catch(() => { /* 上传失败时家人仍可看文字版 */ });
    }
  }

  async function changeCopy() {
    if (!state.recipe || state.copyBusy || state.randomBusy) return;
    const btn = $("change-copy");
    state.copyBusy = true;
    btn.disabled = true;
    btn.textContent = "正在换…";
    $("random-hint").textContent = "正在根据照片换一版文案…";

    try {
      state.copyRound += 1;
      const recipe = state.recipe;
      const ai = await SnapStory.analyzePhoto(recipe.photo, recipe.story, state.copyRound);
      const a = ai.analysis;

      recipe.blessing = a.blessing || SnapStory.FALLBACK_BLESSINGS[recipe.style];
      recipe.event = a.event || recipe.event;
      recipe.scene = a.scene || recipe.scene;
      recipe.emotion = a.emotion || recipe.emotion;
      recipe.keywords = a.keywords || recipe.keywords || [];
      recipe.caption = a.caption || recipe.caption;
      recipe.title = normalizeTitle(a.title, recipe.style);
      recipe.aiUsed = !!ai.aiUsed;

      await refreshRecipeView(recipe, ai);
      $("random-hint").textContent = `已换第 ${state.copyRound + 1} 版文案；可以继续换，或直接点海报修改。`;
    } catch (e) {
      console.error(e);
      $("random-hint").textContent = "换文案失败，请再试一次";
      toast("换文案失败，请再试一次");
    } finally {
      state.copyBusy = false;
      btn.disabled = false;
      btn.textContent = "更换文案";
    }
  }

  function openCopyEditor() {
    if (!state.recipe) return;
    $("copy-input").value = state.recipe.blessing || "";
    $("copy-modal").classList.remove("hidden");
    setTimeout(() => {
      $("copy-input").focus();
      $("copy-input").select();
    }, 50);
  }

  function closeCopyEditor() {
    $("copy-modal").classList.add("hidden");
  }

  async function saveCopyEdit() {
    if (!state.recipe) return;
    const text = $("copy-input").value.trim();
    if (!text) {
      toast("写一句文案再保存");
      return;
    }
    const btn = $("copy-save");
    btn.disabled = true;
    try {
      state.recipe.blessing = text.slice(0, 32);
      state.recipe.manualCopy = true;
      closeCopyEditor();
      await refreshRecipeView(state.recipe);
      $("random-hint").textContent = "文案已改成你写的这句；还可以点「更换文案」再换。";
    } catch (e) {
      console.error(e);
      toast("保存文案失败，请再试一次");
    } finally {
      btn.disabled = false;
    }
  }

  if (window.SnapVoice) {
    SnapVoice.attach({
      button: "copy-voice",
      label: "copy-voice-label",
      tip: "copy-voice-tip",
      target: "copy-input",
      maxLength: 32,
      replace: true,
      getKey: () => SnapStory.getConfig().asrKey
    });
  }

  $("random-style").addEventListener("click", changeRandomStyle);
  $("change-copy").addEventListener("click", changeCopy);
  $("edit-copy").addEventListener("click", openCopyEditor);
  $("copy-cancel").addEventListener("click", closeCopyEditor);
  $("copy-save").addEventListener("click", saveCopyEdit);
  $("copy-modal").addEventListener("click", (e) => {
    if (e.target === $("copy-modal")) closeCopyEditor();
  });

  $("change-style").addEventListener("click", () => {
    if (stopCommentSync) {
      stopCommentSync();
      stopCommentSync = null;
    }
    clearTimeout(refreshTimer);
    resetRandomCycle();
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("again").addEventListener("click", () => {
    if (stopCommentSync) {
      stopCommentSync();
      stopCommentSync = null;
    }
    clearTimeout(refreshTimer);
    resetRandomCycle();
    stopVoiceIfListening();
    state.photo = null;
    state.exif = {};
    state.story = "";
    state.recipe = null;
    state.pageUrl = "";
    $("story-input").value = "";
    $("voice-tip").textContent = "说完会自动变成文字，可以再改";
    $("shot-preview").removeAttribute("src");
    $("camera-input").value = "";
    $("album-input").value = "";
    selectStyle("文艺");
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ---------------- 家人昵称设置 ----------------
  const FAMILY_KEY = "snapstory.familyNames";
  const DEFAULT_FAMILY = ["老人"];

  function loadFamilyNames() {
    try {
      const raw = localStorage.getItem(FAMILY_KEY);
      if (!raw) return DEFAULT_FAMILY.slice();
      const list = JSON.parse(raw);
      if (!Array.isArray(list) || !list.length) return DEFAULT_FAMILY.slice();
      return list.map((n) => String(n || "").trim().slice(0, 12)).filter(Boolean);
    } catch (e) {
      return DEFAULT_FAMILY.slice();
    }
  }

  function saveFamilyNames(list) {
    localStorage.setItem(FAMILY_KEY, JSON.stringify(list));
  }

  let familyDraft = [];

  function renderFamilyList() {
    const box = $("family-list");
    box.innerHTML = "";
    familyDraft.forEach((name, i) => {
      const item = document.createElement("div");
      item.className = "family-item" + (i === 0 ? " first" : "");
      item.dataset.index = String(i);

      const input = document.createElement("input");
      input.type = "text";
      input.className = "family-name";
      input.maxLength = 12;
      input.value = name;
      input.placeholder = i === 0 ? "老人的称呼" : "家人昵称";
      input.addEventListener("input", () => {
        familyDraft[i] = input.value.trim();
      });

      const actions = document.createElement("div");
      actions.className = "family-actions";

      const up = document.createElement("button");
      up.type = "button";
      up.innerHTML = "↑";
      up.title = "上移";
      up.disabled = i === 0;
      up.addEventListener("click", () => {
        if (i === 0) return;
        [familyDraft[i - 1], familyDraft[i]] = [familyDraft[i], familyDraft[i - 1]];
        renderFamilyList();
      });

      const down = document.createElement("button");
      down.type = "button";
      down.innerHTML = "↓";
      down.title = "下移";
      down.disabled = i === familyDraft.length - 1;
      down.addEventListener("click", () => {
        if (i === familyDraft.length - 1) return;
        [familyDraft[i + 1], familyDraft[i]] = [familyDraft[i], familyDraft[i + 1]];
        renderFamilyList();
      });

      const del = document.createElement("button");
      del.type = "button";
      del.innerHTML = "×";
      del.title = "删除";
      del.addEventListener("click", () => {
        if (familyDraft.length <= 1) {
          toast("至少保留一个昵称");
          return;
        }
        familyDraft.splice(i, 1);
        renderFamilyList();
      });

      actions.appendChild(up);
      actions.appendChild(down);
      actions.appendChild(del);

      item.appendChild(input);
      item.appendChild(actions);
      box.appendChild(item);
    });
  }

  function openFamilyModal() {
    familyDraft = loadFamilyNames();
    if (!familyDraft.length) familyDraft = DEFAULT_FAMILY.slice();
    renderFamilyList();
    $("family-new-input").value = "";
    $("family-modal").classList.remove("hidden");
    setTimeout(() => $("family-new-input").focus(), 50);
  }

  function closeFamilyModal() {
    $("family-modal").classList.add("hidden");
  }

  $("family-btn").addEventListener("click", openFamilyModal);
  $("family-cancel").addEventListener("click", closeFamilyModal);

  function addFamilyName() {
    const input = $("family-new-input");
    const val = input.value.trim().slice(0, 12);
    if (!val) { toast("写一个昵称再加"); return; }
    if (familyDraft.includes(val)) { toast("已经有这个昵称了"); input.value = ""; return; }
    familyDraft.push(val);
    input.value = "";
    renderFamilyList();
    input.focus();
  }

  $("family-add-btn").addEventListener("click", addFamilyName);
  $("family-new-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); addFamilyName(); }
  });

  $("family-save").addEventListener("click", () => {
    const clean = familyDraft.map((n) => String(n || "").trim().slice(0, 12)).filter(Boolean);
    if (!clean.length) { toast("至少保留一个昵称"); return; }
    saveFamilyNames(clean);
    closeFamilyModal();
    toast("已保存家人昵称");
  });

  // ---------------- AI 设置 ----------------
  function updateAiHint() {
    const cfg = SnapStory.getConfig();
    const aiOk = !!(cfg.key && cfg.model);
    const hint = $("ai-hint");
    hint.textContent = aiOk ? "照片 AI 已开启。点右上角 AI 可以设置。" : "";
    hint.classList.toggle("hidden", !aiOk);
  }

  $("ai-btn").addEventListener("click", () => {
    const cfg = SnapStory.getConfig();
    $("ark-key").value = cfg.key || "";
    $("ark-model").value = cfg.model || "";
    $("asr-key").value = cfg.asrKey || "";
    $("ai-modal").classList.remove("hidden");
  });

  $("ai-save").addEventListener("click", () => {
    const key = $("ark-key").value.trim();
    const model = $("ark-model").value.trim();
    const asrKey = $("asr-key").value.trim();
    SnapStory.setConfig({ key, model, asrKey });
    updateAiHint();
    $("ai-modal").classList.add("hidden");
    if (asrKey && voiceMode === "cloud") $("voice-tip").textContent = "语音已开启，点话筒说话";
    toast(key && model ? "照片 AI 已开启" : "已保存");
  });

  $("ai-clear").addEventListener("click", () => {
    SnapStory.setConfig({});
    $("ark-key").value = "";
    $("ark-model").value = "";
    $("asr-key").value = "";
    updateAiHint();
    if (voiceMode === "cloud") $("voice-tip").textContent = "语音 Key 已清除，点话筒可重新设置";
    toast("已清除 AI 和语音设置");
  });

  // ---------------- 最近的海报 ----------------
  let galleryToken = 0;
  let historyToken = 0;

  function showGalleryList() {
    $("gallery-list-view").classList.remove("hidden");
    $("gallery-detail-view").classList.add("hidden");
  }

  function formatCommentTime(ts) {
    const d = new Date(Number(ts) || Date.now());
    return d.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function renderHistoryComments(recipe) {
    const box = $("history-comments");
    const comments = Array.isArray(recipe.comments) ? recipe.comments : [];
    if (!comments.length) {
      box.innerHTML = '<p class="gallery-empty">还没有家人留言。</p>';
      return;
    }
    box.innerHTML = `<h3>家人的留言（${comments.length}）</h3>` + comments.map((c) => `
      <div class="history-comment">
        <strong>${escapeHtml(c.name || "家人")}</strong>
        <p>${escapeHtml(c.content || "")}</p>
        <span>${escapeHtml(formatCommentTime(c.at))}</span>
      </div>
    `).join("");
  }

  async function openHistory(id) {
    const recipe = SnapStory.getPoster(id);
    if (!recipe) {
      toast("这张海报已经不在本机了");
      return;
    }
    const token = ++historyToken;
    $("gallery-list-view").classList.add("hidden");
    $("gallery-detail-view").classList.remove("hidden");
    $("history-title").textContent = `${recipe.title || "海报"}${recipe.dateText ? " · " + recipe.dateText : ""}`;
    $("history-page-link").href = SnapStory.pageUrlFor(recipe);

    try {
      const canvas = document.createElement("canvas");
      await SnapStory.renderPoster(canvas, recipe);
      if (token !== historyToken) return;
      $("history-poster").src = canvas.toDataURL("image/jpeg", 0.9);
    } catch (e) {
      $("history-poster").src = recipe.photo || "";
    }
    renderHistoryComments(recipe);

    if (recipe.syncKey && window.SnapSync) {
      SnapSync.fetchAll(recipe.syncKey).then((list) => {
        if (token !== historyToken) return;
        if (mergeComments(recipe, list)) {
          SnapStory.updatePoster(recipe);
          renderHistoryComments(recipe);
        }
      }).catch(() => { /* 离线时看本机留言 */ });
    }
  }

  async function openGallery() {
    const token = ++galleryToken;
    showGalleryList();
    $("gallery-modal").classList.remove("hidden");
    const grid = $("gallery-grid");
    grid.innerHTML = "";
    const items = SnapStory.listPosters();
    $("gallery-empty").classList.toggle("hidden", items.length > 0);

    for (const recipe of items) {
      if (token !== galleryToken) return;
      const card = document.createElement("button");
      card.className = "gallery-item";
      card.type = "button";
      card.setAttribute("aria-label", `查看 ${recipe.title || "海报"} ${recipe.dateText || ""}`);

      const thumb = document.createElement("canvas");
      thumb.className = "gallery-thumb";
      thumb.width = 270;
      thumb.height = 455;

      const meta = document.createElement("span");
      meta.className = "gallery-meta";
      meta.innerHTML = `<strong>${escapeHtml(recipe.title || "美好时光")}</strong><small>${escapeHtml(recipe.dateText || "")} · ${(recipe.comments || []).length} 条留言</small>`;

      card.appendChild(thumb);
      card.appendChild(meta);
      card.addEventListener("click", () => openHistory(recipe.id));
      grid.appendChild(card);

      try {
        const full = document.createElement("canvas");
        await SnapStory.renderPoster(full, recipe);
        if (token !== galleryToken) return;
        thumb.getContext("2d").drawImage(full, 0, 0, thumb.width, thumb.height);
      } catch (e) {
        const img = new Image();
        img.onload = () => {
          try { thumb.getContext("2d").drawImage(img, 0, 0, thumb.width, thumb.height); } catch (e2) { /* 忽略 */ }
        };
        img.src = recipe.photo || "";
      }
    }
  }

  $("gallery-btn").addEventListener("click", openGallery);
  $("gallery-close").addEventListener("click", () => {
    galleryToken += 1;
    $("gallery-modal").classList.add("hidden");
    showGalleryList();
  });
  $("gallery-back").addEventListener("click", () => {
    historyToken += 1;
    showGalleryList();
  });

  // ---------------- 帮助 ----------------
  $("help-btn").addEventListener("click", () => $("help-modal").classList.remove("hidden"));
  $("help-close").addEventListener("click", () => $("help-modal").classList.add("hidden"));

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  });

  updateAiHint();
  setStep(1);
})();
