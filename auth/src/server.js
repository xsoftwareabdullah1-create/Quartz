const express=require('express');
const session=require('express-session');
const pg=require('pg');
const connectPgSimple=require('connect-pg-simple');
const {OAuth2Client}=require('google-auth-library');
const crypto=require('node:crypto');
const required=['DATABASE_URL','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','SESSION_SECRET','QUARTZ_PUBLIC_URL','QUARTZ_WEB_URL'];
for(const key of required){if(!process.env[key]){console.error('Missing required environment variable: '+key);process.exit(1);}}
if(process.env.SESSION_SECRET.length<32){console.error('SESSION_SECRET must contain at least 32 characters.');process.exit(1);}
const app=express(),pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='disable'?false:{rejectUnauthorized:true}});
const callback=new URL('/auth/google/callback',process.env.QUARTZ_PUBLIC_URL).toString();
const oauth=new OAuth2Client(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,callback);
const PgStore=connectPgSimple(session),webOrigin=new URL(process.env.QUARTZ_WEB_URL).origin,cookieSecure=new URL(process.env.QUARTZ_PUBLIC_URL).protocol==='https:';
app.disable('x-powered-by');app.set('trust proxy',1);
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');const origin=req.get('Origin');if(origin&&origin===webOrigin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');}if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return res.sendStatus(204);}next();});
app.use(session({name:'quartz.sid',store:new PgStore({pool,createTableIfMissing:true,tableName:'quartz_sessions'}),secret:process.env.SESSION_SECRET,resave:false,saveUninitialized:false,rolling:true,cookie:{httpOnly:true,secure:cookieSecure,sameSite:'lax',path:'/',maxAge:7*24*60*60*1000}}));
function cleanBase(v){return String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9._-]/g,'').replace(/^[._-]+|[._-]+$/g,'').slice(0,24);}
async function provisionIdentity(p){
 const googleId=p.sub,displayName=String(p.name||'').trim().slice(0,120)||'Quartz user';
 const preferred=cleanBase(displayName.replace(/\s+/g,'.'))||cleanBase((p.email||'').split('@')[0])||'quartzuser';
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const found=await c.query('SELECT id,google_sub,username,email,display_name FROM quartz_users WHERE google_sub=$1 FOR UPDATE',[googleId]);
  if(found.rowCount){await c.query('UPDATE quartz_users SET display_name=$2,last_login_at=NOW() WHERE id=$1',[found.rows[0].id,displayName]);await c.query('COMMIT');return {...found.rows[0],display_name:displayName};}
  let username=preferred;
  for(let i=0;;i++){if(i>9999)throw new Error('Could not allocate unique username');username=i===0?preferred:preferred.slice(0,Math.max(1,24-String(i).length-1))+'-'+i;const taken=await c.query('SELECT 1 FROM quartz_users WHERE username=$1',[username]);if(!taken.rowCount)break;}
  const email=username+'@quartz.com';
  const inserted=await c.query('INSERT INTO quartz_users(google_sub,google_email,username,email,display_name,email_verified,created_at,last_login_at) VALUES($1,$2,$3,$4,$5,$6,NOW(),NOW()) RETURNING id,google_sub,username,email,display_name',[googleId,p.email,username,email,displayName,Boolean(p.email_verified)]);
  await c.query('COMMIT');return inserted.rows[0];
 }catch(e){await c.query('ROLLBACK');if(e.code==='23505')throw new Error('Identity conflict; please sign in again');throw e;}finally{c.release();}
}
app.get('/health',async(_req,res)=>{try{await pool.query('SELECT 1');res.json({ok:true,service:'quartz-auth'});}catch{res.status(503).json({ok:false});}});
app.get('/auth/google',(req,res,next)=>{const state=crypto.randomBytes(32).toString('hex');req.session.oauthState=state;req.session.save(err=>{if(err)return next(err);res.redirect(oauth.generateAuthUrl({access_type:'online',scope:['openid','email','profile'],state,prompt:'select_account'}));});});
app.get('/auth/google/callback',async(req,res,next)=>{try{
 const state=req.query.state;
 if(!req.query.code||typeof state!=='string'||!req.session.oauthState||Buffer.byteLength(state)!==Buffer.byteLength(req.session.oauthState)||!crypto.timingSafeEqual(Buffer.from(state),Buffer.from(req.session.oauthState)))return res.status(400).send('Invalid OAuth state. Return to Quartz and try again.');
 delete req.session.oauthState;
 const {tokens}=await oauth.getToken(String(req.query.code));if(!tokens.id_token)return res.status(401).send('Google did not return an ID token.');
 const ticket=await oauth.verifyIdToken({idToken:tokens.id_token,audience:process.env.GOOGLE_CLIENT_ID}),p=ticket.getPayload();
 if(!p||!p.sub||!p.email||p.email_verified!==true)return res.status(403).send('A Google account with a verified email is required.');
 const user=await provisionIdentity(p);
 await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
 req.session.userId=String(user.id);
 req.session.save(e=>{if(e)return next(e);res.redirect(new URL('/?quartz_signin=success',process.env.QUARTZ_WEB_URL).toString());});
 }catch(e){next(e);}});
app.get('/auth/me',async(req,res)=>{if(!req.session.userId)return res.status(401).json({authenticated:false});try{const q=await pool.query('SELECT username,email,display_name FROM quartz_users WHERE id=$1',[req.session.userId]);if(!q.rowCount){req.session.destroy(()=>{});return res.status(401).json({authenticated:false});}res.json({authenticated:true,user:q.rows[0]});}catch{res.status(500).json({error:'Unable to load Quartz profile'});}});
app.post('/auth/logout',(req,res)=>req.session.destroy(e=>{if(e)return res.status(500).json({error:'Unable to sign out'});res.clearCookie('quartz.sid',{path:'/',secure:cookieSecure,sameSite:'lax'});res.json({ok:true});}));
app.use((e,_req,res,_next)=>{console.error('Quartz auth request failed:',e.message);if(!res.headersSent)res.status(500).send('Quartz sign-in could not be completed. Please try again later.');});
async function start(){await pool.query(`CREATE TABLE IF NOT EXISTS quartz_users(id BIGSERIAL PRIMARY KEY,google_sub TEXT NOT NULL UNIQUE,google_email TEXT NOT NULL,username VARCHAR(24) NOT NULL UNIQUE,email VARCHAR(255) NOT NULL UNIQUE,display_name VARCHAR(120) NOT NULL,email_verified BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);const port=Number(process.env.PORT||8788);app.listen(port,'0.0.0.0',()=>console.log('Quartz auth listening on :'+port));}
start().catch(e=>{console.error('Quartz auth startup failed:',e);process.exit(1);});
