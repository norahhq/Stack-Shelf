/* stackshelf — static app, no build step.
   all persistence goes through `store` below. swap it for a real backend
   (see README) to get true multi-user accounts and global popularity. */
(() => {
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const TYPES = ["book","video","course","article","website","paper","repo","podcast"];
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------- sample community data (replace with backend counts) ---------- */
const COMMUNITY = [
 {title:"cs50: introduction to computer science",url:"https://cs50.harvard.edu/x/",domain:"computer science",type:"course",count:1284},
 {title:"machine learning specialization",url:"https://www.coursera.org/specializations/machine-learning-introduction",domain:"machine learning",type:"course",count:1102},
 {title:"attention is all you need",url:"https://arxiv.org/abs/1706.03762",domain:"machine learning",type:"paper",count:964},
 {title:"designing data-intensive applications",url:"https://dataintensive.net",domain:"systems",type:"book",isbn:"9781449373320",count:887},
 {title:"neural networks, 3blue1brown",url:"https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi",domain:"machine learning",type:"video",count:842},
 {title:"the missing semester of your cs education",url:"https://missing.csail.mit.edu",domain:"computer science",type:"course",count:703},
 {title:"neural networks: zero to hero",url:"https://karpathy.ai/zero-to-hero.html",domain:"machine learning",type:"course",count:655},
 {title:"the pragmatic programmer",url:"https://pragprog.com/titles/tpp20/",domain:"software engineering",type:"book",isbn:"9780135957059",count:611},
 {title:"deep learning",url:"https://www.deeplearningbook.org",domain:"machine learning",type:"book",isbn:"9780262035613",count:578},
 {title:"khan academy: linear algebra",url:"https://www.khanacademy.org/math/linear-algebra",domain:"mathematics",type:"course",count:512},
 {title:"structure and interpretation of computer programs",url:"https://mitp-content-server.mit.edu/books/content/sectbyfn/books_pres_0/6515/sicp.zip/index.html",domain:"computer science",type:"book",isbn:"9780262510875",count:447},
 {title:"clean code",url:"https://www.oreilly.com/library/view/clean-code-a/9780136083238/",domain:"software engineering",type:"book",isbn:"9780132350884",count:390}
];

/* ---------- storage adapter ---------- */
const ls = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
const store = {
  users: () => ls.get("ss:users", {}),
  saveUsers: u => ls.set("ss:users", u),
  shelf: u => ls.get("ss:shelf:" + u, []),
  saveShelf: (u, items) => ls.set("ss:shelf:" + u, items),
  session: () => ls.get("ss:session", null),
  setSession: u => ls.set("ss:session", u)
};

/* ---------- auth (local demo: password is salted + hashed, but it never leaves the browser) ---------- */
async function hash(str){
  if(window.crypto && crypto.subtle){
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
  }
  let h = 5381; for(const c of str) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return String(h);
}
let mode = "in", user = null, items = [], fDom = "all", pDom = "all", editing = null, rate = 0, coverData = "";

function setMode(m){
  mode = m;
  $("#go").textContent = m === "in" ? "sign in" : "create account";
  $("#swap").textContent = m === "in" ? "new here? create an account" : "have an account? sign in";
  $("#p").autocomplete = m === "in" ? "current-password" : "new-password";
  $("#err").textContent = "";
}
$("#swap").onclick = () => setMode(mode === "in" ? "up" : "in");
$("#authform").onsubmit = async e => {
  e.preventDefault();
  const name = $("#u").value.trim().toLowerCase(), pw = $("#p").value, users = store.users();
  if(!/^[a-z0-9_]{3,20}$/.test(name)) return $("#err").textContent = "username: 3–20 letters, numbers or underscores";
  if(pw.length < 6) return $("#err").textContent = "password needs at least 6 characters";
  if(mode === "up"){
    if(users[name]) return $("#err").textContent = "that username is taken";
    const salt = Math.random().toString(36).slice(2);
    users[name] = {salt, hash: await hash(salt + pw)};
    store.saveUsers(users);
  }else{
    const u = users[name];
    if(!u || u.hash !== await hash(u.salt + pw)) return $("#err").textContent = "wrong username or password";
  }
  store.setSession(name); $("#p").value = ""; boot();
};
$("#out").onclick = () => { store.setSession(null); boot(); };

/* ---------- covers ---------- */
function hsh(s){ let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function art(seed){
  const h = hsh(seed), v = h % 5, a = (h >> 3) % 6 + 4, c = "var(--fg)"; let g = "";
  if(v == 0) for(let i = 0; i < 14; i++) g += `<line x1="0" y1="${i*a*2}" x2="200" y2="${i*a*2 + h % 40}" stroke="${c}" stroke-width=".7"/>`;
  if(v == 1) for(let i = 1; i < 9; i++) g += `<circle cx="${60 + h % 80}" cy="100" r="${i*a}" fill="none" stroke="${c}" stroke-width=".7"/>`;
  if(v == 2) for(let x = 0; x < 8; x++) for(let y = 0; y < 10; y++) if((h >> ((x + y*3) % 24)) & 1) g += `<rect x="${x*25+3}" y="${y*20+3}" width="19" height="14" fill="${c}" opacity=".85"/>`;
  if(v == 3) for(let i = -10; i < 14; i++) g += `<line x1="${i*a*2}" y1="0" x2="${i*a*2+120}" y2="300" stroke="${c}" stroke-width=".7"/>`;
  if(v == 4) for(let i = 0; i < 8; i++) g += `<rect x="${i*a}" y="${i*a*1.5}" width="${190-i*a*2}" height="${190-i*a*2}" fill="none" stroke="${c}" stroke-width=".8"/>`;
  return `<svg viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice">${g}</svg>`;
}
function ytId(url){
  try{ const u = new URL(url);
    if(u.hostname === "youtu.be") return u.pathname.slice(1);
    if(/youtube\.com$/.test(u.hostname.replace("www.", "")) && u.pathname === "/watch") return u.searchParams.get("v");
  }catch(e){} return null;
}
function coverSrc(it){
  const c = (it.cover || "").trim();
  if(c){
    if(/^[\d-]{10,17}$/.test(c)) return `https://covers.openlibrary.org/b/isbn/${c.replace(/-/g, "")}-L.jpg?default=false`;
    return c;
  }
  if(it.isbn) return `https://covers.openlibrary.org/b/isbn/${it.isbn}-L.jpg?default=false`;
  const y = it.type === "video" && ytId(it.url); if(y) return `https://img.youtube.com/vi/${y}/hqdefault.jpg`;
  return "";
}
function coverHTML(it){
  const src = coverSrc(it), seed = esc(it.title + (it.domain || ""));
  return `<div class="cv" data-seed="${seed}" data-t="${esc(it.title)}">` +
    (src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : art(seed) + `<span class="t">${esc(it.title)}</span>`) + `</div>`;
}
function fixCovers(root){
  root.querySelectorAll(".cv img").forEach(img => {
    img.onerror = () => { const d = img.parentNode; d.innerHTML = art(d.dataset.seed) + `<span class="t">${d.dataset.t}</span>`; };
  });
}

/* ---------- shelf ---------- */
const stars = n => "★".repeat(n) + "☆".repeat(5 - n);
function renderShelf(){
  const doms = ["all", ...new Set(items.map(i => i.domain).filter(Boolean))];
  if(!doms.includes(fDom)) fDom = "all";
  $("#filters").innerHTML = doms.map(d => `<button class="link ${d == fDom ? "on" : ""}" data-d="${esc(d)}">${esc(d)}</button>`).join("");
  $("#doms").innerHTML = doms.slice(1).map(d => `<option value="${esc(d)}">`).join("");
  const list = items.filter(i => fDom == "all" || i.domain == fDom).sort((a, b) => b.id - a.id);
  $("#grid").innerHTML = list.length ? list.map(i =>
    `<div class="item" data-id="${i.id}"><div class="cover">${coverHTML(i)}</div>
     <div class="meta"><span class="s">${i.rating ? stars(i.rating) : ""}</span><span>${i.status == "done" ? "finished" : i.status == "want" ? "want to" : "learning"}</span></div></div>`).join("")
    : `<div class="empty">nothing here yet. log something, or find it in <button class="link" id="goPop" style="color:var(--fg);text-decoration:underline">popular</button>.</div>`;
  fixCovers($("#grid"));
  const n = s => items.filter(i => i.status == s).length;
  $("#stats").textContent = `${items.length} logged · ${n("learning")} learning · ${n("done")} finished`;
}
$("#filters").onclick = e => { const b = e.target.closest("button"); if(b){ fDom = b.dataset.d; renderShelf(); } };
$("#grid").onclick = e => {
  if(e.target.id === "goPop") return show("popular");
  const c = e.target.closest(".item"); if(c) openModal(items.find(i => i.id == c.dataset.id));
};

/* ---------- popular ---------- */
function urlKey(url){
  try{ const u = new URL(url); let k = u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "");
    const v = u.searchParams.get("v"), l = u.searchParams.get("list");
    if(v) k += "?v=" + v; else if(l) k += "?list=" + l; return k.toLowerCase();
  }catch(e){ return String(url || "").toLowerCase(); }
}
function popular(){
  const map = new Map();
  COMMUNITY.forEach(c => map.set(urlKey(c.url), {...c, n: c.count}));
  Object.keys(store.users()).forEach(u => {
    const seen = new Set();
    store.shelf(u).forEach(it => {
      if(!it.url) return; const k = urlKey(it.url); if(seen.has(k)) return; seen.add(k);
      const row = map.get(k);
      if(row) row.n++; else map.set(k, {title: it.title, url: it.url, domain: it.domain, type: it.type, cover: it.cover, isbn: it.isbn, n: 1});
    });
  });
  return [...map.entries()].map(([k, v]) => ({...v, k})).sort((a, b) => b.n - a.n);
}
function renderPopular(){
  const all = popular(), doms = ["all", ...new Set(all.map(i => i.domain).filter(Boolean))];
  if(!doms.includes(pDom)) pDom = "all";
  $("#pfilters").innerHTML = doms.map(d => `<button class="link ${d == pDom ? "on" : ""}" data-d="${esc(d)}">${esc(d)}</button>`).join("");
  const mine = new Set(items.map(i => urlKey(i.url))), max = all[0] ? all[0].n : 1;
  const list = all.filter(i => pDom == "all" || i.domain == pDom);
  $("#plist").innerHTML = list.map((i, idx) =>
    `<div class="prow"><span class="rank">${idx + 1}</span><div class="cover">${coverHTML(i)}</div>
     <div><div class="ti"><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.title)}</a></div>
       <div class="mut small">${esc(i.domain || "")} · ${esc(i.type || "")}</div>
       <div class="bar2" style="width:${Math.max(4, i.n / max * 100)}%"></div></div>
     <span class="n mut">${i.n.toLocaleString()} ${i.n == 1 ? "person" : "people"}</span>
     ${mine.has(i.k) ? `<span class="mut small">on your shelf</span>` : `<button class="btn" data-k="${esc(i.k)}">+ add</button>`}</div>`).join("");
  fixCovers($("#plist"));
  $("#pnote").textContent = "counts include sample data in local mode. connect a backend to rank across real users.";
  $("#plist").dataset.cache = "1"; window.__pop = all;
}
$("#pfilters").onclick = e => { const b = e.target.closest("button"); if(b){ pDom = b.dataset.d; renderPopular(); } };
$("#plist").onclick = e => {
  const b = e.target.closest("button[data-k]"); if(!b) return;
  const p = window.__pop.find(x => x.k === b.dataset.k); if(!p) return;
  items.push({id: Date.now(), title: p.title, url: p.url, domain: p.domain || "general", type: p.type || "article", status: "want", rating: 0, note: "", cover: p.cover || "", isbn: p.isbn || ""});
  save(); renderPopular(); renderShelf();
};

/* ---------- modal ---------- */
$("#f_type").innerHTML = TYPES.map(t => `<option>${t}</option>`).join("");
const drawRate = () => $("#f_rate").innerHTML = [1,2,3,4,5].map(n => `<span class="${n <= rate ? "on" : ""}" data-n="${n}">★</span>`).join("");
$("#f_rate").onclick = e => { const n = e.target.dataset.n; if(n){ rate = rate == +n ? 0 : +n; drawRate(); } };
function draft(){
  return {title: $("#f_title").value || "untitled", domain: $("#f_dom").value, type: $("#f_type").value,
          url: $("#f_url").value.trim(), cover: coverData || $("#f_cover").value.trim()};
}
function preview(){ $("#pv").innerHTML = coverHTML(draft()); fixCovers($("#pv")); }
["f_title","f_dom","f_type","f_cover"].forEach(id => $("#" + id).addEventListener("input", () => { if(id === "f_cover") coverData = ""; preview(); }));
$("#f_url").addEventListener("input", () => {
  const u = $("#f_url").value.trim(); let t = "";
  if(/youtu|vimeo/.test(u)) t = "video"; else if(/github\.com|gitlab/.test(u)) t = "repo";
  else if(/arxiv|\.pdf$/.test(u)) t = "paper"; else if(/coursera|edx|udemy|khanacademy|cs50|ocw/.test(u)) t = "course";
  else if(/medium|substack|dev\.to|blog/.test(u)) t = "article"; else if(/spotify|podcast/.test(u)) t = "podcast";
  if(t) $("#f_type").value = t;
  try{ $("#f_title").placeholder = new URL(u).hostname.replace("www.", ""); }catch(e){}
  preview();
});
function openModal(it){
  editing = it || null;
  $("#mt").textContent = it ? "edit entry" : "log a resource";
  $("#f_url").value = it?.url || ""; $("#f_title").value = it?.title || "";
  $("#f_dom").value = it?.domain || (fDom != "all" ? fDom : ""); $("#f_type").value = it?.type || "book";
  $("#f_status").value = it?.status || "learning"; $("#f_note").value = it?.note || "";
  coverData = it && it.cover && it.cover.startsWith("data:") ? it.cover : "";
  $("#f_cover").value = it ? (coverData ? "" : (it.cover || it.isbn || "")) : "";
  rate = it?.rating || 0; drawRate(); preview();
  $("#del").hidden = !it; $("#open").hidden = !(it && it.url);
  $("#modal").classList.add("open");
}
const close = () => $("#modal").classList.remove("open");
$("#addbtn").onclick = () => openModal(); $("#cancel").onclick = close;
$("#modal").onclick = e => { if(e.target.id == "modal") close(); };
document.addEventListener("keydown", e => { if(e.key == "Escape") close(); });
$("#open").onclick = () => { if(editing && /^https?:/.test(editing.url)) window.open(editing.url, "_blank", "noopener"); };
$("#del").onclick = () => { items = items.filter(i => i !== editing); save(); close(); renderShelf(); };
$("#save").onclick = () => {
  let url = $("#f_url").value.trim(); if(url && !/^https?:\/\//.test(url)) url = "https://" + url;
  let title = $("#f_title").value.trim();
  if(!title){ try{ title = new URL(url).hostname.replace("www.", ""); }catch(e){} }
  if(!title) return $("#f_title").focus();
  const c = coverData || $("#f_cover").value.trim();
  const o = {title, url, domain: $("#f_dom").value.trim().toLowerCase() || "general", type: $("#f_type").value,
             status: $("#f_status").value, rating: rate, note: $("#f_note").value.trim(), cover: c};
  if(editing) Object.assign(editing, o); else items.push({id: Date.now(), ...o});
  save(); close(); renderShelf();
};
$("#covbtn").onclick = () => $("#covfile").click();
$("#covfile").onchange = e => {
  const f = e.target.files[0]; if(!f) return;
  const img = new Image(), r = new FileReader();
  r.onload = () => { img.onload = () => {
    const cv = document.createElement("canvas"), s = Math.min(1, 400 / img.width);
    cv.width = img.width * s; cv.height = img.height * s; cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    coverData = cv.toDataURL("image/jpeg", .8); $("#f_cover").value = ""; preview();
  }; img.src = r.result; };
  r.readAsDataURL(f); e.target.value = "";
};

/* ---------- export / import / theme / nav ---------- */
$("#exp").onclick = () => {
  const a = document.createElement("a");
  a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 1));
  a.download = "stackshelf-" + user + ".json"; a.click();
};
$("#imp").onclick = () => $("#impfile").click();
$("#impfile").onchange = e => {
  const f = e.target.files[0]; if(!f) return; const r = new FileReader();
  r.onload = () => { try{
    const d = JSON.parse(r.result);
    if(Array.isArray(d)){ d.forEach((x, i) => items.push({cover: "", note: "", rating: 0, status: "want", type: "article", domain: "general", ...x, id: Date.now() + i})); save(); renderShelf(); }
  }catch(err){ alert("that file isn’t valid json."); } };
  r.readAsText(f); e.target.value = "";
};
$("#theme").onclick = () => {
  const r = document.documentElement;
  const light = r.dataset.theme ? r.dataset.theme == "light" : matchMedia("(prefers-color-scheme:light)").matches;
  r.dataset.theme = light ? "dark" : "light"; ls.set("ss:theme", r.dataset.theme);
};
function show(v){
  $("#v-shelf").hidden = v !== "shelf"; $("#v-popular").hidden = v !== "popular";
  $$("nav .link").forEach(b => b.classList.toggle("on", b.dataset.view === v));
  if(v === "popular") renderPopular();
}
$$("nav .link").forEach(b => b.onclick = () => show(b.dataset.view));
function save(){ store.saveShelf(user, items); }

/* ---------- boot ---------- */
function boot(){
  user = store.session();
  if(user && !store.users()[user]) user = null;
  $("#auth").hidden = !!user; $("#app").hidden = !user;
  if(!user){ setMode("in"); return; }
  items = store.shelf(user); $("#me").textContent = "@" + user;
  show("shelf"); renderShelf();
}
const t = ls.get("ss:theme", null); if(t) document.documentElement.dataset.theme = t;
boot();
})();
