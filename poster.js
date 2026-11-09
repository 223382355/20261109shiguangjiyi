/* 记忆相册 · 纯前端版共享逻辑：EXIF、定位天气、AI、海报绘制、二维码、本机存储 */
(function (global) {
  "use strict";

  // ---------------- 主题与文案 ----------------
  const THEMES = {
    "文艺": { bg1: [247, 242, 231], bg2: [233, 224, 207], accent: [108, 124, 105], text: [60, 56, 48], soft: [122, 113, 98], frame: [255, 253, 247], chip: "rgba(255,255,255,0.47)", chipText: null, serif: true },
    "喜庆": { bg1: [155, 35, 30], bg2: [117, 22, 20], accent: [244, 201, 105], text: [255, 248, 232], soft: [246, 220, 180], frame: [255, 246, 224], chip: "rgba(0,0,0,0.22)", chipText: [255, 244, 224], serif: false },
    "美丽": { bg1: [253, 231, 231], bg2: [219, 229, 245], accent: [190, 108, 118], text: [74, 62, 66], soft: [128, 108, 112], frame: [255, 255, 255], chip: "rgba(255,255,255,0.51)", chipText: null, serif: false },
    "怀旧": { bg1: [235, 224, 204], bg2: [213, 198, 174], accent: [139, 104, 70], text: [72, 57, 41], soft: [122, 101, 78], frame: [250, 243, 228], chip: "rgba(255,255,255,0.35)", chipText: null, serif: true },
    "清新": { bg1: [232, 244, 238], bg2: [206, 230, 220], accent: [74, 124, 105], text: [44, 62, 56], soft: [96, 120, 110], frame: [255, 255, 251], chip: "rgba(255,255,255,0.55)", chipText: null, serif: false },
    "晚霞": { bg1: [255, 226, 205], bg2: [246, 196, 184], accent: [176, 86, 72], text: [92, 52, 46], soft: [150, 92, 80], frame: [255, 250, 244], chip: "rgba(255,255,255,0.45)", chipText: null, serif: false },
    "水墨": { bg1: [238, 241, 242], bg2: [214, 221, 224], accent: [70, 88, 96], text: [40, 48, 52], soft: [100, 112, 118], frame: [255, 255, 255], chip: "rgba(255,255,255,0.55)", chipText: null, serif: true },
    "田园": { bg1: [250, 242, 214], bg2: [228, 230, 194], accent: [112, 128, 70], text: [66, 64, 42], soft: [120, 112, 78], frame: [255, 253, 244], chip: "rgba(255,255,255,0.5)", chipText: null, serif: false },
    "海洋": { bg1: [224, 240, 246], bg2: [196, 222, 235], accent: [52, 108, 132], text: [38, 58, 70], soft: [88, 112, 126], frame: [252, 255, 255], chip: "rgba(255,255,255,0.55)", chipText: null, serif: false },
    "金色": { bg1: [250, 238, 210], bg2: [232, 212, 170], accent: [150, 110, 46], text: [72, 58, 36], soft: [126, 104, 68], frame: [255, 252, 242], chip: "rgba(255,255,255,0.45)", chipText: null, serif: true }
  };
  const RANDOM_STYLES = ["清新", "晚霞", "水墨", "田园", "海洋", "金色"];
  const STYLE_GUIDE = {
    "文艺": "克制、清淡、有诗意，像散文里的一句话",
    "喜庆": "热闹、吉利、有家庭烟火气，像过年的祝福",
    "美丽": "轻盈、明亮、夸赞照片里的光和颜色",
    "怀旧": "温柔、怀旧、像在翻老相册时说的话",
    "清新": "清爽、自然、像早晨的风和青草香",
    "晚霞": "温暖、浪漫、像傍晚天边的晚霞",
    "水墨": "安静、留白、像一幅淡淡的水墨画",
    "田园": "质朴、家常、像小院里的四季",
    "海洋": "开阔、轻快、像海风吹过一样自在",
    "金色": "明亮、珍贵、像阳光落在金色岁月里"
  };
  const FALLBACK_TITLES = {
    "文艺": "岁月温柔", "喜庆": "喜乐安康", "美丽": "美好时光", "怀旧": "那年今日",
    "清新": "清风徐来", "晚霞": "晚霞正好", "水墨": "山水有情", "田园": "田园小记", "海洋": "海风轻轻", "金色": "金色时光"
  };
  const FALLBACK_CAPTIONS = {
    "文艺": "把平常的日子，过成一首温柔的小诗",
    "喜庆": "家里有说有笑，就是最好的日子",
    "美丽": "今天的光，刚刚好落在你身上",
    "怀旧": "有些好时光，值得慢慢收藏",
    "清新": "风里有一点青草香，日子也轻了下来",
    "晚霞": "天色慢慢染红，今天也温柔收尾",
    "水墨": "把日子写进山水里，淡淡地留一笔",
    "田园": "小院、微风、家常饭，都是好日子",
    "海洋": "海风把烦恼吹远，只留下今天的好",
    "金色": "阳光落在肩上，平常日子也会发光"
  };
  const FALLBACK_BLESSINGS = {
    "文艺": "愿日子清欢，岁岁安然",
    "喜庆": "阖家欢乐，平安顺遂",
    "美丽": "愿美好常伴左右",
    "怀旧": "愿旧时光里的温暖，一直都在",
    "清新": "愿清风常伴，日日舒心",
    "晚霞": "愿每个黄昏，都有温暖相伴",
    "水墨": "愿岁月从容，心安如水",
    "田园": "愿小日子有滋有味，四季安然",
    "海洋": "愿心宽似海，平安自在",
    "金色": "愿金色岁月，温暖绵长"
  };
  const WEATHER_CODES = {
    0: "晴", 1: "多云", 2: "多云", 3: "阴", 45: "有雾", 48: "有雾",
    51: "毛毛雨", 53: "毛毛雨", 55: "毛毛雨", 56: "冻雨", 57: "冻雨",
    61: "小雨", 63: "中雨", 65: "大雨", 66: "冻雨", 67: "冻雨",
    71: "小雪", 73: "中雪", 75: "大雪", 77: "雪粒", 80: "阵雨", 81: "阵雨", 82: "暴雨",
    85: "阵雪", 86: "阵雪", 95: "雷阵雨", 96: "雷阵雨", 99: "雷阵雨"
  };
  const ARK_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
  const FONT_SERIF = '"Noto Serif SC","Songti SC","STSong","SimSun",serif';
  const FONT_SANS = '"Noto Sans SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei","WenQuanYi Micro Hei",sans-serif';

  const rgb = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a == null ? 1 : a})`;
  const font = (size, serif, bold) => `${bold ? "700" : "400"} ${size}px ${serif ? FONT_SERIF : FONT_SANS}`;
  const clamp = (s, n) => Array.from(String(s || "").trim()).slice(0, n).join("");

  // ---------------- 日期 ----------------
  const WEEKDAYS = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];
  function formatDateCN(d) {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[(d.getDay() + 6) % 7]}`;
  }

  // ---------------- EXIF ----------------
  function parseExif(buffer) {
    try {
      const dv = new DataView(buffer);
      if (dv.getUint16(0) !== 0xffd8) return {};
      let offset = 2;
      while (offset + 4 < dv.byteLength) {
        if (dv.getUint8(offset) !== 0xff) { offset += 1; continue; }
        const marker = dv.getUint8(offset + 1);
        if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
        if (marker === 0xda) break;
        const size = dv.getUint16(offset + 2);
        if (marker === 0xe1 && size > 8) {
          const start = offset + 4;
          const sig = String.fromCharCode(dv.getUint8(start), dv.getUint8(start + 1), dv.getUint8(start + 2), dv.getUint8(start + 3));
          if (sig === "Exif") {
            return parseTiff(dv, start + 6);
          }
        }
        offset += 2 + size;
      }
    } catch (e) { /* 忽略损坏的 EXIF */ }
    return {};
  }

  function parseTiff(dv, tiff) {
    const out = {};
    const little = dv.getUint16(tiff) === 0x4949;
    const u16 = (o) => dv.getUint16(o, little);
    const u32 = (o) => dv.getUint32(o, little);
    const ifd0 = tiff + u32(tiff + 4);
    const n0 = u16(ifd0);
    let exifIfd = 0, gpsIfd = 0;
    for (let i = 0; i < n0; i++) {
      const e = ifd0 + 2 + i * 12;
      const tag = u16(e);
      if (tag === 0x8769) exifIfd = tiff + u32(e + 8);
      if (tag === 0x8825) gpsIfd = tiff + u32(e + 8);
      if (tag === 0x0132 && !out.date) {
        const s = readAscii(dv, tiff, e);
        if (s) out.date = parseExifDate(s);
      }
    }
    if (exifIfd) {
      const n = u16(exifIfd);
      for (let i = 0; i < n; i++) {
        const e = exifIfd + 2 + i * 12;
        if (u16(e) === 0x9003) {
          const s = readAscii(dv, tiff, e);
          if (s) { const d = parseExifDate(s); if (d) out.date = d; }
        }
      }
    }
    if (gpsIfd) {
      const n = u16(gpsIfd);
      let latRef = "N", lonRef = "E", lat = null, lon = null;
      for (let i = 0; i < n; i++) {
        const e = gpsIfd + 2 + i * 12;
        const tag = u16(e);
        if (tag === 1) latRef = readAscii(dv, tiff, e) || "N";
        if (tag === 3) lonRef = readAscii(dv, tiff, e) || "E";
        if (tag === 2) lat = readRational3(dv, tiff, e, little);
        if (tag === 4) lon = readRational3(dv, tiff, e, little);
      }
      if (lat && lon) {
        out.gps = [
          latRef.toUpperCase().startsWith("S") ? -lat : lat,
          lonRef.toUpperCase().startsWith("W") ? -lon : lon
        ];
      }
    }
    return out;
  }

  function readAscii(dv, tiff, entry) {
    const count = dv.getUint32(entry + 4, dv.getUint16(tiff) === 0x4949);
    const vo = dv.getUint32(entry + 8, dv.getUint16(tiff) === 0x4949);
    const start = count <= 4 ? entry + 8 : tiff + vo;
    let s = "";
    for (let i = 0; i < count; i++) {
      const c = dv.getUint8(start + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s.trim();
  }

  function readRational3(dv, tiff, entry, little) {
    const vo = dv.getUint32(entry + 8, little);
    const base = tiff + vo;
    const parts = [];
    for (let i = 0; i < 3; i++) {
      const num = dv.getUint32(base + i * 8, little);
      const den = dv.getUint32(base + i * 8 + 4, little);
      parts.push(den ? num / den : 0);
    }
    return parts[0] + parts[1] / 60 + parts[2] / 3600;
  }

  function parseExifDate(s) {
    const m = String(s).match(/(\d{4})[:\-\/](\d{1,2})[:\-\/](\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4] || 0, +m[5] || 0, +m[6] || 0);
    return isNaN(d.getTime()) ? null : d;
  }

  // ---------------- 图片 ----------------
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function compressDataUrl(dataUrl, maxSide, quality) {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return c.toDataURL("image/jpeg", quality);
  }

  // ---------------- 定位 / 天气 ----------------
  function getCoords(timeout) {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve([p.coords.latitude, p.coords.longitude]),
        () => resolve(null),
        { timeout: timeout || 4000, maximumAge: 60000, enableHighAccuracy: false }
      );
    });
  }

  async function resolvePlaceWeather(coords, skipWeather) {
    let place = "", weather = "", lat = coords && coords[0], lon = coords && coords[1];
    try {
      const q = lat != null && lon != null
        ? `latitude=${lat}&longitude=${lon}&localityLanguage=zh`
        : "localityLanguage=zh";
      const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${q}`);
      if (r.ok) {
        const d = await r.json();
        place = d.city || d.locality || d.principalSubdivision || "";
        if (lat == null && d.latitude != null) { lat = d.latitude; lon = d.longitude; }
      }
    } catch (e) { /* 忽略 */ }
    if (!skipWeather && lat != null && lon != null) {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${Number(lat).toFixed(3)}&longitude=${Number(lon).toFixed(3)}&current=temperature_2m,weather_code&timezone=auto`);
        if (r.ok) {
          const d = await r.json();
          const cur = d.current || {};
          if (cur.weather_code != null) {
            const desc = WEATHER_CODES[cur.weather_code] || "好天气";
            weather = cur.temperature_2m != null ? `${desc} ${Math.round(cur.temperature_2m)}℃` : desc;
          }
        }
      } catch (e) { /* 忽略 */ }
    }
    return { place: clamp(place, 18), weather: clamp(weather, 18) };
  }

  // ---------------- AI（火山方舟，浏览器可跨域） ----------------
  function getConfig() {
    try {
      return JSON.parse(localStorage.getItem("snapstory.ark") || "{}");
    } catch (e) { return {}; }
  }
  function setConfig(cfg) {
    localStorage.setItem("snapstory.ark", JSON.stringify(cfg || {}));
  }

  function extractJson(text) {
    if (!text) return null;
    let t = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a >= 0 && b > a) t = t.slice(a, b + 1);
    try { return JSON.parse(t); } catch (e) { return null; }
  }

  function fallbackAnalysis(story) {
    let event = clamp(story, 24).replace(/^今天[，,、\s：:]*/, "").replace(/[。；;，,]+$/, "");
    if (!event) event = "今天的好光景";
    return {
      scene: "一张记录当下生活的照片",
      people: [],
      event,
      emotion: "温暖",
      keywords: [],
      caption: "",
      title: "",
      blessing: "",
      locationGuess: ""
    };
  }

  function normalizeAnalysis(data, story) {
    if (!data) return fallbackAnalysis(story);
    const kw = Array.isArray(data.keywords) ? data.keywords.map((k) => clamp(k, 8)).filter(Boolean).slice(0, 6) : [];
    return {
      scene: clamp(data.scene, 30) || "一张记录当下生活的照片",
      people: Array.isArray(data.people) ? data.people.slice(0, 4) : [],
      event: clamp(data.event, 24) || fallbackAnalysis(story).event,
      emotion: clamp(data.emotion, 6) || "温暖",
      keywords: kw,
      caption: clamp(data.caption, 34),
      title: clamp(data.title, 10),
      blessing: clamp(data.blessing, 20),
      locationGuess: clamp(data.location_guess || data.locationGuess, 18)
    };
  }

  async function analyzePhoto(photoDataUrl, story) {
    const cfg = getConfig();
    const base = fallbackAnalysis(story);
    if (!cfg.key || !cfg.model) {
      return { analysis: base, aiUsed: false, reason: "未配置 AI" };
    }
    try {
      const small = await compressDataUrl(photoDataUrl, 1024, 0.8);
      const prompt =
        "你是一位为老年人写纪念文案的中文编辑。请观察照片，结合老人写的事件，只输出一个 JSON 对象，不要解释、不要代码块。\n" +
        'JSON 字段：{"scene":"画面内容，20字内","people":["人物"],"event":"发生的事，24字内","emotion":"情绪，6字内","caption":"一句温柔的话，34字内","title":"4到8个字的小标题","blessing":"一句祝福，20字内","keywords":["关键词"]}\n' +
        `风格要求：${STYLE_GUIDE[stateStyle()] || STYLE_GUIDE["文艺"]}\n` +
        `老人写的事件：${story || "（没有填写文字，请只根据照片）"}\n` +
        "要求：所有内容使用简体中文，口语化、温暖，不要使用引号。";
      const res = await fetch(ARK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.key },
        body: JSON.stringify({
          model: cfg.model,
          temperature: 0.35,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: small } }
            ]
          }]
        })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${txt.slice(0, 120)}`);
      }
      const data = await res.json();
      const content = data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content : "";
      const parsed = extractJson(content);
      if (!parsed) throw new Error("模型没有返回可解析的 JSON");
      return { analysis: normalizeAnalysis(parsed, story), aiUsed: true };
    } catch (e) {
      console.warn("AI 调用失败：", e);
      return { analysis: base, aiUsed: false, reason: e.message || "AI 调用失败" };
    }
  }

  // 当前风格（由 app.js 设置）
  let currentStyle = "文艺";
  function setCurrentStyle(s) { currentStyle = s; }
  function stateStyle() { return currentStyle; }

  // ---------------- 海报绘制 ----------------
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function wrapText(ctx, text, maxWidth, maxLines) {
    const chars = Array.from(String(text || ""));
    const lines = [];
    let line = "";
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = chars[i];
        if (lines.length === maxLines) {
          let rest = line + chars.slice(i + 1).join("");
          while (rest && ctx.measureText(line + "…").width > maxWidth) line = Array.from(line).slice(0, -1).join("");
          lines[maxLines - 1] = line + "…";
          return lines;
        }
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawBlock(ctx, text, x, y, fontStr, color, maxWidth, lineHeight, maxLines) {
    ctx.font = fontStr;
    const lines = wrapText(ctx, text, maxWidth, maxLines);
    ctx.fillStyle = color;
    lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  }

  function drawCover(ctx, img, x, y, w, h, cy) {
    const ir = img.width / img.height, br = w / h;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (ir > br) { sw = img.height * br; sx = (img.width - sw) / 2; }
    else { sh = img.width / br; sy = (img.height - sh) * (cy == null ? 0.42 : cy); }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function makeQrCanvas(text, size) {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const c = document.createElement("canvas");
    const s = size || 640;
    c.width = s; c.height = s;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, s, s);
    const margin = 4;
    const cell = (s - margin * 2) / count;
    ctx.fillStyle = "#111";
    for (let r = 0; r < count; r++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(r, col)) {
          ctx.fillRect(margin + col * cell, margin + r * cell, Math.ceil(cell), Math.ceil(cell));
        }
      }
    }
    return c;
  }

  function pageUrlFor(recipe) {
    const u = new URL("view.html", location.href);
    u.hash = "id=" + encodeURIComponent(recipe.id) + "&d=" + encodePayload(recipe);
    if (recipe.syncKey) u.hash += "&k=" + encodeURIComponent(recipe.syncKey);
    return u.href;
  }

  function packRecipe(r) {
    return {
      s: r.style, dt: r.dateText, w: r.weather || "", loc: r.location || "",
      t: r.title, c: r.caption, e: r.event, b: r.blessing, st: clamp(r.story, 80)
    };
  }

  function encodePayload(r) {
    const bytes = new TextEncoder().encode(JSON.stringify(packRecipe(r)));
    let bin = "";
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodePayload(s) {
    try {
      let b64 = String(s).replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) { return null; }
  }

  async function renderPoster(canvas, recipe) {
    const W = 1080, H = 1820;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    const t = THEMES[recipe.style] || THEMES["文艺"];
    const accent = t.accent, text = t.text, soft = t.soft;

    // 背景
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, rgb(t.bg1));
    bg.addColorStop(1, rgb(t.bg2));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 日期
    ctx.fillStyle = rgb(text);
    ctx.font = font(40, t.serif, true);
    ctx.fillText(recipe.dateText || "", 90, 58);

    // 天气胶囊
    if (recipe.weather) {
      ctx.font = font(28, false, false);
      const tw = ctx.measureText(recipe.weather).width;
      const pw = tw + 44;
      const px = W - 90 - pw;
      ctx.fillStyle = t.chip;
      roundRect(ctx, px, 54, pw, 54, 27);
      ctx.fill();
      ctx.fillStyle = rgb(t.chipText || text);
      ctx.fillText(recipe.weather, px + 22, 64);
    }

    // 地点
    if (recipe.location) {
      ctx.fillStyle = rgb(accent, 0.78);
      ctx.beginPath();
      ctx.arc(97, 129, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = font(28, false, false);
      ctx.fillStyle = rgb(soft);
      ctx.fillText(recipe.location, 114, 116);
    }

    // 照片相框 + 阴影
    const fx = 78, fy = 178, fw = 924, fh = 924;
    ctx.save();
    ctx.shadowColor = `rgba(30,22,14,${recipe.style === "喜庆" ? 0.45 : 0.32})`;
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = rgb(t.frame);
    roundRect(ctx, fx, fy, fw, fh, 34);
    ctx.fill();
    ctx.restore();

    // 照片
    try {
      const img = await loadImage(recipe.photo);
      ctx.save();
      roundRect(ctx, fx + 20, fy + 20, fw - 40, fh - 40, 22);
      ctx.clip();
      drawCover(ctx, img, fx + 20, fy + 20, fw - 40, fh - 40, 0.42);
      if (recipe.style === "怀旧") {
        ctx.fillStyle = "rgba(126,86,46,0.06)";
        ctx.fillRect(fx + 20, fy + 20, fw - 40, fh - 40);
      }
      ctx.restore();
    } catch (e) {
      ctx.fillStyle = "#dcd6ca";
      roundRect(ctx, fx + 20, fy + 20, fw - 40, fh - 40, 22);
      ctx.fill();
    }

    // 标题
    let titleSize = 68;
    ctx.font = font(titleSize, t.serif, true);
    const title = recipe.title || FALLBACK_TITLES[recipe.style] || "美好时光";
    while (ctx.measureText(title).width > 890 && titleSize > 44) {
      titleSize -= 4;
      ctx.font = font(titleSize, t.serif, true);
    }
    ctx.fillStyle = rgb(accent);
    ctx.fillText(title, 90, 1136);

    // 一句话文案
    drawBlock(ctx, recipe.caption || "", 92, 1232, font(36, t.serif, false), rgb(text), 900, 52, 2);

    // 事件梗概
    if (recipe.event) {
      drawBlock(ctx, "今天 · " + recipe.event, 92, 1342, font(29, false, false), rgb(soft), 880, 42, 2);
    }

    // 分隔线
    ctx.strokeStyle = rgb(accent, 0.27);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(92, 1448);
    ctx.lineTo(720, 1448);
    ctx.stroke();

    // 家人留言
    ctx.font = font(28, false, true);
    ctx.fillStyle = rgb(accent);
    ctx.fillText("家人的留言", 92, 1474);

    const comments = Array.isArray(recipe.comments) ? recipe.comments : [];
    const commentFont = font(29, false, false);
    let y = 1524, totalLines = 0, shown = 0, overflow = false;
    if (comments.length) {
      for (const c of comments.slice(0, 3)) {
        const name = clamp(c.name || "家人", 10);
        const content = clamp(c.content || "", 120);
        const lines = wrapText(ctx, `${name}：${content}`, 610, 2);
        if (totalLines + lines.length > 4) { overflow = true; break; }
        ctx.font = commentFont;
        ctx.fillStyle = rgb(text, 0.9);
        lines.forEach((line) => {
          ctx.fillText(line, 92, y);
          y += 41;
        });
        totalLines += lines.length;
        shown += 1;
      }
      if (comments.length > shown) overflow = true;
      if (overflow) {
        ctx.font = font(21, false, false);
        ctx.fillStyle = rgb(soft);
        ctx.fillText(`还有 ${comments.length - shown} 条留言，扫码查看`, 92, 1694);
      }
    } else {
      ctx.font = font(27, false, false);
      ctx.fillStyle = rgb(soft);
      ctx.fillText("还没有留言，", 92, 1524);
      ctx.fillText("扫码写下第一句话吧", 92, 1566);
    }

    // 底部祝福
    if (!comments.length || (!overflow && totalLines <= 3)) {
      drawBlock(ctx, recipe.blessing || "", 92, 1688, font(30, t.serif, false), rgb(accent), 600, 42, 2);
    }

    // 品牌
    ctx.font = font(22, false, false);
    ctx.fillStyle = rgb(soft, 0.75);
    ctx.fillText("记忆相册 · 把今天留成一幅画", 92, 1768);

    // 二维码卡片
    ctx.save();
    ctx.shadowColor = "rgba(30,22,14,0.28)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = "#fff";
    roundRect(ctx, 742, 1470, 280, 320, 28);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = rgb(accent, 0.16);
    ctx.lineWidth = 2;
    roundRect(ctx, 742, 1470, 280, 320, 28);
    ctx.stroke();

    try {
      const qrCanvas = makeQrCanvas(pageUrlFor(recipe), 640);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qrCanvas, 782, 1496, 200, 200);
      ctx.imageSmoothingEnabled = true;
    } catch (e) {
      ctx.fillStyle = "#f5f3ee";
      ctx.fillRect(782, 1496, 200, 200);
    }

    ctx.textAlign = "center";
    ctx.font = font(25, false, true);
    ctx.fillStyle = "rgb(45,40,34)";
    ctx.fillText("扫码看故事", 882, 1712);
    ctx.font = font(21, false, false);
    ctx.fillStyle = "rgb(130,120,108)";
    ctx.fillText("给TA留句话", 882, 1751);
    ctx.textAlign = "left";

    return canvas;
  }

  // ---------------- 本机存储 ----------------
  const STORE = "snapstory.posters.v1";
  function loadAll() {
    try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (e) { return {}; }
  }
  function savePoster(recipe) {
    const all = loadAll();
    all[recipe.id] = recipe;
    const ids = Object.keys(all).sort((a, b) => (all[a].createdAt || 0) - (all[b].createdAt || 0));
    while (ids.length > 6) delete all[ids.shift()];
    try {
      localStorage.setItem(STORE, JSON.stringify(all));
      return true;
    } catch (e) {
      // 空间不足，删掉最旧的再试
      while (ids.length > 1) {
        delete all[ids.shift()];
        try { localStorage.setItem(STORE, JSON.stringify(all)); return true; } catch (e2) {}
      }
      return false;
    }
  }
  function getPoster(id) { return loadAll()[id] || null; }
  function listPosters() {
    return Object.values(loadAll()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  function updatePoster(recipe) { return savePoster(recipe); }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function newSyncKey() {
    const bytes = new Uint8Array(12);
    if (global.crypto && global.crypto.getRandomValues) {
      global.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    let bin = "";
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  global.SnapStory = {
    THEMES, RANDOM_STYLES, FALLBACK_TITLES, FALLBACK_CAPTIONS, FALLBACK_BLESSINGS,
    formatDateCN, parseExif, loadImage, fileToDataUrl, compressDataUrl,
    getCoords, resolvePlaceWeather, analyzePhoto, getConfig, setConfig,
    setCurrentStyle, renderPoster, pageUrlFor, encodePayload, decodePayload,
    savePoster, getPoster, listPosters, updatePoster, newId, newSyncKey, clamp, font, rgb, makeQrCanvas
  };
})(window);
