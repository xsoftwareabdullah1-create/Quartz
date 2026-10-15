const express=require('express');
const session=require('express-session');
const pg=require('pg');
const connectPgSimple=require('connect-pg-simple');
const nodemailer=require('nodemailer');
const {OAuth2Client}=require('google-auth-library');
const crypto=require('node:crypto');
const required=['DATABASE_URL','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','SESSION_SECRET','QUARTZ_PUBLIC_URL','QUARTZ_WEB_URL'];
for(const key of required){if(!process.env[key]){console.error('Missing required environment variable: '+key);process.exit(1);}}
if(process.env.SESSION_SECRET.length<32){console.error('SESSION_SECRET must contain at least 32 characters.');process.exit(1);}
const app=express(),pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='disable'?false:{rejectUnauthorized:true}});
const callback=new URL('/auth/google/callback',process.env.QUARTZ_PUBLIC_URL).toString();
const oauth=new OAuth2Client(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,callback);
const PgStore=connectPgSimple(session),webOrigin=new URL(process.env.QUARTZ_WEB_URL).origin,cookieSecure=new URL(process.env.QUARTZ_PUBLIC_URL).protocol==='https:';
const mailReady=Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS&&process.env.MAIL_FROM);
const mailer=mailReady?nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:String(process.env.SMTP_SECURE||'false')==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000}):null;
app.disable('x-powered-by');app.set('trust proxy',1);app.use(express.json({limit:'8kb'}));
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');const origin=req.get('Origin');if(origin&&origin===webOrigin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');}if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return res.sendStatus(204);}next();});
app.use(session({name:'quartz.sid',store:new PgStore({pool,createTableIfMissing:true,tableName:'quartz_sessions'}),secret:process.env.SESSION_SECRET,resave:false,saveUninitialized:false,rolling:true,cookie:{httpOnly:true,secure:cookieSecure,sameSite:cookieSecure?'none':'lax',path:'/',maxAge:7*24*60*60*1000}}));
function cleanBase(v){return String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9._-]/g,'').replace(/^[._-]+|[._-]+$/g,'').slice(0,24);}
function normalizeEmail(v){return String(v||'').trim().toLowerCase();}
function validEmail(v){return v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);}
function hashCode(email,code){return crypto.createHash('sha256').update(email+':'+code+':'+process.env.SESSION_SECRET).digest();}
function saveSession(req,res,next,user){req.session.regenerate(err=>{if(err)return next(err);req.session.userId=String(user.id);req.session.save(err=>{if(err)return next(err);res.json({ok:true,authenticated:true,user:{username:user.username,email:user.email,display_name:user.display_name}});});});}
async function allocateUsername(client,preferred){let base=cleanBase(preferred)||'quartzuser';for(let i=0;i<10000;i++){const username=i===0?base:base.slice(0,Math.max(1,24-String(i).length-1))+'-'+i;const found=await client.query('SELECT 1 FROM quartz_users WHERE username=$1',[username]);if(!found.rowCount)return username;}throw new Error('Could not allocate unique username');}
async function provisionGoogle(p){
 const googleId=p.sub,displayName=String(p.name||'').trim().slice(0,120)||'Quartz user',loginEmail=normalizeEmail(p.email);
 const c=await pool.connect();
 try{await c.query('BEGIN');
  let found=await c.query('SELECT id,google_sub,username,email,display_name FROM quartz_users WHERE google_sub=$1 FOR UPDATE',[googleId]);
  if(!found.rowCount)found=await c.query('SELECT id,google_sub,username,email,display_name FROM quartz_users WHERE login_email=$1 FOR UPDATE',[loginEmail]);
  if(found.rowCount){const u=found.rows[0];if(u.google_sub&&u.google_sub!==googleId)throw new Error('Email is already linked to another Google identity');const updated=await c.query('UPDATE quartz_users SET google_sub=$2,google_email=$3,login_email=$4,display_name=$5,last_login_at=NOW() WHERE id=$1 RETURNING id,username,email,display_name',[u.id,googleId,loginEmail,loginEmail,displayName]);await c.query('COMMIT');return updated.rows[0];}
  const username=await allocateUsername(c,displayName.replace(/\s+/g,'.')||loginEmail.split('@')[0]);
  const inserted=await c.query('INSERT INTO quartz_users(google_sub,google_email,login_email,username,email,display_name,email_verified,created_at,last_login_at) VALUES($1,$2,$3,$4,$5,$6,TRUE,NOW(),NOW()) RETURNING id,username,email,display_name',[googleId,loginEmail,loginEmail,username,username+'@quartz.com',displayName]);
  await c.query('COMMIT');return inserted.rows[0];
 }catch(e){await c.query('ROLLBACK');if(e.code==='23505')throw new Error('Identity conflict; please sign in again');throw e;}finally{c.release();}
}
async function provisionEmailIdentity(email){
 const c=await pool.connect();
 try{await c.query('BEGIN');let q=await c.query('SELECT id,username,email,display_name FROM quartz_users WHERE login_email=$1 FOR UPDATE',[email]);
  if(q.rowCount){const u=q.rows[0];await c.query('UPDATE quartz_users SET email_verified=TRUE,last_login_at=NOW() WHERE id=$1',[u.id]);await c.query('COMMIT');return u;}
  const username=await allocateUsername(c,cleanBase(email.split('@')[0])||'quartzuser');
  const displayName=email.split('@')[0].slice(0,120)||'Quartz user';
  q=await c.query('INSERT INTO quartz_users(login_email,username,email,display_name,email_verified,created_at,last_login_at) VALUES($1,$2,$3,$4,TRUE,NOW(),NOW()) RETURNING id,username,email,display_name',[email,username,username+'@quartz.com',displayName]);
  await c.query('COMMIT');return q.rows[0];
 }catch(e){await c.query('ROLLBACK');if(e.code==='23505')throw new Error('Account conflict; please try again');throw e;}finally{c.release();}
}
app.get('/health',async(_req,res)=>{try{await pool.query('SELECT 1');res.json({ok:true,service:'quartz-auth',emailSignInConfigured:mailReady});}catch{res.status(503).json({ok:false});}});
app.post('/auth/email/request',async(req,res)=>{if(!mailReady)return res.status(503).json({error:'Email sign-in is not configured on the server yet.'});const email=normalizeEmail(req.body?.email);if(!validEmail(email))return res.status(400).json({error:'Enter a valid email address.'});try{
 const recent=await pool.query('SELECT last_sent_at FROM quartz_email_codes WHERE email=$1',[email]);
 if(recent.rowCount&&Date.now()-new Date(recent.rows[0].last_sent_at).getTime()<60000)return res.status(429).json({error:'Please wait 60 seconds before requesting another code.'});
 const code=String(crypto.randomInt(0,1000000)).padStart(6,'0'),digest=hashCode(email,code);
 await pool.query('INSERT INTO quartz_email_codes(email,code_hash,expires_at,attempts,last_sent_at) VALUES($1,$2,NOW()+INTERVAL \'10 minutes\',0,NOW()) ON CONFLICT(email) DO UPDATE SET code_hash=EXCLUDED.code_hash,expires_at=EXCLUDED.expires_at,attempts=0,last_sent_at=NOW()',[email,digest]);
 try{await mailer.sendMail({from:process.env.MAIL_FROM,to:email,subject:'Your Quartz sign-in code',text:'Your Quartz sign-in code is '+code+'. It expires in 10 minutes. If you did not request this, you can ignore this email.',html:'<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#202124"><h2>Sign in to Quartz</h2><p>Use this one-time code to finish signing in:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">'+code+'</p><p>This code expires in 10 minutes. If you did not request it, ignore this email.</p></div>'});}
 catch(e){await pool.query('DELETE FROM quartz_email_codes WHERE email=$1',[email]);console.error('Quartz email delivery failed:',e.message);return res.status(502).json({error:'Could not send the email right now. Please try again later.'});}
 return res.json({ok:true,message:'If this address can receive mail, a sign-in code has been sent.'});
 }catch(e){console.error('Email code request failed:',e.message);return res.status(500).json({error:'Could not start email sign-in.'});}});
app.post('/auth/email/verify',async(req,res,next)=>{const email=normalizeEmail(req.body?.email),code=String(req.body?.code||'').trim();if(!validEmail(email)||!/^\d{6}$/.test(code))return res.status(400).json({error:'Enter the email address and six-digit code.'});try{
 const c=await pool.connect();let valid=false;
 try{await c.query('BEGIN');const q=await c.query('SELECT code_hash,expires_at,attempts FROM quartz_email_codes WHERE email=$1 FOR UPDATE',[email]);if(q.rowCount){const row=q.rows[0];if(Number(row.attempts)<5&&new Date(row.expires_at)>new Date()){const expected=Buffer.from(row.code_hash),actual=hashCode(email,code);valid=expected.length===actual.length&&crypto.timingSafeEqual(expected,actual);}if(!valid){const attempts=Number(row.attempts)+1;if(attempts>=5||new Date(row.expires_at)<=new Date())await c.query('DELETE FROM quartz_email_codes WHERE email=$1',[email]);else await c.query('UPDATE quartz_email_codes SET attempts=$2 WHERE email=$1',[email,attempts]);}else await c.query('DELETE FROM quartz_email_codes WHERE email=$1',[email]);}await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 if(!valid)return res.status(401).json({error:'That code is invalid or expired. Request a new code and try again.'});
 const user=await provisionEmailIdentity(email);return saveSession(req,res,next,user);
 }catch(e){next(e);}});
app.get('/auth/google',(req,res,next)=>{const state=crypto.randomBytes(32).toString('hex');req.session.oauthState=state;req.session.save(err=>{if(err)return next(err);res.redirect(oauth.generateAuthUrl({access_type:'online',scope:['openid','email','profile'],state,prompt:'select_account'}));});});
app.get('/auth/google/callback',async(req,res,next)=>{try{
 const state=req.query.state;
 if(!req.query.code||typeof state!=='string'||!req.session.oauthState||Buffer.byteLength(state)!==Buffer.byteLength(req.session.oauthState)||!crypto.timingSafeEqual(Buffer.from(state),Buffer.from(req.session.oauthState)))return res.status(400).send('Invalid OAuth state. Return to Quartz and try again.');
 delete req.session.oauthState;
 const {tokens}=await oauth.getToken(String(req.query.code));if(!tokens.id_token)return res.status(401).send('Google did not return an ID token.');
 const ticket=await oauth.verifyIdToken({idToken:tokens.id_token,audience:process.env.GOOGLE_CLIENT_ID}),p=ticket.getPayload();
 if(!p||!p.sub||!p.email||p.email_verified!==true)return res.status(403).send('A Google account with a verified email is required.');
 const user=await provisionGoogle(p);
 await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
 req.session.userId=String(user.id);
 req.session.save(e=>{if(e)return next(e);res.redirect(new URL('/?quartz_signin=success',process.env.QUARTZ_WEB_URL).toString());});
 }catch(e){next(e);}});
app.get('/auth/me',async(req,res)=>{if(!req.session.userId)return res.status(401).json({authenticated:false});try{const q=await pool.query('SELECT username,email,display_name FROM quartz_users WHERE id=$1',[req.session.userId]);if(!q.rowCount){req.session.destroy(()=>{});return res.status(401).json({authenticated:false});}res.json({authenticated:true,user:q.rows[0]});}catch{res.status(500).json({error:'Unable to load Quartz profile'});}});
app.post('/auth/logout',(req,res)=>req.session.destroy(e=>{if(e)return res.status(500).json({error:'Unable to sign out'});res.clearCookie('quartz.sid',{path:'/',secure:cookieSecure,sameSite:'lax'});res.json({ok:true});}));
app.use((e,_req,res,_next)=>{console.error('Quartz auth request failed:',e.message);if(!res.headersSent)res.status(500).json({error:'Quartz sign-in could not be completed. Please try again later.'});});
async function start(){
 await pool.query(`CREATE TABLE IF NOT EXISTS quartz_users(id BIGSERIAL PRIMARY KEY,google_sub TEXT UNIQUE,google_email TEXT,login_email TEXT UNIQUE,username VARCHAR(24) NOT NULL UNIQUE,email VARCHAR(255) NOT NULL UNIQUE,display_name VARCHAR(120) NOT NULL,email_verified BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await pool.query('ALTER TABLE quartz_users ALTER COLUMN google_sub DROP NOT NULL');
 await pool.query('ALTER TABLE quartz_users ALTER COLUMN google_email DROP NOT NULL');
 await pool.query('ALTER TABLE quartz_users ADD COLUMN IF NOT EXISTS login_email TEXT');
 await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS quartz_users_login_email_unique ON quartz_users(login_email) WHERE login_email IS NOT NULL');
 await pool.query(`CREATE TABLE IF NOT EXISTS quartz_email_codes(email TEXT PRIMARY KEY,code_hash BYTEA NOT NULL,expires_at TIMESTAMPTZ NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 const port=Number(process.env.PORT||8788);app.listen(port,'0.0.0.0',()=>console.log('Quartz auth listening on :'+port+'; email sign-in '+(mailReady?'enabled':'disabled (SMTP not configured)')));
}
start().catch(e=>{console.error('Quartz auth startup failed:',e);process.exit(1);});
