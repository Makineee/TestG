const http=require("http"),fs=require("fs"),path=require("path");
const PIN=process.env.ADMIN_PIN||"1234",PORT=process.env.PORT||3000;
const R2A=["Avalanche","Hallucination","Commercial emporia","Great Game","Caravanserai","Autonomous region","Sedentary civilization"];
const TN=["🐪 Team 1","🦅 Team 2","🐉 Team 3","🐎 Team 4","🐅 Team 5"];
const WIN_MS=6000,ANS_MS=15000;
function failTeam(g,team,why){g.out=[...g.out,team];if(!g.steal){g.steal=true;g.owner=team}g.answering=null;g.answer=null;g.flash=why;if(g.out.length>=5){g.done=true;g.msg="No team got it right."}}
const norm=t=>String(t).toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();
function judge(team,ans){const g=S.game;if(!g||g.phase!=="r2"||g.done||g.answering!==team)return;
 const right=R2A[g.qs[g.q]],sc=[...g.scores];
 if(norm(ans)===norm(right)){
  if(!g.steal){sc[team]+=5;g.msg=`${TN[team]} is correct: +5 💎`}
  else{const h=Math.max(0,Math.floor(sc[g.owner]/2));sc[g.owner]-=h;sc[team]+=h;g.msg=`${TN[team]} stole it and takes ${h} 💎 from ${TN[g.owner]}`}
  g.scores=sc;g.done=true;g.answering=null;g.answer=right;g.flash="";
 }else failTeam(g,team,`${TN[team]} answered wrong!`);}
function fastest(g,key){return [0,1,2,3,4].filter(i=>S.teams["t"+i]&&S.teams["t"+i].buzzKey===key&&!g.out.includes(i)).sort((a,b)=>S.teams["t"+a].ts-S.teams["t"+b].ts)[0]}
function onBuzz(){const g=S.game;if(!g||g.phase!=="r2"||g.done||g.answering!=null)return;
 const key=g.q+"-"+g.out.length;if(g.buzzKey===key||fastest(g,key)===undefined)return;
 g.buzzKey=key;g.buzzAt=Date.now();const q=g.q;
 setTimeout(()=>{const g=S.game;if(!g||g.phase!=="r2"||g.done||g.answering!=null||g.buzzKey!==key||g.q!==q)return;
  const f=fastest(g,key);if(f===undefined)return;
  g.answering=f;g.answer=null;g.flash="";const at=g.ansAt=Date.now();bc();
  setTimeout(()=>{const g=S.game;if(g&&!g.done&&g.answering===f&&g.ansAt===at&&g.q===q){failTeam(g,f,`${TN[f]} ran out of time!`);bc()}},ANS_MS)},WIN_MS)}
let S={game:null,teams:{}};const cl=new Set();
const FILE=path.join(__dirname,"state.json");try{S=JSON.parse(fs.readFileSync(FILE,"utf8"))}catch(e){}
const bc=()=>{try{fs.writeFile(FILE,JSON.stringify(S),()=>{})}catch(e){}const m=`data: ${JSON.stringify({...S,now:Date.now()})}\n\n`;cl.forEach(r=>r.write(m))};
http.createServer((req,res)=>{
 if(req.url==="/events"){res.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache",Connection:"keep-alive"});res.write(`data: ${JSON.stringify({...S,now:Date.now()})}\n\n`);cl.add(res);req.on("close",()=>cl.delete(res));return}
 if(req.url==="/api"&&req.method==="POST"){let b="";req.on("data",c=>b+=c);req.on("end",()=>{try{
  const {path:p,op,data,pin}=JSON.parse(b),adm=pin===PIN;
  if(p==="game/answer"){if(!data||typeof data.answer!=="string"||data.answer.length>80)throw 0;judge(+data.team,data.answer)}
  else if(p==="game/state"){
   if(op==="set"){if(!adm)throw 0;S.game=data}
   else{const k=Object.keys(data);if(!adm&&!(k.length===1&&k[0]==="answer"))throw 0;S.game={...S.game,...data}}
  }else if(/^teams\/t[0-4]$/.test(p)){
   if(data&&data.buzzKey){const g=S.game;if(g&&g.phase==="r2"&&Date.now()<g.qStart+15000-300)throw 0}
   const id=p.slice(6);if(data&&"ts" in data)data.ts=Date.now();if(op==="set"){if(!adm)throw 0;S.teams[id]=data}else S.teams[id]={...S.teams[id],...data}
  }else throw 0;
  if(p.startsWith("teams/")&&data&&data.buzzKey)onBuzz();
  bc();res.end("ok")}catch(e){res.statusCode=403;res.end("no")}});return}
 fs.readFile(path.join(__dirname,"index.html"),(e,d)=>{res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});res.end(d)});
}).listen(PORT,()=>console.log("Game chạy tại http://localhost:"+PORT+"  |  Admin: /#admin  |  PIN: "+PIN));
