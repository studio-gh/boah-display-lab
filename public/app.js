// Configure the deployed Worker URL here, no trailing slash.
const API_BASE = "https://boah-display-lab.SUBDOMINIO.workers.dev/api";
const $ = (s, root=document) => root.querySelector(s);
const esc = (s="") => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const state = {data:null, active:"todos", editSession:sessionStorage.getItem("boahEditSession")||"", person:localStorage.getItem("boahPerson")||"Gui", busy:false};
const names = ["Gui","Rê","Dani"];
const displayIcon = {colares:"◌",brincos:"⌒",aneis:"○"};
const statusClass = s => /validar|explora/i.test(s) ? "work" : /conclu|aprov/i.test(s) ? "done" : "todo";
async function api(path, options={}) {
  const headers = {"Content-Type":"application/json", ...(options.headers||{})};
  if (state.editSession) headers["X-Edit-Session"] = state.editSession;
  const res = await fetch(API_BASE+path,{...options,headers});
  const body = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(body.error||"Falha ao comunicar com a API");
  return body;
}
async function load(silent=false) {
 try {
  const data = await api("/summary");
  state.data=data;
  render();
  $("#connection").textContent="Sincronizado · "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  $("#connection").classList.remove("offline");
 } catch(e) {
  $("#connection").textContent = API_BASE.includes("SUBDOMINIO") ? "Falta configurar a URL da API" : "API indisponível";
  $("#connection").classList.add("offline");
  if(!silent) toast("Configure e publique o Worker para ativar dados compartilhados.");
 }
}
function toast(msg) { const el=$("#toast"); el.textContent=msg; el.classList.add("show"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),3200); }
function render() {
 if(!state.data) return;
 const d=state.data, total=d.checklist.length, done=d.checklist.filter(x=>x.done).length;
 $("#progressText").textContent=done+" de "+total+" tarefas";
 $("#progressFill").style.width=(total?done/total*100:0)+"%";
 $("#displayCards").innerHTML=d.displays.map(x=>`
 <article class="display-card">
 <div class="display-top"><span class="display-symbol">${displayIcon[x.id]}</span><span class="status ${statusClass(x.status)}">${esc(x.status)}</span></div>
 <p class="eyebrow">DISPLAY 0${x.id==="colares"?1:x.id==="brincos"?2:3}</p><h3>${esc(x.title)}</h3><p class="card-subtitle">${esc(x.subtitle)}</p>
 <p class="card-brief">${esc(x.brief)}</p>
 <div class="mini-label">PRÓXIMO PASSO</div><p class="next-step">${esc((d.checklist.find(t=>t.display_id===x.id&&!t.done)||{}).label||"Aguardando validação")}</p>
 <div class="card-footer"><span>${d.comments.filter(c=>c.display_id===x.id).length} comentários</span><button class="text-button" data-open="${x.id}">Abrir detalhes ↗</button></div>
 </article>`).join("");
 $("#displayCards").querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>openDisplay(b.dataset.open)));
 const filt = d.checklist.filter(t=>state.active==="todos"||t.display_id===state.active);
 $("#checklist").innerHTML=filt.map(t=>`<label class="check-row"><input type="checkbox" data-check="${t.id}" ${t.done?"checked":""}><span class="${t.done?"strike":""}">${esc(t.label)}<small>${esc(t.owner||"Equipe")}</small></span><span class="check-display">${esc(t.display_id?d.displays.find(x=>x.id===t.display_id)?.title:"Geral")}</span></label>`).join("")||'<p class="muted">Nenhuma tarefa nesta categoria.</p>';
 $("#checklist").querySelectorAll("[data-check]").forEach(el=>el.addEventListener("change",async()=>{try{await api("/checklist",{method:"PATCH",body:JSON.stringify({id:Number(el.dataset.check),done:el.checked})});await load(true)}catch(e){el.checked=!el.checked;toast(e.message)}}));
 $("#decisions").innerHTML=d.decisions.slice(0,8).map(x=>`<div class="decision-row"><span class="decision-dot ${statusClass(x.status)}"></span><div><strong>${esc(x.title)}</strong><p>${esc(x.detail)}</p><small>${esc(x.owner||"Equipe")} · ${esc(x.status)}</small></div></div>`).join("");
 $("#activity").innerHTML=d.activity.slice(0,6).map(x=>`<div class="activity-row"><span class="activity-mark"></span><div><strong>${esc(x.action)}</strong><p>${esc(x.detail)}</p><small>${esc(x.actor)} · ${new Date(x.created_at+"Z").toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</small></div></div>`).join("")||'<p class="muted">As atualizações aparecem aqui.</p>';
 $("#notes").innerHTML=d.notes.map(n=>`<article class="note"><p>${esc(n.body)}</p><small>${esc(n.author)} · ${new Date(n.created_at+"Z").toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</small></article>`).join("")||'<p class="muted">Ainda sem notas.</p>';
}
function openDisplay(id) {
 const d=state.data.displays.find(x=>x.id===id); if(!d)return;
 const tasks=state.data.checklist.filter(t=>t.display_id===id);
 const comments=state.data.comments.filter(c=>c.display_id===id);
 $("#detailTitle").textContent=d.title; $("#detailSubtitle").textContent=d.subtitle;
 $("#detailBody").innerHTML=`
 <div class="detail-section"><label>Status</label><input id="editStatus" value="${esc(d.status)}" ${state.editSession?"":"disabled"}></div>
 <div class="detail-section"><label>Brief técnico</label><textarea id="editBrief" rows="3" ${state.editSession?"":"disabled"}>${esc(d.brief)}</textarea></div>
 <div class="detail-section"><label>Requisitos</label><textarea id="editRequirements" rows="3" ${state.editSession?"":"disabled"}>${esc(d.requirements)}</textarea></div>
 <div class="detail-section"><label>Perguntas em aberto</label><textarea id="editQuestions" rows="2" ${state.editSession?"":"disabled"}>${esc(d.open_questions)}</textarea></div>
 <div class="detail-section"><label>Checklist</label>${tasks.map(t=>`<p>${t.done?"✓":"○"} ${esc(t.label)} <small>· ${esc(t.owner)}</small></p>`).join("")}</div>
 <div class="detail-section"><label>Comentários</label>${comments.map(c=>`<p class="comment"><b>${esc(c.author)}:</b> ${esc(c.body)}</p>`).join("")||"<p class='muted'>Sem comentários ainda.</p>"}
 <form id="commentForm" class="inline-form"><input id="commentText" placeholder="Deixe um comentário…" required><button class="button button-dark" ${state.editSession?"":"disabled"}>Enviar</button></form></div>
 `;
 $("#saveDisplay").hidden=!state.editSession;
 $("#detailModal").showModal();
 $("#commentForm").addEventListener("submit",async e=>{e.preventDefault();try{await api("/comments",{method:"POST",body:JSON.stringify({display_id:id,author:state.person,body:$("#commentText").value})});await load(true);openDisplay(id)}catch(err){toast(err.message)}});
 $("#saveDisplay").onclick=async()=>{try{await api("/displays",{method:"PATCH",body:JSON.stringify({id,status:$("#editStatus").value,brief:$("#editBrief").value,requirements:$("#editRequirements").value,open_questions:$("#editQuestions").value,actor:state.person})});$("#detailModal").close();await load(true);toast("Display atualizado.")}catch(e){toast(e.message)}};
}
async function startEditing() {
 if(state.editSession){state.editSession="";sessionStorage.removeItem("boahEditSession");$("#editButton").textContent="Entrar para editar";$("#editButton").classList.remove("active");load(true);toast("Modo de edição encerrado.");return}
 const pin=prompt("Digite o PIN compartilhado de edição:");
 if(!pin)return;
 try{const r=await api("/session",{method:"POST",body:JSON.stringify({pin})});state.editSession=r.session;sessionStorage.setItem("boahEditSession",r.session);$("#editButton").textContent="Sair da edição";$("#editButton").classList.add("active");render();toast("Modo de edição ativado.");}
 catch(e){toast(e.message)}
}
document.addEventListener("DOMContentLoaded",()=>{
 $("#personSelect").value=state.person;
 $("#personSelect").addEventListener("change",e=>{state.person=e.target.value;localStorage.setItem("boahPerson",state.person)});
 $("#editButton").addEventListener("click",startEditing);
 $("#closeModal").addEventListener("click",()=>$("#detailModal").close());
 $("#filterButtons").querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{state.active=b.dataset.filter;$("#filterButtons").querySelectorAll("button").forEach(x=>x.classList.toggle("selected",x===b));render()}));
 $("#newDecisionForm").addEventListener("submit",async e=>{e.preventDefault();try{await api("/decisions",{method:"POST",body:JSON.stringify({title:$("#decisionTitle").value,detail:$("#decisionDetail").value,status:"Em aberto",owner:state.person})});e.target.reset();await load(true);toast("Decisão registrada.")}catch(err){toast(err.message)}});
 $("#newNoteForm").addEventListener("submit",async e=>{e.preventDefault();try{await api("/notes",{method:"POST",body:JSON.stringify({body:$("#noteText").value,author:state.person})});e.target.reset();await load(true);toast("Nota adicionada.")}catch(err){toast(err.message)}});
 $("#refreshButton").addEventListener("click",()=>load());
 load();
 setInterval(()=>load(true),8000);
});
