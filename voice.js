(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function attach(opts) {
    const button = $(opts.button);
    const target = $(opts.target);
    if (!button || !target) return;

    const label = $(opts.label);
    const tip = $(opts.tip);
    const keyboardBtn = opts.keyboard ? $(opts.keyboard) : null;
    const maxLength = opts.maxLength || 200;
    const getKey = opts.getKey || (() => "");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

    let mode = (canRecord && getKey()) ? "cloud" : (SpeechRecognition ? "browser" : "keyboard");
    let state = "idle";
    let recognition = null;
    let base = "";
    let finalText = "";
    let stopped = false;
    let hadError = false;
    let timer = null;
    let stream = null;
    let recorder = null;
    let chunks = [];
    let cancelled = false;
    let transcribing = false;

    function setTip(message, isError) {
      if (!tip) return;
      tip.textContent = message;
      tip.classList.toggle("error", !!isError);
    }

    function setUI(next) {
      state = next;
      button.classList.toggle("recording", next === "listening");
      button.classList.toggle("starting", next === "starting");
      if (!label) return;
      if (next === "starting") {
        label.textContent = mode === "cloud" ? "正在打开麦克风…" : "正在启动… 再点一下取消";
      } else if (next === "listening") {
        label.textContent = mode === "cloud" ? "正在录音… 点一下结束" : "正在听… 点一下结束";
      } else {
        label.textContent = mode === "keyboard" ? "语音输入" : "点一下，说话";
      }
    }

    function clearTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function keepVoice(message, isError) {
      setUI("idle");
      setTip(message || "没有听清，请再点一次", isError !== false);
    }

    function focusKeyboard() {
      target.focus();
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setTip("请点手机键盘上的话筒图标说话，说完文字会出现在输入框里");
    }

    function appendText(text) {
      if (!text) return;
      target.value = (target.value + text).slice(0, maxLength);
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // ---------------- 浏览器语音 ----------------
    function initRecognition() {
      if (!SpeechRecognition) return false;
      try {
        recognition = new SpeechRecognition();
      } catch (e) {
        return false;
      }
      recognition.lang = "zh-CN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (state === "idle") {
          try { recognition.abort(); } catch (e) { /* 忽略 */ }
          return;
        }
        clearTimer();
        stopped = false;
        hadError = false;
        setUI("listening");
        setTip("请说话，说完点一下结束");
        timer = setTimeout(() => stopBrowser(), 30000);
      };

      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += text;
          else interim += text;
        }
        target.value = (base + finalText + interim).slice(0, maxLength);
        if (finalText || interim) setTip("已转成文字，可以修改");
      };

      recognition.onerror = (event) => {
        clearTimer();
        hadError = true;
        const code = event.error || "";
        if (code === "aborted") return;
        setUI("idle");
        if (code === "network" || code === "service-not-allowed") {
          if (canRecord && getKey()) {
            mode = "cloud";
            setTip("浏览器语音连不上，再点一下用云端转写");
          } else {
            keepVoice("语音服务连不上，请检查网络后再点一次，或点「用键盘话筒」");
          }
          return;
        }
        if (code === "not-allowed" || code === "audio-capture") {
          keepVoice("没有麦克风权限。请在浏览器设置里允许，然后再点一次");
        } else {
          keepVoice("没有听清，请再点一次");
        }
      };

      recognition.onend = () => {
        clearTimer();
        setUI("idle");
        if (hadError || stopped) {
          hadError = false;
          stopped = false;
          return;
        }
        const endedBase = base;
        const endedFinal = finalText;
        setTimeout(() => {
          if (state !== "idle" || base !== endedBase) return;
          const spoken = (target.value.slice(endedBase.length) || "").trim();
          if (spoken || endedFinal) setTip("已转成文字，可以修改");
          else keepVoice("没有听清，请再点一次");
        }, 600);
      };
      return true;
    }

    function startBrowser() {
      base = target.value;
      finalText = "";
      stopped = false;
      hadError = false;
      setUI("starting");
      setTip("正在启动语音… 再点一下取消");
      clearTimer();
      timer = setTimeout(() => {
        if (state === "starting") {
          stopBrowser();
          keepVoice("语音没有启动成功，请再点一次");
        }
      }, 8000);
      try {
        recognition.start();
      } catch (e) {
        clearTimer();
        keepVoice("语音启动失败，请再点一次");
      }
    }

    function stopBrowser() {
      clearTimer();
      stopped = true;
      if (recognition && state !== "idle") {
        try { recognition.stop(); } catch (e) { /* 忽略 */ }
        setTimeout(() => {
          if (state !== "idle") {
            try { recognition.abort(); } catch (e) { /* 忽略 */ }
            setUI("idle");
          }
        }, 800);
      }
      setUI("idle");
      const spoken = (target.value.slice(base.length) || "").trim();
      setTip(spoken || finalText ? "已停止，可以继续修改文字" : "没有听清，请再点一次");
    }

    // ---------------- 录音上传，云端转文字 ----------------
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

    function stopStream() {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
    }

    function startCloud(key) {
      setUI("starting");
      setTip("正在打开麦克风…");
      navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      }).then((nextStream) => {
        if (state === "idle") {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = nextStream;
        const mime = pickAudioMime();
        try {
          recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        } catch (e) {
          stopStream();
          keepVoice("这个浏览器不支持网页录音，请再点一次");
          return;
        }

        chunks = [];
        cancelled = false;
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size) chunks.push(event.data);
        };
        recorder.onstop = () => {
          const wasCancelled = cancelled;
          const type = (recorder && recorder.mimeType) || mime || "audio/webm";
          const parts = chunks;
          chunks = [];
          stopStream();
          recorder = null;
          if (wasCancelled) return;
          const blob = new Blob(parts, { type });
          if (blob.size < 800) {
            setUI("idle");
            setTip("没有录到声音，请再点一次");
            return;
          }
          transcribe(blob, key, type);
        };

        try {
          recorder.start();
        } catch (e) {
          stopStream();
          recorder = null;
          keepVoice("录音启动失败，请再点一次");
          return;
        }
        setUI("listening");
        setTip("请说话，说完点一下结束");
        clearTimer();
        timer = setTimeout(() => stopCloud(false), 30000);
      }).catch((err) => {
        const name = err && err.name;
        if (name === "NotAllowedError" || name === "SecurityError") {
          keepVoice("没有麦克风权限。请在浏览器设置里允许，然后再点一次");
        } else {
          keepVoice("打不开麦克风，请再点一次");
        }
      });
    }

    function stopCloud(cancel) {
      clearTimer();
      if (cancel) cancelled = true;
      const wasStarting = state === "starting";
      if (recorder && recorder.state !== "inactive") {
        setUI("idle");
        setTip(cancel ? "已取消录音" : "正在转文字…");
        try {
          recorder.stop();
        } catch (e) {
          stopStream();
          recorder = null;
          setTip("录音结束失败，请再点一次", true);
        }
        return;
      }
      stopStream();
      setUI("idle");
      if (cancel || wasStarting) setTip("已取消录音");
    }

    async function transcribe(blob, key, type) {
      transcribing = true;
      setTip("正在转文字…");
      const form = new FormData();
      form.append("model", "FunAudioLLM/SenseVoiceSmall");
      form.append("file", blob, "voice." + audioExt(type));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

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
            keepVoice("语音 Key 无效，请让家人重新配置，然后再点一次");
          } else {
            setTip("语音转文字失败：" + msg, true);
          }
          return;
        }
        const text = String(data.text || data.result || (data.data && data.data.text) || "").trim();
        if (!text) {
          setTip("没有识别到文字，请再说一次", true);
          return;
        }
        appendText(text);
        setTip("已转成文字，可以修改");
      } catch (e) {
        if (e.name === "AbortError") setTip("转文字超时，请检查网络后再试", true);
        else setTip("语音转文字失败，请检查网络或 Key", true);
      } finally {
        clearTimeout(timeout);
        transcribing = false;
      }
    }

    function start() {
      if (transcribing) {
        setTip("正在转文字，请稍等…");
        return;
      }
      if (state !== "idle") {
        if (mode === "cloud") stopCloud(false);
        else stopBrowser();
        return;
      }
      if (mode === "keyboard") {
        focusKeyboard();
        return;
      }
      if (mode === "cloud") {
        const key = getKey();
        if (!key) {
          keepVoice("没有配置语音 Key，请再点一次，或点「用键盘话筒」");
          return;
        }
        startCloud(key);
        return;
      }
      startBrowser();
    }

    if (mode === "browser" && !initRecognition()) mode = "keyboard";
    if (mode === "cloud" && !canRecord) mode = "keyboard";
    if (mode === "keyboard") {
      button.classList.add("keyboard-mode");
      if (keyboardBtn) keyboardBtn.classList.remove("hidden");
      if (label) label.textContent = "语音输入";
      setTip("这个浏览器不支持网页语音，请点下面的「用键盘话筒」");
    } else {
      setTip("点一下说话，说完会自动变成文字");
    }

    button.addEventListener("click", start);
    if (keyboardBtn) keyboardBtn.addEventListener("click", focusKeyboard);
  }

  window.SnapVoice = { attach };
})();
