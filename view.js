(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.hash.replace(/^#/, ""));
  const id = params.get("id");
  const payloadText = params.get("d");
  const syncKey = params.get("k") || "";

  const recipe = id ? SnapStory.getPoster(id) : null;
  const payload = (!recipe && payloadText) ? SnapStory.decodePayload(payloadText) : null;
  const canvas = document.createElement("canvas");

  let localComments = [];
  let stopSync = null;

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function commentSignature(c) {
    return `${Number(c.at) || 0}|${c.name || ""}|${c.content || ""}`;
  }

  function mergeComments(list, incoming) {
    const seen = new Set(list.map(commentSignature));
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
      list.push(comment);
      added += 1;
    });
    list.sort((a, b) => (Number(a.at) || 0) - (Number(b.at) || 0));
    return added;
  }

  async function fetchRemoteComments() {
    if (!syncKey || !window.SnapSync) return [];
    try {
      return await SnapSync.fetchAll(syncKey);
    } catch (e) {
      return [];
    }
  }

  function renderComments(list) {
    const box = $("comment-list");
    if (!list || !list.length) {
      box.innerHTML = '<p class="comment-empty">还没有留言，写下第一句吧。</p>';
    } else {
      box.innerHTML = list.map((c) => `
        <div class="comment-item">
          <div class="comment-name">${esc(c.name || "家人")}</div>
          <div class="comment-text">${esc(c.content || "")}</div>
        </div>`).join("");
    }
    $("comments-count").textContent = list && list.length ? `${list.length} 条` : "";
  }

  async function renderPoster() {
    await SnapStory.renderPoster(canvas, recipe);
    const url = canvas.toDataURL("image/jpeg", 0.92);
    $("poster-img").src = url;
    $("download").href = url;
  }

  function showRemotePoster(url) {
    const img = $("poster-img");
    img.onload = () => {
      $("poster-wrap").classList.remove("hidden");
      $("text-card").classList.add("hidden");
      $("view-meta").classList.remove("hidden");
      const link = $("download");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "查看 / 保存这张海报";
      link.classList.remove("hidden");
    };
    img.onerror = () => {
      $("poster-wrap").classList.add("hidden");
      $("text-card").classList.remove("hidden");
      $("download").classList.add("hidden");
    };
    img.src = url;
  }

  async function loadRemotePoster() {
    if (!syncKey || !window.SnapSync) return "";
    for (let i = 0; i < 5; i += 1) {
      const url = await SnapSync.fetchPoster(syncKey);
      if (url) return url;
      if (i < 4) await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    return "";
  }

  function showError() {
    $("view-loading").classList.add("hidden");
    $("view-error").classList.remove("hidden");
  }

  function setupName() {
    const input = $("comment-name");
    const urlName = (new URLSearchParams(location.search).get("name") || "").trim().slice(0, 12);
    const saved = (localStorage.getItem("snapstory.myname") || "").trim().slice(0, 12);
    const defaultValue = saved || urlName;
    input.value = defaultValue || "家人";
    input.placeholder = "微信昵称，可修改";
    const remember = () => localStorage.setItem("snapstory.myname", input.value.trim());
    input.addEventListener("input", remember);
    input.addEventListener("change", remember);
  }

  function setupVoice() {
    if (!window.SnapVoice) return;
    SnapVoice.attach({
      button: "comment-voice",
      label: "comment-voice-label",
      tip: "comment-voice-tip",
      keyboard: "comment-voice-keyboard",
      target: "comment-content",
      maxLength: 200,
      getKey: () => SnapStory.getConfig().asrKey
    });
  }

  function saveTextComments(key) {
    try { localStorage.setItem(key, JSON.stringify(localComments)); } catch (e) { /* 忽略 */ }
  }

  async function init() {
    setupName();
    setupVoice();

    if (recipe) {
      // 同一台设备：完整海报 + 可回写留言
      recipe.comments = Array.isArray(recipe.comments) ? recipe.comments : [];

      $("view-meta").textContent = [recipe.dateText, recipe.weather, recipe.location]
        .filter(Boolean).join(" · ");
      await renderPoster();
      renderComments(recipe.comments);
      $("view-loading").classList.add("hidden");
      $("view-content").classList.remove("hidden");

      fetchRemoteComments().then((remote) => {
        if (mergeComments(recipe.comments, remote)) {
          SnapStory.updatePoster(recipe);
          renderComments(recipe.comments);
          renderPoster().catch((err) => console.error(err));
        }
      });

      $("comment-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = $("comment-name").value.trim() || "家人";
        const content = $("comment-content").value.trim();
        if (!content) { toast("写一句话再提交吧"); return; }
        const comment = { name, content, at: Date.now() };
        recipe.comments.push(comment);
        SnapStory.updatePoster(recipe);
        renderComments(recipe.comments);
        $("comment-content").value = "";
        try {
          await renderPoster();
        } catch (err) { console.error(err); }

        if (syncKey && window.SnapSync) {
          const ok = await SnapSync.publish(syncKey, comment);
          toast(ok ? "留言已发送，老人那边会看到" : "已排进海报，但同步失败");
        } else {
          toast("留言已经排进海报");
        }
      });

      if (syncKey && window.SnapSync) {
        stopSync = SnapSync.subscribe(syncKey, async (c) => {
          if (mergeComments(recipe.comments, [c])) {
            SnapStory.updatePoster(recipe);
            renderComments(recipe.comments);
            try { await renderPoster(); } catch (err) { console.error(err); }
            toast(`${c.name || "家人"} 留言了`);
          }
        });
      }
      window.addEventListener("pagehide", () => { if (stopSync) stopSync(); });
      return;
    }

    if (payload) {
      // 换设备扫码：优先加载海报图片，图片过期或上传失败时显示文字版故事
      const card = $("text-card");
      card.dataset.style = payload.s || "文艺";
      $("tc-date").textContent = [payload.dt, payload.w].filter(Boolean).join(" · ");
      $("tc-title").textContent = payload.t || "美好时光";
      $("tc-caption").textContent = payload.c || "";
      $("tc-story").textContent = payload.st ? `今天 · ${payload.st}` : (payload.e ? `今天 · ${payload.e}` : "");
      $("tc-blessing").textContent = payload.b || "";
      card.classList.remove("hidden");

      $("poster-wrap").classList.add("hidden");
      $("view-meta").textContent = [payload.dt, payload.w, payload.loc]
        .filter(Boolean).join(" · ");
      $("view-meta").classList.add("hidden");
      $("download").classList.add("hidden");
      $("comments-intro").textContent = "写下想对TA说的话，留言会同步到老人的海报上。";
      $("comment-tip").textContent = syncKey
        ? "留言发送后，老人打开海报就能看到。"
        : "这张海报是旧链接，留言只保存在本机，可以复制发给家人。";

      const key = "snapstory.textcomments." + (id || payloadText.slice(0, 24));
      try { localComments = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { localComments = []; }
      if (!Array.isArray(localComments)) localComments = [];
      renderComments(localComments);

      $("view-loading").classList.add("hidden");
      $("view-content").classList.remove("hidden");

      loadRemotePoster().then((url) => {
        if (url) showRemotePoster(url);
      });

      fetchRemoteComments().then((remote) => {
        if (mergeComments(localComments, remote)) {
          saveTextComments(key);
          renderComments(localComments);
        }
      });

      $("comment-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = $("comment-name").value.trim() || "家人";
        const content = $("comment-content").value.trim();
        if (!content) { toast("写一句话再提交吧"); return; }
        const comment = { name, content, at: Date.now() };
        localComments.push(comment);
        saveTextComments(key);
        renderComments(localComments);
        $("comment-content").value = "";
        $("copy-comment").classList.remove("hidden");

        if (syncKey && window.SnapSync) {
          const ok = await SnapSync.publish(syncKey, comment);
          toast(ok ? "留言已发送，老人打开海报就能看到" : "已保存在本机，网络不通，可以复制发给家人");
        } else {
          toast("留言已保存，可以复制发给家人");
        }
      });

      $("copy-comment").addEventListener("click", async () => {
        const text = localComments.map((c) => `${c.name || "家人"}：${c.content}`).join("\n");
        try {
          await navigator.clipboard.writeText(text);
          toast("已复制，去发给家人吧");
        } catch (e) {
          window.prompt("复制这段留言发给家人：", text);
        }
      });

      if (syncKey && window.SnapSync) {
        stopSync = SnapSync.subscribe(syncKey, (c) => {
          if (mergeComments(localComments, [c])) {
            saveTextComments(key);
            renderComments(localComments);
          }
        });
        window.addEventListener("pagehide", () => { if (stopSync) stopSync(); });
      }

      return;
    }

    showError();
  }

  init().catch((e) => {
    console.error(e);
    showError();
  });
})();
