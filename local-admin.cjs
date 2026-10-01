const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFile, spawn} = require('node:child_process');
const {promisify} = require('node:util');
const runFile = promisify(execFile);
const root = __dirname;
const token = crypto.randomBytes(32).toString('hex');
const port = Number(process.env.BIRTHDAY_ADMIN_PORT || 8765);
let busy = false;
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8').replace(/^\uFEFF/, ''));
const write = (name, data) => {
  const target = path.join(root, name);
  fs.writeFileSync(target + '.tmp', JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(target + '.tmp', target);
};
function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  try {fs.appendFileSync(path.join(root, 'admin.log'), line + '\n', 'utf8');}
  catch (error) {console.error('Log yazılamadı:', error.message);}
}
const git = async args => {
  const label = args[0];
  log(`Git ${label}: başladı`);
  try {
    const result = await runFile('git', args, {cwd: root, encoding: 'utf8', timeout: 60000, windowsHide: true, env: {...process.env, GIT_TERMINAL_PROMPT: '0', GIT_SSH_COMMAND: 'ssh -o BatchMode=yes -o ConnectTimeout=15'}});
    log(`Git ${label}: tamamlandı${result.stderr.trim() ? '\n' + result.stderr.trim() : ''}`);
    return result.stdout.trim();
  } catch (error) {
    log(`Git ${label}: HATA\n${error.stderr?.trim() || error.message}`);
    throw error;
  }
};
function validateIbans(list) {
  if (!Array.isArray(list) || !list.length) throw new Error('En az bir IBAN kişisi gerekli.');
  const names = new Set();
  return list.map(item => {
    const name = String(item.name || '').trim();
    const iban = String(item.iban || '').replace(/\s/g, '').toUpperCase();
    if (!name || name.length > 120 || names.has(name.toLocaleLowerCase('tr'))) throw new Error('IBAN kişi adları boş veya tekrarlı olamaz.');
    names.add(name.toLocaleLowerCase('tr'));
    if (!/^TR\d{24}$/.test(iban)) throw new Error(`${name}: IBAN TR ile başlayan 26 karakter olmalı.`);
    const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, c => c.charCodeAt(0) - 55);
    let remainder = 0;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
    if (remainder !== 1) throw new Error(`${name}: IBAN kontrol numarası geçersiz.`);
    return {name, iban: iban.match(/.{1,4}/g).join(' ')};
  });
}
const managed = ['Birthday.html', 'people.json', 'contribution.json', 'ibans.json', 'local-admin.cjs', 'admin.html', 'yonetim.bat', 'README.md', '.gitignore'];
const server = http.createServer(async (req, res) => {
  const send = (status, data) => {res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}); res.end(JSON.stringify(data));};
  if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) return send(403, {error: 'Geçersiz adres.'});
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
    return res.end(fs.readFileSync(path.join(root, 'admin.html'), 'utf8').replace('__TOKEN__', token));
  }
  if (req.headers['x-admin-token'] !== token) return send(403, {error: 'Paneli yeniden açın.'});
  try {
    if (req.method === 'GET' && req.url === '/api/state') return send(200, {people: read('people.json'), ibans: read('ibans.json'), contribution: read('contribution.json'), branch: await git(['branch', '--show-current'])});
    if (req.method !== 'POST' || !['/api/save', '/api/publish'].includes(req.url)) return send(404, {error: 'Bulunamadı.'});
    if (req.headers.origin !== `http://${req.headers.host}`) return send(403, {error: 'Geçersiz kaynak.'});
    if (busy) return send(409, {error: 'İşlem sürüyor, lütfen bekleyin.'});
    busy = true;
    log(`${req.url}: işlem başladı`);
    let saved = false;
    try {
      let body = '';
      for await (const chunk of req) {body += chunk; if (body.length > 100000) throw new Error('İstek çok büyük.');}
      const data = JSON.parse(body);
      const ibans = validateIbans(data.ibans);
      const person = read('people.json').find(p => p.Name === data.birthdayPerson);
      const recipient = ibans.find(p => p.name === data.recipient);
      const amount = Number(data.amount);
      if (!person || !recipient || !Number.isFinite(amount) || amount <= 0 || amount > 1000000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001 || typeof data.active !== 'boolean') throw new Error('Kişileri ve pozitif tutarı kontrol edin (en fazla iki ondalık basamak).');
      const publishing = req.url === '/api/publish';
      if (publishing) {
        if (!await git(['branch', '--show-current'])) throw new Error('Git dalı seçili değil.');
        const staged = (await git(['diff', '--cached', '--name-only'])).split('\n').filter(Boolean);
        if (staged.some(p => !managed.includes(p))) throw new Error('Başka dosyalar Git staging alanında. Önce bunları ayrı commit edin.');
      }
      write('ibans.json', ibans);
      write('contribution.json', {active: data.active, birthdayPerson: person.Name, amount, currency: 'TL', iban: recipient.iban, recipient: recipient.name, updatedAt: new Intl.DateTimeFormat('sv-SE', {timeZone: 'Europe/Istanbul'}).format(new Date())});
      saved = true;
      log('Yerel dosyalar kaydedildi.');
      if (!publishing) return send(200, {message: 'Bilgiler yerel dosyalara kaydedildi.'});
      await git(['add', '--', ...managed]);
      if (await git(['diff', '--cached', '--name-only'])) await git(['commit', '-m', `Update birthday contribution for ${person.Name}`]);
      const branch = await git(['branch', '--show-current']);
      await git(['push', 'origin', branch]);
      log('Yayın tamamlandı.');
      send(200, {message: 'Kaydedildi ve GitHub’a pushlandı. GitHub Pages yayın akışı çalışabilir.'});
    } catch (error) {
      log(`${req.url}: HATA\n${error.stderr?.toString() || error.message}`);
      send(400, {error: (saved ? 'Dosyalar kaydedildi; Git işlemi tamamlanamadı. Yeniden yayınlamayı deneyebilirsiniz.\n' : '') + (error.stderr?.toString() || error.message)});
    } finally {busy = false;}
  } catch (error) {log(`HATA: ${error.message}`); send(500, {error: error.message});}
});
function checkGitWriteAccess() {
  const checkPath = path.join(root, '.git', `panel-write-check-${process.pid}-${crypto.randomBytes(6).toString('hex')}.tmp`);
  let created = false;
  try {
    fs.writeFileSync(checkPath, '', {flag: 'wx'});
    created = true;
    fs.unlinkSync(checkPath);
    return true;
  } catch (error) {
    if (created) {try {fs.unlinkSync(checkPath);} catch {}}
    log(`Git klasörüne yazma izni yok: ${error.message}`);
    console.error('Panel başlatılmadı. yonetim.bat dosyasını Windows Dosya Gezgini üzerinden normal kullanıcı oturumunda açın. Sorun devam ederse .git klasörünün yazma izinlerini kontrol edin.');
    process.exitCode = 1;
    return false;
  }
}
if (checkGitWriteAccess()) server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`Yönetim paneli: ${url}\nKapatmak için Ctrl+C.`);
  if (!process.argv.includes('--no-open')) spawn('cmd.exe', ['/c', 'start', '', url], {windowsHide: true});
});
server.on('error', error => {
  if (error.code !== 'EADDRINUSE') {
    console.error(error.message); process.exitCode = 1; return;
  }
  const url = `http://127.0.0.1:${port}`;
  const probe = http.get(url, response => {
    let body = '';
    response.setEncoding('utf8');
    response.on('data', chunk => {body += chunk; if (body.length > 100000) probe.destroy(new Error('Yanıt çok büyük.'));});
    response.on('end', () => {
      if (response.statusCode === 200 && body.includes('<title>Doğum günü · Yönetim</title>')) {
        console.log(`Panel zaten çalışıyor: ${url}`);
        if (!process.argv.includes('--no-open')) spawn('cmd.exe', ['/c', 'start', '', url], {windowsHide: true});
      } else {
        console.error(`${port} portunu başka bir uygulama kullanıyor. BIRTHDAY_ADMIN_PORT ile farklı bir port seçin.`);
        process.exitCode = 1;
      }
    });
  });
  probe.setTimeout(3000, () => probe.destroy(new Error('Zaman aşımı.')));
  probe.on('error', () => {
    console.error(`${port} portu dolu; çalışan panele ulaşılamadı.`);
    process.exitCode = 1;
  });
});
