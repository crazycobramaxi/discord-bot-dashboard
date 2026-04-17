const { Client, GatewayIntentBits, Events } = require('discord.js');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy: DiscordStrategy } = require('passport-discord');

// 🔐 Umgebungsvariablen (werden in Render eingetragen)
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

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

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  callbackURL: REDIRECT_URI,
  scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  res.send(`<h1>🤖 Bot Dashboard</h1><p><a href="/login">Mit Discord anmelden</a></p>`);
});

app.get('/login', passport.authenticate('discord'));
app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
  if (!req.user) return res.redirect('/');
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
client.login(BOT_TOKEN).catch((e) => console.error('🚨 Login fehlgeschlagen:', e.message));
