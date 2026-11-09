/* 记忆相册 · 留言实时同步（演示通道）
 *
 * GitHub Pages 只能放静态文件，没有数据库。这里用 ntfy 的公共消息通道
 * 做一个“轻同步”：子女留言后，老人打开着的海报会实时收到并重新排版。
 *
 * 注意：
 * - 消息会经过 ntfy.sh 公共服务器，话题由每张海报的随机 syncKey 生成；
 *   拿到二维码链接的人才能读写这个话题。
 * - 免费通道只缓存约 12 小时。老人页面收到后会存进本机，之后仍能看到；
 *   如果超过 12 小时才第一次打开，之前的留言可能已经过期。
 * - 海报图片也通过同一条通道上传，免费附件缓存约 3 小时。家人扫码时
 *   会优先加载这张图片；过期或上传失败时退回文字版故事。
 * - 正式版应换成自己的后端（FastAPI / 云函数），把 publish/fetchAll/subscribe
 *   换成自己的接口即可。
 */
(function (global) {
  "use strict";

  const BASE = (global.SNAP_SYNC_BASE || "https://ntfy.sh").replace(/\/+$/, "");

  function topicFor(key) {
    const safe = String(key || "").replace(/[^a-zA-Z0-9_-]/g, "");
    return safe ? "snapstory-" + safe.slice(0, 48) : "";
  }

  async function publish(key, comment) {
    const topic = topicFor(key);
    if (!topic || !comment || !comment.content) return false;
    try {
      const res = await fetch(`${BASE}/${topic}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          name: String(comment.name || "家人").slice(0, 12),
          content: String(comment.content || "").slice(0, 200),
          at: comment.at || Date.now()
        })
      });
      return res.ok;
    } catch (e) {
      console.warn("留言同步失败：", e);
      return false;
    }
  }

  async function fetchAll(key) {
    const topic = topicFor(key);
    if (!topic) return [];
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;
    try {
      const res = await fetch(`${BASE}/${topic}/json?poll=1&since=all`, {
        cache: "no-store",
        signal: controller ? controller.signal : undefined
      });
      if (!res.ok) return [];
      const text = await res.text();
      const out = [];
      text.split("\n").forEach((line) => {
        if (!line.trim()) return;
        try {
          const envelope = JSON.parse(line);
          if (envelope.event !== "message" || !envelope.message) return;
          const c = JSON.parse(envelope.message);
          if (c && c.content) out.push(c);
        } catch (e) { /* 忽略坏消息 */ }
      });
      return out;
    } catch (e) {
      console.warn("读取留言失败：", e);
      return [];
    } finally {
      if (timer) clearTimeout(timer);
    }
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

  async function uploadPoster(dataUrl, filename, key) {
    const topic = topicFor(key);
    const blob = dataUrlToBlob(dataUrl);
    if (!topic || !blob) return "";
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 10000) : null;
    try {
      const res = await fetch(`${BASE}/${topic}`, {
        method: "PUT",
        headers: {
          "Filename": filename || "snapstory-poster.jpg",
          "Content-Type": blob.type || "image/jpeg"
        },
        body: blob,
        signal: controller ? controller.signal : undefined
      });
      if (!res.ok) return "";
      const data = await res.json();
      return data && data.attachment && data.attachment.url ? data.attachment.url : "";
    } catch (e) {
      console.warn("海报上传失败：", e);
      return "";
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function fetchPoster(key) {
    const topic = topicFor(key);
    if (!topic) return "";
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;
    try {
      const res = await fetch(`${BASE}/${topic}/json?poll=1&since=all`, {
        cache: "no-store",
        signal: controller ? controller.signal : undefined
      });
      if (!res.ok) return "";
      const text = await res.text();
      let url = "";
      text.split("\n").forEach((line) => {
        if (!line.trim()) return;
        try {
          const envelope = JSON.parse(line);
          const attachment = envelope && envelope.attachment;
          if (envelope.event === "message" && attachment && /^image\//.test(attachment.type || "")) {
            url = attachment.url || url;
          }
        } catch (e) { /* 忽略坏消息 */ }
      });
      return url;
    } catch (e) {
      console.warn("读取海报失败：", e);
      return "";
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function subscribe(key, onComment, onStatus) {
    const topic = topicFor(key);
    if (!topic || typeof EventSource === "undefined") return function () {};
    let source;
    try {
      source = new EventSource(`${BASE}/${topic}/sse`);
    } catch (e) {
      if (onStatus) onStatus("error");
      return function () {};
    }
    source.onopen = function () {
      if (onStatus) onStatus("open");
    };
    source.onmessage = function (event) {
      try {
        const envelope = JSON.parse(event.data);
        if (envelope.event !== "message" || !envelope.message) return;
        const c = JSON.parse(envelope.message);
        if (c && c.content) onComment(c);
      } catch (e) { /* 忽略坏消息 */ }
    };
    source.onerror = function () {
      if (onStatus) onStatus("error");
    };
    return function () {
      try { source.close(); } catch (e) {}
    };
  }

  global.SnapSync = { publish, fetchAll, uploadPoster, fetchPoster, subscribe, topicFor, base: BASE };
})(window);
