const { Client, GatewayIntentBits, Events } = require('discord.js');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy: DiscordStrategy } = require('passport-discord');

// 🔐 Umgebungsvariablen laden
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

// ✅ PRÜFUNG: Sind alle Variablen gesetzt?
const missingVars = [];
if (!BOT_TOKEN) missingVars.push('BOT_TOKEN');
if (!CLIENT_ID) missingVars.push('CLIENT_ID');
if (!CLIENT_SECRET) missingVars.push('CLIENT_SECRET');
if (!REDIRECT_URI) missingVars.push('REDIRECT_URI');
if (!SESSION_SECRET) missingVars.push('SESSION_SECRET');

if (missingVars.length > 0) {
  console.error('🚨 FEHLER: Folgende Environment Variables fehlen:');
  console.error('   ' + missingVars.join(', '));
  process.exit(1);
}

console.log('✅ Alle Environment Variables gefunden!');
console.log(`🌐 Redirect URI: ${REDIRECT_URI}`);

// 🤖 Discord Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot online als ${client.user.tag}`);
});

client.on(Events.MessageCreate, (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!ping') msg.reply('🏓 Pong!');
});

// 🌐 Dashboard
const app = express();

// 🔧 Bessere Fehlerbehandlung
app.use((err, req, res, next) => {
  console.error('❌ Express Error:', err);
  res.status(500).send(`
    <h1>Internal Server Error</h1>
    <p><strong>Fehler:</strong> ${err.message}</p>
    <p><strong>Details:</strong> ${err.toString()}</p>
    <hr>
    <p>📋 Überprüfe die Render-Logs für mehr Informationen!</p>
  `);
});

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  callbackURL: REDIRECT_URI,
  scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
  console.log('✅ Discord Callback erfolgreich!');
  console.log('User:', profile.username);
  return done(null, profile);
}));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24 Stunden
  }
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  res.send(`<h1>🤖 Bot Dashboard</h1><p><a href="/login">Mit Discord anmelden</a></p>`);
});

app.get('/login', (req, res, next) => {
  console.log('🔐 Login gestartet...');
  passport.authenticate('discord')(req, res, next);
});

app.get('/callback', (req, res, next) => {
  console.log('📞 Callback erhalten von:', req.query);
  passport.authenticate('discord', { 
    failureRedirect: '/',
    failureMessage: true
  })(req, res, next);
}, (req, res) => {
  console.log('✅ Authentifizierung erfolgreich, Redirect zu /dashboard');
  res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
  if (!req.user) {
    console.log('⚠️ Kein User in Session');
    return res.redirect('/');
  }
  console.log('📊 Dashboard angezeigt für:', req.user.username);
  res.send(`
    <h2>👋 Willkommen, ${req.user.username}!</h2>
    <p>Bot-Status: ${client.isReady() ? '🟢 Online' : '🔴 Offline'}</p>
    <p><a href="/logout">Logout</a></p>
  `);
});

app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Dashboard läuft auf Port ${PORT}`));
client.login(BOT_TOKEN).catch((e) => console.error('🚨 Bot Login fehlgeschlagen:', e.message));
