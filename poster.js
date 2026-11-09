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
  const STYLE_LEADS = {
    "文艺": "日子慢慢", "喜庆": "家里有笑", "美丽": "光落在身上", "怀旧": "旧时光里",
    "清新": "风轻轻的", "晚霞": "天色正好", "水墨": "山水淡淡", "田园": "小院家常",
    "海洋": "海风轻轻", "金色": "阳光暖暖"
  };
  const MOOD_TAILS = {
    "欢喜": "心里也跟着亮起来",
    "想念": "有些想念藏在心里",
    "安静": "心也安静下来",
    "热闹": "日子过得热气腾腾",
    "温暖": "平常的一天也有温度",
    "清新": "适合把今天好好记住",
    "平静": "不慌不忙就很好"
  };
  const MOOD_WORDS = {
    "欢喜": ["开心", "高兴", "笑", "快乐", "幸福", "喜欢", "爱", "团聚", "回家", "生日", "过节", "过年", "孙", "孩子", "老伴", "朋友", "旅行"],
    "想念": ["想念", "思念", "怀念", "以前", "从前", "当年", "故乡", "妈妈", "爸爸", "老照片"],
    "热闹": ["热闹", "聚会", "团圆", "全家", "婚礼", "宴", "客人"],
    "安静": ["安静", "散步", "晒太阳", "喝茶", "午后", "慢慢", "公园", "风"],
    "温暖": ["温暖", "陪伴", "家人", "一起", "吃饭", "家"],
    "清新": ["花", "草", "树", "山", "水", "海", "云", "春天"]
  };
  const MOOD_BLESSINGS = {
    "欢喜": ["愿这份欢喜，常伴你左右", "愿今天的好心情，一直延续下去", "把这份开心留住，日子就有光", "愿笑声常在，好事常来"],
    "想念": ["愿想念的人，也正想着你", "愿这份惦记，被远方的人收到", "愿旧时光里的温暖，一直陪着你", "愿想念有回音，牵挂有归处"],
    "安静": ["愿日子清清凉凉，心里安安稳稳", "愿这一份安静，陪你慢慢过", "不慌不忙的日子，最养人", "愿心里常有这样安静的时刻"],
    "热闹": ["愿家里常热闹，心里常团圆", "愿这样的热闹，常在你家", "人齐了，日子就暖了", "愿笑声常满屋，亲人常相伴"],
    "温暖": ["愿有人陪你，把平常日子过暖", "愿这份温暖，陪你很久", "家常日子，也有人惦记", "愿平常的一天，也有温度"],
    "清新": ["愿清风常来，日子清清亮亮", "愿每天都有这样清爽的好心情", "风轻轻的，日子也轻轻的", "愿这一抹清新，留在今天"],
    "平静": ["愿日子不慌不忙，心里安安稳稳", "愿心里常有这样的平静", "慢一点，日子更有味", "愿今天的好，慢慢留在心里"]
  };
  const OBJECT_BLESSINGS = [
    { re: /风扇|空调|凉风/, items: ["愿这小风扇，吹来一屋清凉", "小风扇转一转，日子也清清爽爽", "愿这阵凉风，陪你慢慢过夏天", "风扇轻轻转，心里松松快快"] },
    { re: /花|开花|鲜花/, items: ["愿这束花，开成日子的好心情", "花开正好，愿你也正好", "愿这抹花香，留在平常日子里"] },
    { re: /茶|喝茶/, items: ["愿这杯茶，陪你慢慢过一天", "茶香淡淡，日子也慢慢", "愿你有茶有闲，心里安然"] },
    { re: /饭|菜|饺子|面/, items: ["愿这顿饭，吃出家的热乎气", "家常饭菜，最暖人心", "愿有人陪你，好好吃饭"] },
    { re: /蛋糕|生日/, items: ["愿这一岁，平安喜乐", "愿生日这天，笑声围着你", "愿新的一岁，顺顺当当"] },
    { re: /照片|相片/, items: ["愿这张照片，留住今天的好", "把今天收好，以后再慢慢看", "愿这一刻，值得常常想起"] },
    { re: /孙子|孙女|孩子|老伴|全家/, items: ["愿身边的人，常笑常相伴", "一家人在一起，就是好日子", "愿这样的相聚，常有", "愿家里有笑，心里有暖"] }
  ];
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

  async function photoTone(photoDataUrl) {
    if (!photoDataUrl) return null;
    const img = await loadImage(photoDataUrl);
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data;
    let r = 0, g = 0, b = 0, lum = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      lum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      n += 1;
    }
    return {
      warm: r / n - b / n,
      green: g / n - (r / n + b / n) / 2,
      bright: lum / n / 255
    };
  }

  function detectMood(story, tone) {
    const text = String(story || "");
    let best = "";
    let bestHits = 0;
    Object.keys(MOOD_WORDS).forEach((mood) => {
      const hits = MOOD_WORDS[mood].reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
      if (hits > bestHits) {
        best = mood;
        bestHits = hits;
      }
    });
    if (best) return best;
    if (tone) {
      if (tone.bright > 0.66 && tone.warm > 8) return "温暖";
      if (tone.green > 4) return "清新";
      if (tone.bright < 0.36) return "安静";
      if (tone.warm > 16) return "温暖";
      if (tone.bright > 0.55) return "欢喜";
    }
    return "平静";
  }

  function pickCopy(pool, round) {
    const list = Array.isArray(pool) && pool.length ? pool : ["愿今天的好，一直留在身边"];
    return list[Math.abs(Number(round) || 0) % list.length];
  }

  function localBlessing(event, mood, round) {
    const text = String(event || "");
    for (const item of OBJECT_BLESSINGS) {
      if (item.re.test(text)) return pickCopy(item.items, round);
    }
    return pickCopy(MOOD_BLESSINGS[mood], round);
  }

  function localScene(event, tone) {
    const text = String(event || "");
    if (/风扇|空调/.test(text)) return "一台带来凉风的小风扇";
    if (/花/.test(text)) return "一束开得正好的花";
    if (/茶/.test(text)) return "一杯慢慢喝的茶";
    if (/饭|菜|饺子|面/.test(text)) return "一桌家常饭菜";
    if (/孙子|孙女|孩子|老伴|全家/.test(text)) return "和家里人在一起的画面";
    if (tone) {
      if (tone.green > 4) return "有绿植和自然光的日常";
      if (tone.bright > 0.62) return "光线明亮的日常";
      if (tone.warm > 16) return "色调温暖的日常";
    }
    return "一张记录当下生活的照片";
  }

  async function localAnalysis(photoDataUrl, story, round) {
    const base = fallbackAnalysis(story);
    let tone = null;
    try {
      tone = await photoTone(photoDataUrl);
    } catch (e) { /* 照片读不出颜色时只按文字判断 */ }
    const mood = detectMood(story, tone);
    const lead = STYLE_LEADS[stateStyle()] || "";
    const tail = MOOD_TAILS[mood] || "";
    if (lead && tail) base.caption = `${lead}，${tail}`;
    base.emotion = mood;
    base.scene = localScene(base.event, tone);
    base.blessing = localBlessing(base.event, mood, round);
    return base;
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

  async function analyzePhoto(photoDataUrl, story, round) {
    const cfg = getConfig();
    if (!cfg.key || !cfg.model) {
      const base = await localAnalysis(photoDataUrl, story, round);
      return { analysis: base, aiUsed: false, reason: "未配置 AI" };
    }
    try {
      const small = await compressDataUrl(photoDataUrl, 1024, 0.8);
      const variantNote = Number(round) > 0
        ? `这是第 ${Number(round) + 1} 版文案，请换一个角度和说法，主文案不要重复上一版。\n`
        : "";
      const prompt =
        "你是一位为老年人写纪念文案的中文编辑。请先仔细看照片：画面里是谁、在哪里、在做什么，光线、颜色和动作给人什么感觉；再结合老人写下的事件，判断他/她此刻的情绪，可能是开心、满足、平静、想念、热闹，也可能是淡淡的伤感。\n" +
        "文案要贴着照片里的具体细节和这种情绪写，不要写放之四海而皆准的空话。不同风格只改变语气和说法，内容仍然来自这张照片和这段心情。\n" +
        variantNote +
        "只输出一个 JSON 对象，不要解释、不要代码块。\n" +
        'JSON 字段：{"scene":"照片里具体看到的内容，20字内","people":["人物"],"event":"发生的事，24字内","emotion":"从照片和文字里感受到的情绪，6字内","caption":"结合画面细节和情绪写一句温柔的话，34字内","title":"根据画面和情绪起4到8个字的小标题","blessing":"海报主文案，顺着情绪写一句祝福，最好带一个照片里的具体细节，20字内","keywords":["关键词"]}\n' +
        `风格要求：${STYLE_GUIDE[stateStyle()] || STYLE_GUIDE["文艺"]}\n` +
        `老人写的事件：${story || "（没有填写文字，请只根据照片）"}\n` +
        "要求：所有内容使用简体中文，口语化、温暖，不要使用引号；不要编造照片里看不出来的人名、地点和事件。";
      const res = await fetch(ARK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.key },
        body: JSON.stringify({
          model: cfg.model,
          temperature: 0.55,
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
      const base = await localAnalysis(photoDataUrl, story, round);
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

    // 主文案：祝福语放在原来标题的位置
    const mainLine = recipe.blessing || FALLBACK_BLESSINGS[recipe.style] || "愿今天的好，一直留在身边";
    drawBlock(ctx, mainLine, 90, 1124, font(50, t.serif, true), rgb(accent), 900, 64, 2);

    // 事件梗概
    if (recipe.event) {
      const eventLine = /^今天/.test(recipe.event) ? recipe.event : "今天 · " + recipe.event;
      drawBlock(ctx, eventLine, 92, 1286, font(29, false, false), rgb(soft), 880, 42, 2);
    }

    // 分隔线
    ctx.strokeStyle = rgb(accent, 0.27);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(92, 1366);
    ctx.lineTo(720, 1366);
    ctx.stroke();

    // 家人留言
    ctx.font = font(28, false, true);
    ctx.fillStyle = rgb(accent);
    ctx.fillText("家人的留言", 92, 1392);

    const comments = Array.isArray(recipe.comments) ? recipe.comments : [];
    const commentFont = font(29, false, false);
    let y = 1442, totalLines = 0, shown = 0, overflow = false;
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
      ctx.fillText("还没有留言，", 92, 1442);
      ctx.fillText("扫码写下第一句话吧", 92, 1484);
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
