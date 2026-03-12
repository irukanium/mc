let throwCount=0;
let finalX=0, finalZ=0;
const strongholdImg=new Image();
strongholdImg.src="https://raw.githubusercontent.com/irukanium/mc/refs/heads/main/eyeender.png";
const methodSelect=document.getElementById("methodSelect");
methodSelect.addEventListener("change",()=>{ resetAll(); });

// 投目追加
function addThrow(){
    const method = methodSelect.value;
    throwCount++;
    const div=document.createElement("div");
    div.className="section";
    let req=throwCount<=2?" 必須":"";
    if(method==="yaw"){
        div.innerHTML=`<h3>${throwCount}投目${req}</h3>
        <input class="x" type="number" placeholder="X"><br>
        <input class="z" type="number" placeholder="Z"><br>
        <input class="yaw" type="number" placeholder="Yaw">`;
    } else {
        div.innerHTML=`<h3>${throwCount}投目</h3>
        <input class="px" type="number" placeholder="PlayerX"><br>
        <input class="pz" type="number" placeholder="PlayerZ"><br>
        <input class="ex" type="number" placeholder="EyeX"><br>
        <input class="ez" type="number" placeholder="EyeZ">`;
    }
    document.getElementById("throws").appendChild(div);
    updateDeleteButton();
}
function updateDeleteButton(){
    const sections=document.querySelectorAll("#throws .section");
    sections.forEach(div=>{ const btn=div.querySelector(".deleteBtn"); if(btn) btn.remove(); });
    if(sections.length>=3){
        let lastDiv=sections[sections.length-1];
        let delBtn=document.createElement("button");
        delBtn.textContent="削除"; delBtn.className="deleteBtn";
        delBtn.onclick=function(){ lastDiv.remove(); throwCount--; updateThrowNumbers(); updateDeleteButton(); };
        lastDiv.appendChild(delBtn);
    }
}
function updateThrowNumbers(){
    const sections=document.querySelectorAll("#throws .section");
    throwCount=sections.length;
    sections.forEach((div,i)=>{ const h3=div.querySelector("h3"); let req=i<2?" 必須":""; h3.textContent=`${i+1}投目${req}`; });
}

// --- 計算 ---
function calc(){ const method=methodSelect.value; if(method==="yaw") calcYaw(); else calcXZ(); }

function calcYaw(){
    let xs=document.querySelectorAll(".x"), zs=document.querySelectorAll(".z"), yaws=document.querySelectorAll(".yaw");
    let lines=[], throwsList=[];
    for(let i=0;i<xs.length;i++){
        let x=parseFloat(xs[i].value), z=parseFloat(zs[i].value), yaw=parseFloat(yaws[i].value);
        if(isNaN(x)||isNaN(z)||isNaN(yaw)) continue;
        let r=yaw*Math.PI/180;
        lines.push({x,z,dx:-Math.sin(r),dz:Math.cos(r)}); throwsList.push({x,z,yaw});
    }
    if(lines.length<2){ notice(1); return; }
    let points=[];
    for(let i=0;i<lines.length;i++){
        for(let j=i+1;j<lines.length;j++){
            const p=intersect(lines[i],lines[j]); if(p) points.push(p);
        }
    }
    if(points.length===0){ notice(2); return; }
    let sx=0, sz=0; points.forEach(p=>{ sx+=p.x; sz+=p.z; });
    sx/=points.length; sz/=points.length; finalX=Math.round(sx); finalZ=Math.round(sz);
    drawMapYaw(throwsList,{x:finalX,z:finalZ});
    displayResult(throwsList);
}

function calcXZ(){
    let sections=document.querySelectorAll(".section"), throws=[];
    sections.forEach(sec=>{
        let px=parseFloat(sec.querySelector(".px")?.value), pz=parseFloat(sec.querySelector(".pz")?.value),
            ex=parseFloat(sec.querySelector(".ex")?.value), ez=parseFloat(sec.querySelector(".ez")?.value);
        if([px,pz,ex,ez].some(v=>isNaN(v))) return;
        let dx=ex-px, dz=ez-pz, len=Math.sqrt(dx*dx+dz*dz); throws.push({px,pz,dx:dx/len,dz:dz/len});
    });
    if(throws.length<2){ notice(1); return; }
    let sumX=0,sumZ=0,count=0;
    for(let i=0;i<throws.length;i++){ for(let j=i+1;j<throws.length;j++){ let inter=lineIntersection(throws[i],throws[j]); if(inter){ sumX+=inter.x; sumZ+=inter.z; count++; } } }
    if(count===0){ notice(2); return; }
    finalX=Math.round(sumX/count); finalZ=Math.round(sumZ/count);
    drawMapYaw(throws.map(t=>({x:t.px,z:t.pz,yaw:0})),{x:finalX,z:finalZ});
    displayResult(throws.map(t=>({x:t.px,z:t.pz})));
}

// --- 共通 ---
function intersect(a,b){ const det=a.dx*b.dz-a.dz*b.dx; if(Math.abs(det)<1e-6) return null; const t=((b.x-a.x)*b.dz-(b.z-a.z)*b.dx)/det; return {x:a.x+a.dx*t, z:a.z+a.dz*t}; }
function lineIntersection(t1,t2){ const det=t1.dx*t2.dz-t1.dz*t2.dx; if(Math.abs(det)<1e-6) return null; const t=((t2.px-t1.px)*t2.dz-(t2.pz-t1.pz)*t2.dx)/det; return {x:t1.px+t1.dx*t, z:t1.pz+t1.dz*t}; }

// --- 描画 ---
function drawMapYaw(throwsList,final){
    const canvas=document.getElementById("mapCanvas"), ctx=canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(throwsList.length===0 || !final) return;
    let allX=throwsList.map(t=>t.x).concat(final.x), allZ=throwsList.map(t=>t.z).concat(final.z);
    let minX=Math.min(...allX), maxX=Math.max(...allX), minZ=Math.min(...allZ), maxZ=Math.max(...allZ);
    let padding=50;
    let scale=Math.min((canvas.width-padding*2)/(maxX-minX||1),(canvas.height-padding*2)/(maxZ-minZ||1));
    const toCanvas=(x,z)=>({cx:padding+(x-minX)*scale, cz:canvas.height-(padding+(z-minZ)*scale)});
    throwsList.forEach((t,i)=>{
        let pos=toCanvas(t.x,t.z);
        let len=50; let rad=(t.yaw||0)*Math.PI/180;
        let dx=-Math.sin(rad)*len*scale/10, dz=Math.cos(rad)*len*scale/10;
        ctx.strokeStyle="rgba(0,255,0,0.4)"; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(pos.cx,pos.cz); ctx.lineTo(pos.cx+dx,pos.cz-dz); ctx.stroke();
        ctx.fillStyle="lime"; ctx.beginPath(); ctx.arc(pos.cx,pos.cz,6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#fff"; ctx.font="12px DotGothic16";
        let text=`${i+1}投目 (${Math.round(t.x)},${Math.round(t.z)})`;
        let textWidth=ctx.measureText(text).width;
        let textX=pos.cx+8, textY=pos.cz-8;
        if(textX+textWidth>canvas.width) textX=canvas.width-textWidth-2;
        if(textX<0) textX=0; if(textY<12) textY=12; if(textY>canvas.height-2) textY=canvas.height-2;
        ctx.fillText(text,textX,textY);
    });
    let fpos=toCanvas(final.x,final.z); const size=24;
    if(strongholdImg.complete){ ctx.drawImage(strongholdImg,fpos.cx-size/2,fpos.cz-size/2,size,size); }
    ctx.fillStyle="#fff"; ctx.font="12px DotGothic16";
    let text=`推定 (${final.x},${final.z})`;
    let textWidth=ctx.measureText(text).width;
    let textX=fpos.cx+10, textY=fpos.cz-10;
    if(textX+textWidth>canvas.width) textX=fpos.cx-textWidth-10;
    if(textX<0) textX=0; if(textY<12) textY=12; if(textY>canvas.height-2) textY=canvas.height-2;
    ctx.fillText(text,textX,textY);
    ctx.strokeStyle="rgba(0,255,0,0.3)"; ctx.lineWidth=2;
    throwsList.forEach(t=>{ let tpos=toCanvas(t.x,t.z); ctx.beginPath(); ctx.moveTo(tpos.cx,tpos.cz); ctx.lineTo(fpos.cx,fpos.cz); ctx.stroke(); });
}

// --- 結果表示 ---
function displayResult(throwsList){
    let text=`<div class="resultBox"><table>`;
    text+=`<tr><td>推定</td><td>:</td><td>X ${finalX} , Z ${finalZ}</td></tr>`;
    text+=`<tr><td>チャンク</td><td>:</td><td>${Math.floor(finalX/16)} , ${Math.floor(finalZ/16)}</td></tr>`;
    text+=`<tr><td>ネザー</td><td>:</td><td>X ${Math.round(finalX/8)} , Z ${Math.round(finalZ/8)}</td></tr></table>`;
    let lowAccuracy=false;
    throwsList.forEach((t,i)=>{
        let dist=Math.hypot(finalX-t.x,finalZ-t.z);
        text+=`${i+1}投目からの距離 : ${Math.round(dist)}<br>`;
        if(i>0){
            let prev=throwsList[i-1];
            let d2=Math.hypot(t.x-prev.x,t.z-prev.z);
            if(d2<100) lowAccuracy=true;
        }
    });
    if(lowAccuracy){ text+=`<br><span style="color:#ff5555;font-weight:bold;">※前の測量から100マス以上離れていないため精度が低い可能性があります</span>`; }
    text+=`</div>`; document.getElementById("result").innerHTML=text;
    document.getElementById("copyBtn").style.display="inline-block";
}

// --- コピー ---
function copyCoord(){ navigator.clipboard.writeText(`${finalX},${finalZ}`); notice(3); }

// --- 通知 ---
function notice(type){
    let text=""; if(type===1) text="最低2投必要です"; if(type===2) text="角度が平行で特定できません"; if(type===3) text="座標をコピーしました"; if(type===4) text="リセットしました";
    const n=$(`<div class="notice">${text}</div>`); $("#notifications").prepend(n); n[0].offsetHeight;
    setTimeout(()=>{ n.css({opacity:1,transform:"translateX(0) scale(1)"}); },10);
    setTimeout(()=>{ n.css({opacity:0,transform:"translateX(150%) scale(0.6)"}); setTimeout(()=>{n.remove();},400); },4000);
}

// --- リセット ---
function resetAll(){ document.getElementById("throws").innerHTML=""; throwCount=0; addThrow(); addThrow(); document.getElementById("result").innerHTML=""; document.getElementById("copyBtn").style.display="none"; document.getElementById("mapCanvas").getContext("2d").clearRect(0,0,400,400); notice(4); }

// 初期2投追加
addThrow(); addThrow();


const desc = document.getElementById("methodDescription");

function updateDescription() {

    if (methodSelect.value === "yaw") {
        desc.innerHTML =
        "Yawベース：<br>" +
        "F3で表示されるYaw角度を使用します。<br>" +
        "エンダーアイを投げて飛んだ方向のYawを入力してください。";
    }

    if (methodSelect.value === "xz") {
        desc.innerHTML =
        "Eyeベース：<br>" +
        "エンダーアイが落ちた位置を使う方法です。<br>" +
        "プレイヤー座標とエンダーアイ座標を入力してください。";
    }
}

methodSelect.addEventListener("change", () => {
    updateDescription();
});

updateDescription();