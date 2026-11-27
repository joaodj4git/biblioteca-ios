'use strict';
/* Sua estante — versão web (iPhone e qualquer navegador).
   Usa o mesmo servidor do app Android: a estante de cada pessoa fica na tabela "leituras". */

const SB = 'https://rtfdasbfaehgeqdjknpt.supabase.co';
// Chave pública: feita para ficar no app. Quem protege os dados são as regras do banco.
const CHAVE = 'sb_publishable_x3IvbUDMxdT4iVsC0yVQGw_NaYI282j';
const DOMINIO = 'leitores.minhabiblioteca.app';

const STATUS = {
  LENDO: { nome: 'Lendo', cor: 'var(--fita-lendo)' },
  QUERO_LER: { nome: 'Quero ler', cor: 'var(--fita-quero)' },
  LIDO: { nome: 'Lido', cor: 'var(--fita-lido)' },
};
const CORES_CAPA = ['#34405A', '#4B5A44', '#5E3A4E', '#3F5F5E', '#7A2E3B', '#8C6A3A', '#9A5B5E', '#46546E', '#6B4A3A'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const TIPOS = { IDEIA: 'Ideia', PROBLEMA: 'Problema', VISUAL: 'Visual', PERGUNTA: 'Pergunta' };

// ---------------------------------------------------------------- utilidades
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
  del(k) { try { localStorage.removeItem(k); } catch { } },
};
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();
const hojeISO = () => new Date().toISOString();
const dataCurta = iso => { if (!iso) return ''; const d = new Date(iso); return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`; };
const paraInputData = iso => iso ? new Date(iso).toLocaleDateString('sv-SE') : '';
const deInputData = v => v ? new Date(v + 'T12:00:00').toISOString() : null;
function quando(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return Math.floor(s / 60) + ' min';
  if (s < 86400) return Math.floor(s / 3600) + ' h';
  if (s < 86400 * 7) return Math.floor(s / 86400) + ' d';
  return dataCurta(iso);
}
function corDe(texto) { let h = 0; for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) | 0; return CORES_CAPA[Math.abs(h) % CORES_CAPA.length]; }
function tamanho(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }

let avisoTimer;
function aviso(msg) {
  const a = $('#aviso'); a.textContent = msg; a.hidden = false;
  clearTimeout(avisoTimer); avisoTimer = setTimeout(() => a.hidden = true, 2800);
}

const ICONES = {
  estante: '<path d="M4 4h4v16H4zM10 6h4v14h-4zM15.5 6.5l3.6-1 3 13.6-3.6 1z"/><path d="M2 20.5h20"/>',
  ler: '<path d="M3 5.5C5.5 4.5 8.5 4.5 12 6.5c3.5-2 6.5-2 9-1V19c-2.5-1-5.5-1-9 1-3.5-2-6.5-2-9-1z"/><path d="M12 6.5V20"/>',
  amigos: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.6c2.3.2 4 1.7 4.5 4.4"/>',
  mural: '<path d="M4 4h16v12H9l-5 4z"/><path d="M8 8.5h8M8 11.5h5"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  grafico: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  coracao: '<path d="M12 20s-7.5-4.6-9.2-9.3C1.6 7.3 3.8 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.4 0 5.6 3.3 4.4 6.7C19.5 15.4 12 20 12 20z"/>',
  dislike: '<path d="M10 15v4.5c0 1.2 1 2 2 2l3.6-7.5V3.5H7.2c-1 0-1.8.7-2 1.6L4 11.6c-.2 1.3.8 2.4 2 2.4z"/><path d="M15.6 3.5H20v10.5h-4.4"/>',
  indice: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r=".8"/><circle cx="4" cy="12" r=".8"/><circle cx="4" cy="18" r=".8"/>',
  aa: '<path d="M3 19l5-13 5 13M5 14.5h6"/><path d="M14 19l3.5-8.5L21 19M15.2 16h4.6"/>',
  sair: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  balao: '<path d="M4 5h16v11H10l-5 4v-4H4z"/>',
};
function icone(nome, { cor = 'currentColor', cheio = false, esp = 1.6 } = {}) {
  return `<svg viewBox="0 0 24 24" fill="${cheio ? cor : 'none'}" stroke="${cor}" stroke-width="${esp}" stroke-linecap="round" stroke-linejoin="round">${ICONES[nome]}</svg>`;
}

// ---------------------------------------------------------------- servidor
let conta = ls.get('conta', null); // {access, refresh, expira, uid, nome}

function emailDe(nome) {
  const base = norm(nome).replace(/ /g, '.');
  if (!base) throw new Error('Escolha um nome com letras ou números.');
  return base + '@' + DOMINIO;
}
function guardarSessao(s) {
  conta = { ...(conta || {}), access: s.access_token, refresh: s.refresh_token, expira: Date.now() + (s.expires_in || 3600) * 1000 - 60000, uid: s.user.id };
  ls.set('conta', conta);
}
async function token() {
  if (!conta) throw Object.assign(new Error('Entre na sua conta.'), { codigo: 401 });
  if (Date.now() < conta.expira) return conta.access;
  const s = await http('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: conta.refresh }, { auth: false });
  guardarSessao(s);
  return conta.access;
}
async function http(metodo, rota, corpo, { auth = true, extras = {}, bruto = false } = {}) {
  const h = { apikey: CHAVE, Accept: 'application/json', ...extras };
  if (!bruto) h['Content-Type'] = 'application/json';
  if (auth) h.Authorization = 'Bearer ' + await token();
  let r;
  try {
    r = await fetch(SB + rota, { method: metodo, headers: h, body: corpo == null ? undefined : (bruto ? corpo : JSON.stringify(corpo)) });
  } catch { throw new Error('Sem conexão com o servidor.'); }
  const t = await r.text();
  if (!r.ok) {
    let m = ''; try { const j = JSON.parse(t); m = j.msg || j.message || j.error_description || ''; } catch { }
    if (r.status === 401 && auth && /jwt|token/i.test(m)) { conta.expira = 0; ls.set('conta', conta); }
    throw Object.assign(new Error(m || `Erro ${r.status} no servidor.`), { codigo: r.status });
  }
  return t ? JSON.parse(t) : null;
}

async function entrar(nome, senha, senhaGrupo) {
  if (senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
  const corpo = { email: emailDe(nome), password: senha };
  let s;
  try {
    s = await http('POST', '/auth/v1/token?grant_type=password', corpo, { auth: false });
  } catch {
    try { s = await http('POST', '/auth/v1/signup', corpo, { auth: false }); }
    catch (e2) { if (/already/i.test(e2.message)) throw new Error('Senha errada para esse nome.'); throw e2; }
  }
  if (!s || !s.access_token) throw new Error('O servidor pediu confirmação de e-mail.');
  guardarSessao(s);
  const ok = await http('POST', '/rest/v1/rpc/entrar_no_grupo', { senha: senhaGrupo, nome: nome.trim() });
  if (ok !== true) { sair(); throw new Error('Senha do grupo errada.'); }
  conta.nome = nome.trim(); ls.set('conta', conta);
}
function sair() { conta = null; livros = []; ls.del('conta'); ls.del('livros'); }

// ---------------------------------------------------------------- estante (minhas leituras)
let livros = ls.get('livros', []);

async function carregarLivros() {
  const r = await http('GET', `/rest/v1/leituras?user_id=eq.${conta.uid}&select=*&order=atualizado_em.desc`);
  livros = r; ls.set('livros', livros);
  return livros;
}
const livro = id => livros.find(b => String(b.id) === String(id));

async function salvarLivro(b) {
  const linha = {
    local_id: b.local_id ?? Date.now(),
    titulo: b.titulo, autor: b.autor || '', paginas: b.paginas || null, isbn: b.isbn || null,
    capa_url: b.capa_url || null, status: b.status, gostei: b.gostei ?? null,
    iniciado_em: b.iniciado_em || null, terminado_em: b.terminado_em || null,
    adicionado_em: b.adicionado_em || hojeISO(), atualizado_em: hojeISO(),
  };
  const r = await http('POST', '/rest/v1/leituras?on_conflict=user_id,local_id', [linha],
    { extras: { Prefer: 'resolution=merge-duplicates,return=representation' } });
  const novo = r[0];
  const i = livros.findIndex(x => x.id === novo.id);
  if (i >= 0) livros[i] = novo; else livros.unshift(novo);
  ls.set('livros', livros);
  return novo;
}
function comStatus(b, status) {
  const n = { ...b, status };
  if (status === 'LENDO' && !n.iniciado_em) n.iniciado_em = hojeISO();
  if (status === 'LIDO') { if (!n.terminado_em) n.terminado_em = hojeISO(); if (!n.iniciado_em) n.iniciado_em = n.terminado_em; }
  if (status === 'QUERO_LER') { n.iniciado_em = null; n.terminado_em = null; }
  if (status === 'LENDO') n.terminado_em = null;
  return n;
}
async function apagarLivro(b) {
  await http('DELETE', `/rest/v1/leituras?id=eq.${b.id}`);
  livros = livros.filter(x => x.id !== b.id); ls.set('livros', livros);
  for (const e of await ebooksTodos()) if (e.bookId === b.id) { e.bookId = null; await ebookSalvar(e); }
}

// ---------------------------------------------------------------- busca de livros
async function jget(u) { try { const r = await fetch(u); if (!r.ok) return null; return await r.json(); } catch { return null; } }
function isbnDe(q) {
  const limpo = q.replace(/[\s.-]/g, '');
  return /^(\d{9}[\dXx]|\d{13})$/.test(limpo) ? limpo.toUpperCase() : null;
}
function deGoogle(i) {
  const v = i.volumeInfo || {}; const ids = v.industryIdentifiers || [];
  const isbn = (ids.find(x => x.type === 'ISBN_13') || ids.find(x => x.type === 'ISBN_10') || {}).identifier || null;
  let capa = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || null;
  if (capa) capa = capa.replace('http://', 'https://').replace('&edge=curl', '');
  return { titulo: v.title ? v.title + (v.subtitle ? ': ' + v.subtitle : '') : '', autor: (v.authors || []).join(', '), paginas: v.pageCount || null, capa, isbn };
}
async function buscarLivros(q) {
  const out = [];
  const add = x => {
    if (!x || !x.titulo) return;
    const k = norm(x.titulo) + '|' + norm((x.autor || '').split(',')[0]);
    const o = out.find(o => o.k === k);
    if (o) { o.paginas ||= x.paginas; o.capa ||= x.capa; o.isbn ||= x.isbn; return; }
    out.push({ ...x, k });
  };
  const isbn = isbnDe(q);
  if (isbn) {
    const [ba, ol, gb] = await Promise.all([
      jget('https://brasilapi.com.br/api/isbn/v1/' + isbn),
      jget(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`),
      jget('https://www.googleapis.com/books/v1/volumes?q=isbn:' + isbn),
    ]);
    if (ba && ba.title) add({ titulo: ba.title + (ba.subtitle ? ': ' + ba.subtitle : ''), autor: (ba.authors || []).join(', '), paginas: ba.page_count || null, capa: ba.cover_url || null, isbn });
    const o = ol && ol['ISBN:' + isbn];
    if (o) add({ titulo: o.title, autor: (o.authors || []).map(a => a.name).join(', '), paginas: o.number_of_pages || null, capa: o.cover?.large || o.cover?.medium || null, isbn });
    (gb?.items || []).forEach(i => add(deGoogle(i)));
    if (out[0] && !out[0].capa) out[0].capa = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  } else {
    const e = encodeURIComponent(q);
    const [g1, g2, ol] = await Promise.all([
      jget(`https://www.googleapis.com/books/v1/volumes?q=${e}&langRestrict=pt&maxResults=20`),
      jget(`https://www.googleapis.com/books/v1/volumes?q=${e}&maxResults=20`),
      jget(`https://openlibrary.org/search.json?q=${e}&limit=15&fields=title,author_name,number_of_pages_median,cover_i,isbn`),
    ]);
    (g1?.items || []).forEach(i => add(deGoogle(i)));
    (g2?.items || []).forEach(i => add(deGoogle(i)));
    (ol?.docs || []).forEach(d => add({
      titulo: d.title, autor: (d.author_name || []).join(', '), paginas: d.number_of_pages_median || null,
      capa: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null, isbn: (d.isbn || [])[0] || null,
    }));
  }
  return out.slice(0, 30);
}

// ---------------------------------------------------------------- arquivos (IndexedDB, ficam só neste aparelho)
let dbp;
function db() {
  return dbp ||= new Promise((ok, erro) => {
    const r = indexedDB.open('sua-estante', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('ebooks', { keyPath: 'id' });
    r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error);
  });
}
async function loja(modo) { return (await db()).transaction('ebooks', modo).objectStore('ebooks'); }
const req = r => new Promise((ok, erro) => { r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); });
async function ebooksTodos() {
  const t = await req((await loja('readonly')).getAll());
  return t.sort((a, b) => (b.aberto || b.adicionado) - (a.aberto || a.adicionado));
}
async function ebook(id) { return req((await loja('readonly')).get(Number(id))); }
async function ebookSalvar(e) { return req((await loja('readwrite')).put(e)); }
async function ebookApagar(id) { return req((await loja('readwrite')).delete(Number(id))); }

function carregarScript(src) {
  return new Promise((ok, erro) => {
    if (document.querySelector(`script[src="${src}"]`)) return ok();
    const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = erro; document.head.appendChild(s);
  });
}
async function epubJs() { await carregarScript('vendor/jszip.min.js'); await carregarScript('vendor/epub.min.js'); }
let pdfjs;
async function pdfJs() {
  if (!pdfjs) { pdfjs = await import('./vendor/pdf.min.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.mjs'; }
  return pdfjs;
}
const blobParaDataUrl = b => new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); });

async function importarArquivo(arquivo, extra = {}) {
  const pdf = /\.pdf$/i.test(arquivo.name) || arquivo.type === 'application/pdf';
  const e = {
    id: Date.now() + Math.floor(Math.random() * 1000), formato: pdf ? 'PDF' : 'EPUB', blob: arquivo,
    titulo: arquivo.name.replace(/\.(epub|pdf)$/i, '').replace(/[_-]+/g, ' '), autor: '', capa: null,
    tamanho: arquivo.size, progresso: 0, local: null, rotulo: '', adicionado: Date.now(), aberto: null, bookId: null, ...extra,
  };
  try {
    if (pdf) {
      const lib = await pdfJs();
      const doc = await lib.getDocument({ data: await arquivo.arrayBuffer() }).promise;
      const info = await doc.getMetadata().catch(() => null);
      if (info?.info?.Title) e.titulo = info.info.Title;
      if (info?.info?.Author) e.autor = info.info.Author;
      const p = await doc.getPage(1); const v = p.getViewport({ scale: 1 });
      const esc2 = 240 / v.width; const vp = p.getViewport({ scale: esc2 });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      e.capa = c.toDataURL('image/jpeg', .8); e.paginas = doc.numPages;
    } else {
      await epubJs();
      const book = ePub(await arquivo.arrayBuffer());
      const meta = await book.loaded.metadata;
      if (meta.title) e.titulo = meta.title; if (meta.creator) e.autor = meta.creator;
      const url = await book.coverUrl().catch(() => null);
      if (url) e.capa = await blobParaDataUrl(await (await fetch(url)).blob());
      book.destroy();
    }
  } catch (err) { console.warn('não li os dados do arquivo', err); }
  // liga sozinho a um livro da estante com o mesmo título
  const igual = livros.find(b => norm(b.titulo) === norm(e.titulo) || norm(b.titulo.split(':')[0]) === norm(e.titulo.split(':')[0]));
  if (igual && e.bookId == null) e.bookId = igual.id;
  await ebookSalvar(e);
  return e;
}

// ---------------------------------------------------------------- amigos
async function feed() {
  const sel = 'id,user_id,titulo,autor,paginas,capa_url,status,gostei,atualizado_em,membros!leituras_user_id_fkey(nome),comentarios(count)';
  return http('GET', `/rest/v1/leituras?select=${encodeURIComponent(sel)}&order=atualizado_em.desc&limit=150`);
}
const nomeDe = o => o.membros?.nome || 'alguém';
const contagem = a => (a && a[0] && a[0].count) || 0;

// ---------------------------------------------------------------- mural
const SELECT_POST = 'id,user_id,tipo,titulo,texto,imagem_url,criado_em,membros!mural_posts_user_id_fkey(nome),mural_respostas(count),mural_apoios(user_id)';
async function enviarImagem(bucket, arquivo) {
  const img = await createImageBitmap(arquivo);
  const k = Math.min(1, 1400 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', .85));
  const rota = `/storage/v1/object/${bucket}/${conta.uid}/${Date.now()}.jpg`;
  await http('POST', rota, blob, { bruto: true, extras: { 'Content-Type': 'image/jpeg' } });
  return SB + rota.replace('/object/', '/object/public/');
}
async function verificarMural() {
  try {
    const r = await http('GET', '/rest/v1/mural_posts?select=criado_em,user_id&order=criado_em.desc&limit=1');
    const visto = ls.get('mural_visto', '');
    novidadeMural = !!(r[0] && r[0].user_id !== conta.uid && r[0].criado_em > visto);
    desenharAbas(abaAtual);
  } catch { }
}
let novidadeMural = false;

// ---------------------------------------------------------------- componentes
function capa(b, { fita = true, selo = '' } = {}) {
  const url = b.capa_url || b.capa;
  const falsa = `<div class="falsa" style="background:${corDe(b.titulo)}"><b>${esc(b.titulo)}</b><i>${esc((b.autor || '').split(',')[0])}</i></div>`;
  return `<div class="capa">${falsa}${url ? `<img src="${esc(url)}" alt="" loading="lazy" onerror="this.remove()">` : ''}`
    + `${fita && STATUS[b.status] ? `<span class="fita" style="background:${STATUS[b.status].cor}"></span>` : ''}`
    + `${selo ? `<span class="selo">${esc(selo)}</span>` : ''}</div>`;
}
function cabInterno(titulo, voltar, direita = '') {
  return `<div class="cab-int"><button class="voltar" data-ir="${voltar}" aria-label="Voltar">‹</button><h1>${esc(titulo)}</h1>${direita}</div>`;
}
function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="folha">${html}</div>`; m.hidden = false; }
function fecharModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') fecharModal(); });

let abaAtual = 'estante';
function desenharAbas(atual) {
  abaAtual = atual;
  const n = $('#abas'); n.hidden = false;
  const abas = [['estante', 'Estante'], ['ler', 'Ler'], ['amigos', 'Amigos'], ['mural', 'Mural']];
  n.innerHTML = abas.map(([k, t]) => `<button data-ir="${k}" class="${k === atual ? 'ativa' : ''}">${icone(k, { esp: k === atual ? 1.9 : 1.5 })}${t}${k === 'mural' && novidadeMural ? '<span class="ponto"></span>' : ''}</button>`).join('');
}

// ---------------------------------------------------------------- telas
const app = $('#app');
const TELAS = {};
let parar = null; // limpeza da tela anterior (leitor)

async function render() {
  if (parar) { try { await parar(); } catch { } parar = null; }
  fecharModal();
  app.className = '';
  const [rota, arg] = (location.hash.slice(1) || 'estante').split('/');
  if (!conta) { $('#abas').hidden = true; return telaEntrar(); }
  const aba = { livro: 'estante', adicionar: 'estante', stats: 'estante', leitor: 'ler', acervo: 'ler', leitura: 'amigos', post: 'mural', 'novo-post': 'mural' }[rota] || rota;
  const tela = TELAS[rota] || TELAS.estante;
  if (rota === 'leitor') $('#abas').hidden = true; else desenharAbas(TELAS[rota] ? aba : 'estante');
  window.scrollTo(0, 0);
  try { await tela(arg); }
  catch (e) {
    console.error(e);
    if (e.codigo === 401) { sair(); return render(); }
    app.insertAdjacentHTML('beforeend', `<p class="erro">${esc(e.message || 'Algo deu errado.')}</p>`);
  }
}
window.addEventListener('hashchange', render);
const ir = h => { if (location.hash === '#' + h) render(); else location.hash = h; };

// ----- entrar
function telaEntrar() {
  app.innerHTML = `
    <div style="text-align:center;margin:40px 0 26px">
      <div class="ornamento">❦</div>
      <h1 style="font-family:var(--titulo);font-weight:500;font-size:48px;margin:0">Sua estante</h1>
      <p class="sub" style="margin-top:6px">entre com seu nome e senha</p>
    </div>
    <form id="f-entrar">
      <label class="campo"><span>Seu nome</span><input name="nome" autocomplete="username" required></label>
      <label class="campo"><span>Sua senha</span><input name="senha" type="password" autocomplete="current-password" minlength="6" required></label>
      <label class="campo"><span>Senha do grupo</span><input name="grupo" type="password" required></label>
      <p class="erro" id="erro-entrar"></p>
      <button class="btn cheio" type="submit">Entrar</button>
      <p class="sub" style="margin-top:18px;font-size:15px">Primeira vez? Escolha um nome e uma senha e a conta é criada. Se você já usa o app no Android, use o mesmo nome e senha para ver a mesma estante.</p>
    </form>`;
  $('#f-entrar').onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target), b = ev.target.querySelector('button');
    b.disabled = true; b.textContent = 'Entrando…';
    try {
      await entrar(f.get('nome'), f.get('senha'), f.get('grupo'));
      await carregarLivros();
      location.hash = 'estante'; render(); verificarMural();
    } catch (e) { $('#erro-entrar').textContent = e.message; b.disabled = false; b.textContent = 'Entrar'; }
  };
}

// ----- estante
TELAS.estante = async () => {
  const desenhar = async () => {
    const comArquivo = new Set((await ebooksTodos()).map(e => e.bookId).filter(x => x != null));
    const sec = st => {
      const lista = livros.filter(b => b.status === st);
      return `<section class="prateleira"><h2><span class="fita-mini" style="background:${STATUS[st].cor}"></span>${STATUS[st].nome} <small>${lista.length}</small></h2>
        ${lista.length ? `<div class="livros">${lista.map(b => `<button data-ir="livro/${b.id}">${capa(b, { selo: comArquivo.has(b.id) ? 'ler' : '' })}</button>`).join('')}</div>`
          : `<div class="vazio">${st === 'LENDO' ? 'Nada aberto agora.' : st === 'QUERO_LER' ? 'Sua lista de desejos está vazia.' : 'Nenhum livro terminado ainda.'}</div>`}</section>`;
    };
    app.innerHTML = `
      <div class="cab"><h1>Sua estante</h1><div style="display:flex;gap:8px">
        <button class="redondo" data-ir="stats" aria-label="Estatísticas">${icone('grafico')}</button>
        <button class="redondo" data-ir="adicionar" aria-label="Adicionar livro">${icone('mais')}</button></div></div>
      <p class="sub">${livros.length} ${livros.length === 1 ? 'livro' : 'livros'}</p>
      ${sec('LENDO')}${sec('QUERO_LER')}${sec('LIDO')}
      <div class="ornamento">❦</div>
      <p style="text-align:center"><button class="link" data-acao="sair">sair da conta (${esc(conta.nome || '')})</button></p>`;
  };
  await desenhar();
  carregarLivros().then(() => { if (location.hash.slice(1) === 'estante' || !location.hash) desenhar(); }).catch(() => { });
};

// ----- adicionar
let ultimaBusca = { q: '', res: [] };
TELAS.adicionar = async () => {
  app.innerHTML = `${cabInterno('Adicionar livro', 'estante')}
    <form id="f-busca" style="display:flex;gap:10px;align-items:flex-end">
      <label class="campo" style="flex:1;margin:0"><span>Nome ou ISBN</span><input name="q" value="${esc(ultimaBusca.q)}" placeholder="ex.: Dom Casmurro" enterkeyhint="search" autofocus></label>
      <button class="btn" type="submit">Buscar</button></form>
    <div id="res" style="margin-top:14px"></div>
    <p style="margin-top:18px"><button class="link" data-acao="manual">não achou? adicionar à mão</button></p>`;
  const mostrar = res => {
    $('#res').innerHTML = res.length ? res.map((x, i) => `<button class="item" data-acao="escolher" data-i="${i}">
        <div class="mini">${capa({ titulo: x.titulo, autor: x.autor, capa: x.capa }, { fita: false })}</div>
        <div class="txt"><div class="t">${esc(x.titulo)}</div><div class="a">${esc(x.autor)}</div>
        <div class="m">${x.paginas ? x.paginas + ' págs.' : 'páginas desconhecidas'}${x.isbn ? ' · ' + esc(x.isbn) : ''}</div></div></button>`).join('')
      : (ultimaBusca.q ? '<p class="sub">Nada encontrado. Tente outro nome ou o ISBN.</p>' : '');
  };
  mostrar(ultimaBusca.res);
  $('#f-busca').onsubmit = async ev => {
    ev.preventDefault();
    const q = new FormData(ev.target).get('q').trim(); if (!q) return;
    $('#res').innerHTML = '<p class="sub">Procurando…</p>';
    ultimaBusca = { q, res: await buscarLivros(q) };
    mostrar(ultimaBusca.res);
  };
};
function formLivro(x, titulo) {
  modal(`<h2>${esc(titulo)}</h2>
    <form id="f-livro">
      <label class="campo"><span>Título</span><input name="titulo" value="${esc(x.titulo)}" required></label>
      <label class="campo"><span>Autor</span><input name="autor" value="${esc(x.autor)}"></label>
      <label class="campo"><span>Páginas</span><input name="paginas" type="number" inputmode="numeric" min="1" value="${esc(x.paginas || '')}"></label>
      <span class="campo" style="margin:0"><span>Estante</span></span>
      <div class="pilulas" id="p-status">${Object.entries(STATUS).map(([k, s]) => `<button type="button" class="pilula ${k === (x.status || 'QUERO_LER') ? 'ativa' : ''}" data-st="${k}"><span class="fita-mini" style="background:${s.cor}"></span>${s.nome}</button>`).join('')}</div>
      <button class="btn cheio" type="submit">Guardar</button>
    </form>`);
  let status = x.status || 'QUERO_LER';
  $('#p-status').onclick = ev => { const b = ev.target.closest('[data-st]'); if (!b) return; status = b.dataset.st; $('#p-status').querySelectorAll('.pilula').forEach(p => p.classList.toggle('ativa', p === b)); };
  $('#f-livro').onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target), bt = ev.target.querySelector('[type=submit]'); bt.disabled = true;
    try {
      const base = x.id ? x : { capa_url: x.capa || null, isbn: x.isbn || null };
      const novo = await salvarLivro(comStatus({ ...base, titulo: f.get('titulo').trim(), autor: f.get('autor').trim(), paginas: parseInt(f.get('paginas')) || null }, status));
      if (!x.id) {
        for (const e of await ebooksTodos()) if (e.bookId == null && norm(e.titulo) === norm(novo.titulo)) { e.bookId = novo.id; await ebookSalvar(e); }
        aviso('Guardado na estante');
      }
      fecharModal(); ir('livro/' + novo.id);
    } catch (e) { aviso(e.message); bt.disabled = false; }
  };
}

// ----- detalhes
TELAS.livro = async id => {
  const b = livro(id); if (!b) return ir('estante');
  const ebs = await ebooksTodos();
  const arq = ebs.find(e => e.bookId === b.id);
  app.innerHTML = `${cabInterno('', 'estante', `<button class="link" data-acao="editar" data-id="${b.id}">editar</button>`)}
    <div class="detalhe-topo">${capa(b)}<div>
      <h1>${esc(b.titulo)}</h1><div class="a">${esc(b.autor)}</div>
      <div class="m" style="font-family:var(--mono);font-size:13px;margin-top:8px;color:var(--tinta-suave)">${b.paginas ? b.paginas + ' páginas' : ''}${b.isbn ? '<br>ISBN ' + esc(b.isbn) : ''}</div></div></div>
    <div class="secao"><h3>Estante</h3><div class="pilulas">${Object.entries(STATUS).map(([k, s]) => `<button class="pilula ${k === b.status ? 'ativa' : ''}" data-acao="status" data-st="${k}" data-id="${b.id}"><span class="fita-mini" style="background:${s.cor}"></span>${s.nome}</button>`).join('')}</div></div>
    <div class="secao"><h3>Gostou?</h3><div class="avaliacao">
      <button data-acao="gostei" data-v="true" data-id="${b.id}" aria-label="Gostei">${icone('coracao', { cor: b.gostei === true ? '#D79A9E' : 'var(--pontilhado)', cheio: b.gostei === true })}</button>
      <button data-acao="gostei" data-v="false" data-id="${b.id}" aria-label="Não gostei">${icone('dislike', { cor: b.gostei === false ? '#8FA9C4' : 'var(--pontilhado)', cheio: b.gostei === false })}</button></div></div>
    ${b.status !== 'QUERO_LER' ? `<div class="secao"><h3>Datas</h3><div class="linha-datas">
      <label class="campo"><span>Começou</span><input type="date" data-data="iniciado_em" value="${paraInputData(b.iniciado_em)}"></label>
      ${b.status === 'LIDO' ? `<label class="campo"><span>Terminou</span><input type="date" data-data="terminado_em" value="${paraInputData(b.terminado_em)}"></label>` : ''}</div></div>` : ''}
    ${arq ? `<div class="caixa-arquivo"><div style="display:flex;gap:12px;align-items:center">
        <div style="flex:1"><div class="a" style="font-style:italic;color:var(--tinta-suave)">Você tem o arquivo deste livro</div>
        <div><span class="selo-fmt">${arq.formato}</span> ${Math.round((arq.progresso || 0) * 100)}% lido</div></div>
        <button class="btn" data-ir="leitor/${arq.id}">Ler</button></div>
        <p style="margin:10px 0 0"><button class="link" data-acao="desligar" data-e="${arq.id}">não é este arquivo? desligar</button></p></div>`
      : ebs.length ? `<p style="margin-top:22px"><button class="link" data-acao="ligar-arquivo" data-id="${b.id}">ligar a um arquivo da aba Ler</button></p>` : ''}
    <div class="ornamento">❦</div>
    <p style="text-align:center"><button class="link" data-acao="remover" data-id="${b.id}">tirar da estante</button></p>`;
  app.querySelectorAll('[data-data]').forEach(inp => inp.onchange = async () => {
    try { await salvarLivro({ ...livro(id), [inp.dataset.data]: deInputData(inp.value) }); aviso('Data guardada'); } catch (e) { aviso(e.message); }
  });
};

// ----- estatísticas
TELAS.stats = async () => {
  const metas = ls.get('metas', { livros: 12, paginas: 4000 });
  const ano = new Date().getFullYear(), mes = new Date().getMonth();
  const lidos = livros.filter(b => b.status === 'LIDO');
  const doAno = lidos.filter(b => b.terminado_em && new Date(b.terminado_em).getFullYear() === ano);
  const pagsAno = doAno.reduce((s, b) => s + (b.paginas || 0), 0);
  const inicioAno = new Date(ano, 0, 1); const dias = Math.max(1, Math.ceil((Date.now() - inicioAno) / 86400000));
  const porMes = Array(12).fill(0); doAno.forEach(b => porMes[new Date(b.terminado_em).getMonth()]++);
  const max = Math.max(1, ...porMes);
  const pct = (a, b) => Math.min(100, Math.round(a / Math.max(1, b) * 100));
  app.innerHTML = `${cabInterno('Estatísticas', 'estante')}
    <p class="sub">${ano}</p>
    <div class="meta"><div class="topo"><span>Meta de livros</span><span><span class="num">${doAno.length}</span> de <button class="link vinho" data-acao="meta" data-k="livros">${metas.livros}</button></span></div><div class="barra"><i style="width:${pct(doAno.length, metas.livros)}%"></i></div></div>
    <div class="meta"><div class="topo"><span>Meta de páginas</span><span><span class="num">${pagsAno.toLocaleString('pt-BR')}</span> de <button class="link vinho" data-acao="meta" data-k="paginas">${metas.paginas.toLocaleString('pt-BR')}</button></span></div><div class="barra"><i style="width:${pct(pagsAno, metas.paginas)}%"></i></div></div>
    <div class="tiles"><div class="tile"><b>${Math.round(pagsAno / dias)}</b><span>páginas por dia</span></div><div class="tile"><b>${porMes[mes]}</b><span>livros este mês</span></div></div>
    <div class="secao"><h3>Livros por mês</h3><div class="grafico">${porMes.map(n => `<div>${n ? `<small>${n}</small>` : ''}<i style="height:${n / max * 100}%"></i></div>`).join('')}</div>
      <div class="meses">${MESES.map(m => `<span>${m}</span>`).join('')}</div></div>
    <div class="secao"><h3>Desde sempre</h3><div class="tiles"><div class="tile"><b>${lidos.length}</b><span>livros lidos</span></div><div class="tile"><b>${lidos.reduce((s, b) => s + (b.paginas || 0), 0).toLocaleString('pt-BR')}</b><span>páginas lidas</span></div></div></div>`;
};

// ----- ler
TELAS.ler = async () => {
  const ebs = await ebooksTodos();
  const abertos = ebs.filter(e => e.aberto && (e.progresso || 0) < .99);
  app.innerHTML = `<div class="cab"><h1>Ler</h1><button class="redondo" data-acao="importar" aria-label="Adicionar arquivo">${icone('mais')}</button></div>
    <p class="sub">EPUB e PDF ficam guardados neste aparelho.</p>
    <input type="file" id="arquivo" accept=".epub,.pdf,application/epub+zip,application/pdf" multiple hidden>
    ${abertos.length ? `<div class="secao"><h3>Continuar lendo</h3>${abertos.slice(0, 3).map(e => itemEbook(e)).join('')}</div>` : ''}
    <div class="secao"><h3>Todos os arquivos</h3>${ebs.length ? ebs.map(e => itemEbook(e, true)).join('') : '<p class="sub">Nenhum arquivo ainda. Toque em + para escolher um EPUB ou PDF.</p>'}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:20px"><button class="btn leve" data-acao="importar">Escolher arquivo</button><button class="btn leve" data-ir="acervo">Acervo gratuito</button></div>`;
  $('#arquivo').onchange = async ev => {
    const fs = [...ev.target.files]; if (!fs.length) return;
    aviso('Guardando…');
    for (const f of fs) await importarArquivo(f);
    aviso(fs.length > 1 ? 'Arquivos guardados' : 'Arquivo guardado'); render();
  };
};
function itemEbook(e, menu = false) {
  const b = e.bookId != null ? livro(e.bookId) : null;
  return `<div class="item"><button style="display:flex;gap:12px;flex:1;text-align:left;align-items:center" data-ir="leitor/${e.id}">
    <div class="mini">${capa({ titulo: e.titulo, autor: e.autor, capa: e.capa }, { fita: false })}</div>
    <div class="txt"><div class="t">${esc(e.titulo)}</div><div class="a">${esc(e.autor)}${b ? ' · também na estante' : ''}</div>
    <div class="m"><span class="selo-fmt">${e.formato}</span> ${Math.round((e.progresso || 0) * 100)}%${e.rotulo ? ' · ' + esc(e.rotulo) : ''} · ${tamanho(e.tamanho || 0)}</div>
    <div class="barra"><i style="width:${Math.round((e.progresso || 0) * 100)}%"></i></div></div></button>
    ${menu ? `<button class="voltar" data-acao="menu-ebook" data-e="${e.id}" aria-label="Opções">⋯</button>` : ''}</div>`;
}

// ----- acervo gratuito (Projeto Gutenberg, via Gutendex)
TELAS.acervo = async () => {
  const pt = ls.get('acervo_pt', true);
  app.innerHTML = `${cabInterno('Acervo gratuito', 'ler')}
    <p class="sub">Livros em domínio público do Projeto Gutenberg.</p>
    <form id="f-acervo" style="display:flex;gap:10px;align-items:flex-end">
      <label class="campo" style="flex:1;margin:0"><span>Título ou autor</span><input name="q" placeholder="ex.: Machado de Assis" enterkeyhint="search"></label>
      <button class="btn" type="submit">Buscar</button></form>
    <div class="pilulas" style="margin-top:12px"><button class="pilula ${pt ? 'ativa' : ''}" data-acao="acervo-pt">só em português</button></div>
    <div id="res-acervo"></div>`;
  $('#f-acervo').onsubmit = async ev => {
    ev.preventDefault();
    const q = new FormData(ev.target).get('q').trim(); if (!q) return;
    const caixa = $('#res-acervo'); caixa.innerHTML = '<p class="sub">Procurando… o acervo às vezes demora até meio minuto.</p>';
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 45000);
    try {
      const r = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(q)}${ls.get('acervo_pt', true) ? '&languages=pt' : ''}`, { signal: ctrl.signal });
      if (!r.ok) throw new Error('O acervo respondeu com erro ' + r.status + '.');
      const j = await r.json();
      const lista = (j.results || []).filter(x => x.formats['application/epub+zip']);
      acervoRes = lista;
      caixa.innerHTML = lista.length ? lista.map((x, i) => `<div class="item"><div class="mini">${capa({ titulo: x.title, autor: (x.authors[0] || {}).name, capa: x.formats['image/jpeg'] }, { fita: false })}</div>
        <div class="txt"><div class="t">${esc(x.title)}</div><div class="a">${esc(x.authors.map(a => a.name).join('; '))}</div><div class="m">${esc(x.languages.join(', '))}</div></div>
        <button class="btn leve" data-acao="baixar" data-i="${i}">Baixar</button></div>`).join('') : '<p class="sub">Nada encontrado. Tente sem o filtro de português ou com outro nome.</p>';
    } catch (e) {
      caixa.innerHTML = `<p class="erro">${e.name === 'AbortError' ? 'O acervo demorou demais para responder. Tente de novo.' : esc(e.message || 'Não consegui falar com o acervo.')}</p>`;
    } finally { clearTimeout(t); }
  };
};
let acervoRes = [];

// ----- leitor
const prefsLeitor = () => ls.get('leitor', { tema: 'papel', fonte: 'EB Garamond', tamanho: 110 });
TELAS.leitor = async id => {
  const e = await ebook(id); if (!e) return ir('ler');
  e.aberto = Date.now(); await ebookSalvar(e);
  app.className = 'cheio';
  const p = prefsLeitor();
  app.innerHTML = `<div class="leitor tema-${p.tema}" id="leitor">
    <div class="leitor-topo"><button class="voltar" data-acao="fechar-leitor" aria-label="Fechar">‹</button><div class="t">${esc(e.titulo)}</div>
      ${e.formato === 'EPUB' ? `<button class="redondo" data-acao="indice">${icone('indice')}</button><button class="redondo" data-acao="ajustes">${icone('aa')}</button>` : ''}</div>
    <div class="leitor-area">${e.formato === 'EPUB'
      ? '<div id="epub"></div><button class="zona esq" data-acao="anterior" aria-label="Página anterior"></button><button class="zona meio" data-acao="limpo"></button><button class="zona dir" data-acao="proxima" aria-label="Próxima página"></button>'
      : '<div class="pdf-paginas" id="pdf"></div>'}</div>
    <div class="leitor-baixo"><span id="rotulo">${esc(e.rotulo || '')}</span><span id="pct">${Math.round((e.progresso || 0) * 100)}%</span></div></div>`;
  if (e.formato === 'EPUB') await abrirEpub(e); else await abrirPdf(e);
};
let leitorAtual = null;
let salvarTimer;
function guardarProgresso(e) { clearTimeout(salvarTimer); salvarTimer = setTimeout(() => ebookSalvar(e), 600); }

async function abrirEpub(e) {
  await epubJs();
  const book = ePub(await e.blob.arrayBuffer());
  const rend = book.renderTo('epub', { width: '100%', height: '100%', flow: 'paginated', spread: 'none', allowScriptedContent: false });
  const temas = { papel: ['#F4ECDF', '#2B1E1A'], sepia: ['#E9DAC0', '#3B2A1E'], noite: ['#1F1A18', '#D8CBB8'] };
  const aplicar = () => {
    const p = prefsLeitor(); const [fundo, tinta] = temas[p.tema];
    rend.themes.override('color', tinta); rend.themes.override('background', fundo);
    rend.themes.override('font-family', `'${p.fonte}', Georgia, serif`);
    rend.themes.override('line-height', '1.55');
    rend.themes.fontSize(p.tamanho + '%');
    $('#leitor').className = 'leitor tema-' + p.tema;
  };
  rend.hooks.content.register(c => {
    c.addStylesheet('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=EB+Garamond:ital@0;1&display=swap');
    // deslizar o dedo também vira a página
    let x0 = null;
    c.document.addEventListener('touchstart', ev => { x0 = ev.touches[0].clientX; }, { passive: true });
    c.document.addEventListener('touchend', ev => {
      if (x0 == null) return; const dx = ev.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) dx < 0 ? rend.next() : rend.prev();
    }, { passive: true });
  });
  aplicar();
  let toc = [];
  book.loaded.navigation.then(n => { toc = n.toc || []; }).catch(() => { });
  const capituloDe = href => {
    const limpa = h => (h || '').split('#')[0];
    const ach = (lista) => { for (const t of lista) { if (limpa(t.href).endsWith(limpa(href)) || limpa(href).endsWith(limpa(t.href))) return t; const s = ach(t.subitems || []); if (s) return s; } return null; };
    const t = ach(toc); return t ? t.label.trim() : '';
  };
  rend.on('relocated', loc => {
    e.local = loc.start.cfi;
    if (book.locations.length()) e.progresso = book.locations.percentageFromCfi(loc.start.cfi) || 0;
    if (loc.atEnd) e.progresso = 1;
    e.rotulo = capituloDe(loc.start.href) || e.rotulo;
    $('#pct') && ($('#pct').textContent = Math.round((e.progresso || 0) * 100) + '%');
    $('#rotulo') && ($('#rotulo').textContent = e.rotulo || '');
    guardarProgresso(e);
  });
  const tecla = ev => { if (ev.key === 'ArrowRight') rend.next(); if (ev.key === 'ArrowLeft') rend.prev(); };
  document.addEventListener('keyup', tecla);
  try { await rend.display(e.local || undefined); } catch { await rend.display(); }
  book.ready.then(() => book.locations.generate(1200)).then(() => {
    const l = rend.currentLocation(); if (l && l.start) { e.progresso = book.locations.percentageFromCfi(l.start.cfi) || e.progresso; $('#pct') && ($('#pct').textContent = Math.round(e.progresso * 100) + '%'); }
  }).catch(() => { });
  leitorAtual = { e, rend, book, aplicar, toc: () => toc };
  parar = async () => { document.removeEventListener('keyup', tecla); clearTimeout(salvarTimer); await ebookSalvar(e); book.destroy(); leitorAtual = null; };
}

async function abrirPdf(e) {
  const lib = await pdfJs();
  const doc = await lib.getDocument({ data: await e.blob.arrayBuffer() }).promise;
  const caixa = $('#pdf'); const largura = Math.min(caixa.clientWidth - 16, 900);
  const p1 = await doc.getPage(1); const v1 = p1.getViewport({ scale: 1 });
  const escala = largura / v1.width; const dpr = Math.min(2, window.devicePixelRatio || 1);
  const canvases = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const c = document.createElement('canvas'); c.dataset.p = i;
    c.style.width = largura + 'px'; c.style.height = Math.round(v1.height * escala) + 'px';
    caixa.appendChild(c); canvases.push(c);
  }
  const feitas = new Set();
  const desenhar = async c => {
    const n = +c.dataset.p; if (feitas.has(n)) return; feitas.add(n);
    const pg = await doc.getPage(n); const vp = pg.getViewport({ scale: escala * dpr });
    c.width = vp.width; c.height = vp.height; c.style.height = Math.round(vp.height / dpr) + 'px';
    await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  };
  const obs = new IntersectionObserver(ents => ents.forEach(en => { if (en.isIntersecting) desenhar(en.target); }), { root: caixa, rootMargin: '600px 0px' });
  canvases.forEach(c => obs.observe(c));
  const pagina = Math.max(1, Math.min(doc.numPages, Number(e.local) || 1));
  canvases[pagina - 1].scrollIntoView();
  const atualizar = () => {
    const meio = caixa.scrollTop + caixa.clientHeight / 2;
    const c = canvases.find(c => c.offsetTop + c.offsetHeight > meio) || canvases[canvases.length - 1];
    const n = +c.dataset.p; e.local = n; e.progresso = doc.numPages > 1 ? (n - 1) / (doc.numPages - 1) : 1; e.rotulo = `página ${n} de ${doc.numPages}`;
    $('#pct').textContent = Math.round(e.progresso * 100) + '%'; $('#rotulo').textContent = e.rotulo;
    guardarProgresso(e);
  };
  caixa.addEventListener('scroll', atualizar, { passive: true });
  parar = async () => { obs.disconnect(); clearTimeout(salvarTimer); await ebookSalvar(e); doc.destroy(); };
}

// ----- amigos
TELAS.amigos = async () => {
  app.innerHTML = `<div class="cab"><h1>Amigos</h1></div><p class="sub">O que o grupo anda lendo.</p><div id="feed"><p class="sub">Carregando…</p></div>`;
  const lista = await feed();
  const verbo = { LENDO: 'está lendo', LIDO: 'terminou', QUERO_LER: 'quer ler' };
  $('#feed').innerHTML = lista.length ? lista.map(l => `<button class="cartao" data-ir="leitura/${l.id}">
      <div class="mini">${capa(l)}</div><div style="flex:1;min-width:0">
      <div class="quem">${esc(nomeDe(l))} ${verbo[l.status] || ''} · ${quando(l.atualizado_em)}</div>
      <div class="t">${esc(l.titulo)}</div><div class="a" style="font-style:italic;color:var(--tinta-suave)">${esc(l.autor)}</div>
      <div class="rodape">${l.gostei === true ? `<span style="width:18px">${icone('coracao', { cor: '#D79A9E', cheio: true })}</span>` : l.gostei === false ? `<span style="width:18px">${icone('dislike', { cor: '#8FA9C4', cheio: true })}</span>` : ''}
      <span style="display:flex;gap:4px;align-items:center"><span style="width:16px;display:inline-block">${icone('balao')}</span>${contagem(l.comentarios)}</span></div></div></button>`).join('')
    : '<p class="sub">Ninguém compartilhou leituras ainda.</p>';
};
TELAS.leitura = async id => {
  app.innerHTML = cabInterno('Comentários', 'amigos') + '<div id="conteudo"><p class="sub">Carregando…</p></div>';
  const sel = 'id,user_id,titulo,autor,capa_url,status,gostei,atualizado_em,membros!leituras_user_id_fkey(nome)';
  const [l] = await http('GET', `/rest/v1/leituras?id=eq.${id}&select=${encodeURIComponent(sel)}`);
  if (!l) return ir('amigos');
  const coms = await http('GET', `/rest/v1/comentarios?leitura_id=eq.${id}&select=${encodeURIComponent('id,user_id,texto,criado_em,membros(nome)')}&order=criado_em.asc`);
  $('#conteudo').innerHTML = `<div class="detalhe-topo">${capa(l)}<div><h1>${esc(l.titulo)}</h1><div class="a">${esc(l.autor)}</div>
      <p class="sub" style="margin-top:8px">${esc(nomeDe(l))} · ${STATUS[l.status]?.nome || ''}</p></div></div>
    <div class="secao"><h3>${coms.length} ${coms.length === 1 ? 'comentário' : 'comentários'}</h3>
    ${coms.map(c => `<div class="comentario"><div class="quem"><span>${esc(nomeDe(c))} · ${quando(c.criado_em)}</span>${c.user_id === conta.uid ? `<button class="link" data-acao="apagar-com" data-id="${c.id}">apagar</button>` : ''}</div><p>${esc(c.texto)}</p></div>`).join('')}
    <form class="escrever" id="f-com"><textarea name="t" placeholder="Escreva um comentário" rows="1" required></textarea><button class="btn" type="submit">Enviar</button></form></div>`;
  $('#f-com').onsubmit = async ev => {
    ev.preventDefault(); const t = new FormData(ev.target).get('t').trim(); if (!t) return;
    ev.target.querySelector('button').disabled = true;
    try { await http('POST', '/rest/v1/comentarios', { leitura_id: Number(id), texto: t }, { extras: { Prefer: 'return=minimal' } }); render(); }
    catch (e) { aviso(e.message); ev.target.querySelector('button').disabled = false; }
  };
};

// ----- mural
let filtroMural = 'TUDO';
TELAS.mural = async () => {
  app.innerHTML = `<div class="cab"><h1>Mural</h1><button class="redondo" data-ir="novo-post" aria-label="Novo post">${icone('mais')}</button></div>
    <p class="sub">Ideias, problemas e pedidos para o app. Todo mundo vê e responde.</p>
    <div class="pilulas" id="filtros">${[['TUDO', 'Tudo'], ['IDEIA', 'Ideias'], ['PROBLEMA', 'Problemas'], ['VISUAL', 'Visuais'], ['PERGUNTA', 'Perguntas'], ['MEUS', 'Meus']].map(([k, t]) => `<button class="pilula ${k === filtroMural ? 'ativa' : ''}" data-acao="filtro" data-f="${k}">${t}</button>`).join('')}</div>
    <div id="posts"><p class="sub">Carregando…</p></div>`;
  const posts = await http('GET', `/rest/v1/mural_posts?select=${encodeURIComponent(SELECT_POST)}&order=criado_em.desc&limit=200`);
  if (posts[0]) { ls.set('mural_visto', posts[0].criado_em); novidadeMural = false; desenharAbas('mural'); }
  const lista = posts.filter(p => filtroMural === 'TUDO' || (filtroMural === 'MEUS' ? p.user_id === conta.uid : p.tipo === filtroMural));
  $('#posts').innerHTML = lista.length ? lista.map(p => {
    const apoio = (p.mural_apoios || []).some(a => a.user_id === conta.uid);
    return `<button class="cartao" data-ir="post/${p.id}" style="display:block"><div style="display:flex;justify-content:space-between;align-items:center"><span class="tipo">${TIPOS[p.tipo] || p.tipo}</span><span class="quem">${esc(nomeDe(p))} · ${quando(p.criado_em)}</span></div>
      <div class="t" style="margin-top:8px">${esc(p.titulo)}</div>${p.texto ? `<div style="color:var(--tinta-suave);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(p.texto)}</div>` : ''}
      <div class="rodape"><span style="color:${apoio ? 'var(--vinho)' : 'inherit'}">♥ ${(p.mural_apoios || []).length}</span><span>${contagem(p.mural_respostas)} ${contagem(p.mural_respostas) === 1 ? 'resposta' : 'respostas'}</span>${p.imagem_url ? '<span>· com imagem</span>' : ''}</div></button>`;
  }).join('') : '<p class="sub">Nada por aqui ainda. Toque em + para escrever o primeiro post.</p>';
};
TELAS.post = async id => {
  app.innerHTML = cabInterno('Post', 'mural') + '<div id="conteudo"><p class="sub">Carregando…</p></div>';
  const [p] = await http('GET', `/rest/v1/mural_posts?id=eq.${id}&select=${encodeURIComponent(SELECT_POST)}`);
  if (!p) return ir('mural');
  const resp = await http('GET', `/rest/v1/mural_respostas?post_id=eq.${id}&select=${encodeURIComponent('id,user_id,texto,criado_em,membros(nome)')}&order=criado_em.asc`);
  const apoios = p.mural_apoios || []; const apoio = apoios.some(a => a.user_id === conta.uid);
  $('#conteudo').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><span class="tipo">${TIPOS[p.tipo] || p.tipo}</span><span class="quem" style="font-family:var(--mono);font-size:12px;color:var(--tinta-suave)">${esc(nomeDe(p))} · ${quando(p.criado_em)}</span></div>
    <h2 style="font-family:var(--titulo);font-weight:500;font-size:30px;margin:10px 0 0;line-height:1.1">${esc(p.titulo)}</h2>
    ${p.texto ? `<p class="texto-post">${esc(p.texto)}</p>` : ''}${p.imagem_url ? `<img class="post-img" src="${esc(p.imagem_url)}" alt="">` : ''}
    <div style="display:flex;gap:12px;align-items:center;margin-top:16px">
      <button class="pilula ${apoio ? 'ativa' : ''}" data-acao="apoiar" data-id="${p.id}" data-sim="${!apoio}">♥ ${apoio ? 'Você apoia' : 'Apoiar'} · ${apoios.length}</button>
      ${p.user_id === conta.uid ? `<button class="link" data-acao="apagar-post" data-id="${p.id}">apagar post</button>` : ''}</div>
    <div class="secao"><h3>${resp.length} ${resp.length === 1 ? 'resposta' : 'respostas'}</h3>
    ${resp.map(c => `<div class="comentario"><div class="quem"><span>${esc(nomeDe(c))} · ${quando(c.criado_em)}</span>${c.user_id === conta.uid ? `<button class="link" data-acao="apagar-resp" data-id="${c.id}">apagar</button>` : ''}</div><p>${esc(c.texto)}</p></div>`).join('')}
    <form class="escrever" id="f-resp"><textarea name="t" placeholder="Responder" rows="1" required></textarea><button class="btn" type="submit">Enviar</button></form></div>`;
  $('#f-resp').onsubmit = async ev => {
    ev.preventDefault(); const t = new FormData(ev.target).get('t').trim(); if (!t) return;
    ev.target.querySelector('button').disabled = true;
    try { await http('POST', '/rest/v1/mural_respostas', { post_id: Number(id), texto: t }, { extras: { Prefer: 'return=minimal' } }); render(); }
    catch (e) { aviso(e.message); ev.target.querySelector('button').disabled = false; }
  };
};
TELAS['novo-post'] = async () => {
  let tipo = 'IDEIA';
  app.innerHTML = `${cabInterno('Novo post', 'mural')}
    <form id="f-post">
      <span class="campo" style="margin:0"><span>Tipo</span></span>
      <div class="pilulas" id="p-tipo">${Object.entries(TIPOS).map(([k, t]) => `<button type="button" class="pilula ${k === tipo ? 'ativa' : ''}" data-t="${k}">${t}</button>`).join('')}</div>
      <label class="campo"><span>Título</span><input name="titulo" required maxlength="140"></label>
      <label class="campo"><span>Texto</span><textarea name="texto" placeholder="Conte o que você pensou, o que deu errado ou o que gostaria de ver"></textarea></label>
      <label class="campo"><span>Imagem (opcional)</span><input name="img" type="file" accept="image/*"></label>
      <p class="erro" id="erro-post"></p>
      <button class="btn cheio" type="submit">Publicar</button></form>`;
  $('#p-tipo').onclick = ev => { const b = ev.target.closest('[data-t]'); if (!b) return; tipo = b.dataset.t; $('#p-tipo').querySelectorAll('.pilula').forEach(p => p.classList.toggle('ativa', p === b)); };
  $('#f-post').onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target), bt = ev.target.querySelector('[type=submit]');
    bt.disabled = true; bt.textContent = 'Publicando…';
    try {
      const img = f.get('img'); let url = null;
      if (img && img.size) url = await enviarImagem('mural', img);
      await http('POST', '/rest/v1/mural_posts', { tipo, titulo: f.get('titulo').trim(), texto: (f.get('texto') || '').trim(), imagem_url: url }, { extras: { Prefer: 'return=minimal' } });
      aviso('Publicado'); ir('mural');
    } catch (e) { $('#erro-post').textContent = e.message; bt.disabled = false; bt.textContent = 'Publicar'; }
  };
};

// ---------------------------------------------------------------- ações (cliques)
const ACOES = {
  async sair() { if (confirm('Sair da conta neste aparelho?')) { sair(); ir('estante'); } },
  manual() { formLivro({ titulo: ultimaBusca.q && !isbnDe(ultimaBusca.q) ? ultimaBusca.q : '', autor: '', paginas: '' }, 'Adicionar à mão'); },
  escolher(el) { const x = ultimaBusca.res[+el.dataset.i]; formLivro(x, 'Confirmar livro'); },
  editar(el) { formLivro(livro(el.dataset.id), 'Editar livro'); },
  async status(el) { try { await salvarLivro(comStatus(livro(el.dataset.id), el.dataset.st)); render(); } catch (e) { aviso(e.message); } },
  async gostei(el) {
    const b = livro(el.dataset.id); const v = el.dataset.v === 'true';
    try { await salvarLivro({ ...b, gostei: b.gostei === v ? null : v }); render(); } catch (e) { aviso(e.message); }
  },
  async remover(el) {
    const b = livro(el.dataset.id);
    if (!confirm(`Tirar "${b.titulo}" da estante?`)) return;
    try { await apagarLivro(b); aviso('Tirado da estante'); ir('estante'); } catch (e) { aviso(e.message); }
  },
  async 'ligar-arquivo'(el) {
    const bid = Number(el.dataset.id); const ebs = await ebooksTodos();
    modal(`<h2>Qual arquivo é deste livro?</h2>${ebs.map(e => `<button class="item" data-acao="ligar" data-e="${e.id}" data-b="${bid}">
      <div class="mini">${capa({ titulo: e.titulo, autor: e.autor, capa: e.capa }, { fita: false })}</div>
      <div class="txt"><div class="t">${esc(e.titulo)}</div><div class="a">${esc(e.autor)}${e.bookId != null && e.bookId !== bid ? ' · já ligado a outro livro' : ''}</div></div><span class="selo-fmt">${e.formato}</span></button>`).join('')}
      <p><button class="link" data-acao="fechar">cancelar</button></p>`);
  },
  async ligar(el) {
    const e = await ebook(el.dataset.e); e.bookId = el.dataset.b === '' ? null : Number(el.dataset.b); await ebookSalvar(e);
    fecharModal(); aviso(e.bookId == null ? 'Desligado' : 'Ligado'); render();
  },
  async desligar(el) { const e = await ebook(el.dataset.e); e.bookId = null; await ebookSalvar(e); render(); },
  fechar() { fecharModal(); },
  meta(el) {
    const metas = ls.get('metas', { livros: 12, paginas: 4000 }); const k = el.dataset.k;
    const v = prompt(k === 'livros' ? 'Quantos livros você quer ler este ano?' : 'Quantas páginas você quer ler este ano?', metas[k]);
    const n = parseInt(v); if (n > 0) { metas[k] = n; ls.set('metas', metas); render(); }
  },
  importar() { $('#arquivo').click(); },
  async 'menu-ebook'(el) {
    const e = await ebook(el.dataset.e); const b = e.bookId != null ? livro(e.bookId) : null;
    modal(`<h2>${esc(e.titulo)}</h2>
      <p class="sub">${b ? 'Ligado a “' + esc(b.titulo) + '” na estante.' : 'Não está ligado a nenhum livro da estante.'}</p>
      <div style="display:grid;gap:10px">
        <button class="btn" data-acao="escolher-livro" data-e="${e.id}">${b ? 'Trocar livro da estante' : 'Ligar a um livro da estante'}</button>
        ${b ? `<button class="btn leve" data-acao="ligar" data-e="${e.id}" data-b="">Desligar da estante</button>` : ''}
        <button class="btn leve" data-acao="apagar-ebook" data-e="${e.id}" style="color:var(--fita-lido);border-color:var(--fita-lido)">Apagar arquivo</button>
        <button class="link" data-acao="fechar">cancelar</button></div>`);
  },
  async 'escolher-livro'(el) {
    const e = await ebook(el.dataset.e);
    modal(`<h2>Ligar a qual livro?</h2>${livros.length ? livros.map(b => `<button class="item" data-acao="ligar" data-e="${e.id}" data-b="${b.id}">
      <div class="mini">${capa(b)}</div><div class="txt"><div class="t" style="color:${b.id === e.bookId ? 'var(--vinho)' : 'inherit'}">${esc(b.titulo)}</div><div class="a">${esc(b.autor)}</div></div>${b.id === e.bookId ? '<span class="a">ligado</span>' : ''}</button>`).join('') : '<p class="sub">Sua estante está vazia.</p>'}
      <p><button class="link" data-acao="fechar">cancelar</button></p>`);
  },
  async 'apagar-ebook'(el) {
    if (!confirm('Apagar o arquivo deste aparelho? O livro continua na estante.')) return;
    await ebookApagar(el.dataset.e); fecharModal(); aviso('Arquivo apagado'); render();
  },
  'acervo-pt'(el) { const v = !ls.get('acervo_pt', true); ls.set('acervo_pt', v); el.classList.toggle('ativa', v); },
  async baixar(el) {
    const x = acervoRes[+el.dataset.i]; const url = x.formats['application/epub+zip'];
    el.disabled = true; el.textContent = 'Baixando…';
    try {
      const r = await fetch(url.replace('http://', 'https://'));
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const arq = new File([blob], x.title + '.epub', { type: 'application/epub+zip' });
      await importarArquivo(arq, { titulo: x.title, autor: (x.authors[0] || {}).name || '' });
      el.textContent = 'Na aba Ler'; aviso('Baixado. Está na aba Ler.');
    } catch {
      el.disabled = false; el.textContent = 'Baixar';
      modal(`<h2>Não deu para baixar direto</h2><p>O site do acervo não deixou o app baixar sozinho. Abra o link, salve o arquivo e depois use “Escolher arquivo” na aba Ler.</p>
        <p><a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Abrir o arquivo</a></p><p><button class="link" data-acao="fechar">fechar</button></p>`);
    }
  },
  'fechar-leitor'() { history.length > 1 ? history.back() : ir('ler'); },
  anterior() { leitorAtual?.rend.prev(); },
  proxima() { leitorAtual?.rend.next(); },
  limpo() { $('#leitor')?.classList.toggle('limpo'); },
  indice() {
    const toc = leitorAtual?.toc() || [];
    const plano = (l, n = 0) => l.flatMap(t => [{ ...t, n }, ...plano(t.subitems || [], n + 1)]);
    modal(`<h2>Sumário</h2>${plano(toc).map(t => `<button class="item" data-acao="ir-cap" data-h="${esc(t.href)}" style="padding-left:${t.n * 16}px"><span class="t">${esc(t.label.trim())}</span></button>`).join('') || '<p class="sub">Este livro não tem sumário.</p>'}`);
  },
  'ir-cap'(el) { leitorAtual?.rend.display(el.dataset.h); fecharModal(); },
  ajustes() {
    const p = prefsLeitor();
    modal(`<h2>Leitura</h2><div class="ajustes">
      <div><div class="sub" style="margin:0 0 6px">Tema</div><div class="pilulas">${[['papel', 'Papel'], ['sepia', 'Sépia'], ['noite', 'Noite']].map(([k, t]) => `<button class="pilula ${p.tema === k ? 'ativa' : ''}" data-acao="pref" data-k="tema" data-v="${k}">${t}</button>`).join('')}</div></div>
      <div><div class="sub" style="margin:0 0 6px">Letra</div><div class="pilulas">${[['EB Garamond', 'Garamond'], ['Cormorant Garamond', 'Cormorant'], ['system-ui', 'Sem serifa']].map(([k, t]) => `<button class="pilula ${p.fonte === k ? 'ativa' : ''}" data-acao="pref" data-k="fonte" data-v="${k}">${t}</button>`).join('')}</div></div>
      <div><div class="sub" style="margin:0 0 6px">Tamanho: ${p.tamanho}%</div><div class="pilulas"><button class="pilula" data-acao="pref" data-k="tamanho" data-v="-10">A−</button><button class="pilula" data-acao="pref" data-k="tamanho" data-v="10">A+</button></div></div></div>`);
  },
  pref(el) {
    const p = prefsLeitor(); const k = el.dataset.k;
    if (k === 'tamanho') p.tamanho = Math.max(80, Math.min(200, p.tamanho + Number(el.dataset.v))); else p[k] = el.dataset.v;
    ls.set('leitor', p); leitorAtual?.aplicar(); ACOES.ajustes();
  },
  filtro(el) { filtroMural = el.dataset.f; render(); },
  async apoiar(el) {
    try {
      if (el.dataset.sim === 'true') await http('POST', '/rest/v1/mural_apoios', { post_id: Number(el.dataset.id) }, { extras: { Prefer: 'return=minimal,resolution=ignore-duplicates' } });
      else await http('DELETE', `/rest/v1/mural_apoios?post_id=eq.${el.dataset.id}&user_id=eq.${conta.uid}`);
      render();
    } catch (e) { aviso(e.message); }
  },
  async 'apagar-post'(el) { if (!confirm('Apagar este post?')) return; try { await http('DELETE', `/rest/v1/mural_posts?id=eq.${el.dataset.id}`); ir('mural'); } catch (e) { aviso(e.message); } },
  async 'apagar-resp'(el) { if (!confirm('Apagar sua resposta?')) return; try { await http('DELETE', `/rest/v1/mural_respostas?id=eq.${el.dataset.id}`); render(); } catch (e) { aviso(e.message); } },
  async 'apagar-com'(el) { if (!confirm('Apagar seu comentário?')) return; try { await http('DELETE', `/rest/v1/comentarios?id=eq.${el.dataset.id}`); render(); } catch (e) { aviso(e.message); } },
};

document.addEventListener('click', ev => {
  const a = ev.target.closest('[data-acao]');
  if (a) { ev.preventDefault(); const f = ACOES[a.dataset.acao]; if (f) Promise.resolve(f(a)).catch(e => aviso(e.message || 'Algo deu errado.')); return; }
  const l = ev.target.closest('[data-ir]');
  if (l) { ev.preventDefault(); ir(l.dataset.ir); }
});

// ---------------------------------------------------------------- início
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
if (navigator.storage?.persist) navigator.storage.persist().catch(() => { });
render();
if (conta) verificarMural();
