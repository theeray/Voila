import {scaleFor,scaleSpell,pitch,parseChord,chordName,harmonyEvents,addChord,addPart,noteXML,measures,direct,elem,set,txt,midi,writePitch} from './music.js';

const pc = n => ((n % 12) + 12) % 12;
const pitchLabel = p => p.step + (p.alter === 1 ? '#' : p.alter === -1 ? 'b' : '');
export const pulseLength = m => m.beatType === 8 && m.beats > 3 && m.beats % 3 === 0 ? 1.5 : 4 / m.beatType;
const strong = (n,m) => n.start < .001 ? 1.8 : Math.abs(n.start / pulseLength(m) - Math.round(n.start / pulseLength(m))) < .01 ? 1.35 : .8;
export const phraseEnd = m => Array.from(m.el.getElementsByTagName('repeat')).some(r=>r.getAttribute('direction')==='backward') || direct(m.el,'barline').some(b=>b.getAttribute('location')!=='left'&&['light-light','light-heavy'].includes(txt(b,'bar-style')));

export function chordCandidates(measure,root,mode){
  const scale=scaleFor(root,mode),notes=measure.notes.filter(n=>n.midi!==null&&!n.grace&&n.duration>0);
  const names=scale.map((p,i)=>{
    const third=pc(scale[(i+2)%7]-p),fifth=pc(scale[(i+4)%7]-p);
    return pitchLabel(scaleSpell(60+p,root,mode))+(fifth===6?'dim':third===3?'m':'');
  });
  // A raised leading tone in a minor tune can call for a major dominant.
  if(mode==='minor')names.push(pitchLabel(scaleSpell(60+scale[4],root,mode)));
  return [...new Set(names)].map(name=>{
    const chord=parseChord(name);let score=0,total=0,matched=0;
    for(const n of notes){const weight=n.duration*strong(n,measure);total+=weight;
      const fit=chord.triad.includes(pc(n.midi));if(fit)matched+=weight;
      const rub=chord.triad.some(t=>[1,11].includes(pc(n.midi-t)));
      score+=weight*(fit?2:rub?-1.4:-.7);
    }
    score=total?score/total:0;
    if(chord.pc===scale[0])score+=.16;
    if(chord.kind==='diminished')score-=.42;
    return {...chord,score,coverage:total?matched/total:0,reason:total?`${Math.round(100*matched/total)}% weighted melody fit`:'No pitched melody in this measure'};
  }).sort((a,b)=>b.score-a.score);
}

// Dynamic programming rewards continuity and common tones without overriding
// strong melodic evidence. All imported symbols and user choices are anchors.
export function suggestChords(ms,root,mode,overrides={}){
  const tonic=scaleFor(root,mode)[0];let carried;
  const rows=ms.map((m,i)=>{
    const imported=direct(m.el,'harmony'),anchor=imported.length?chordName(imported[0]):carried;
    if(imported.length)carried=chordName(imported.at(-1))||'';
    if(Object.hasOwn(overrides,i))return [{...(parseChord(overrides[i])||{name:'',pc:null,triad:[]}),score:2,locked:true}];
    if(imported.length||anchor!==undefined)return [{...(parseChord(anchor||'')||{name:'',pc:null,triad:[]}),score:2,locked:true}];
    return chordCandidates(m,root,mode);
  });
  const costs=[],parents=[];
  rows.forEach((row,i)=>{
    costs[i]=[];parents[i]=[];
    row.forEach((c,j)=>{
      const last=ms[i].notes.filter(n=>n.midi!==null&&!n.grace).at(-1);
      const cadence=(i===ms.length-1||phraseEnd(ms[i]))&&c.pc===tonic&&last&&pc(last.midi)===tonic?.3:0;
      let best=-Infinity,parent=0;
      if(!i)best=0;
      else rows[i-1].forEach((previous,k)=>{
        const common=c.triad.filter(n=>previous.triad.includes(n)).length;
        let transition=c.pc===previous.pc?.28:common*.09-.1;
        if(c.pc!==null&&previous.pc!==null&&pc(c.pc-previous.pc)===5)transition+=.16;
        if(phraseEnd(ms[i-1]))transition*=.3;
        const value=costs[i-1][k]+transition;
        if(value>best){best=value;parent=k;}
      });
      costs[i][j]=best+c.score+cadence;parents[i][j]=parent;
    });
  });
  const result={};if(!ms.length)return result;
  let chosen=costs.at(-1).indexOf(Math.max(...costs.at(-1)));
  for(let i=ms.length-1;i>=0;i--){result[i]=rows[i][chosen].name;chosen=parents[i][chosen];}
  return result;
}

function chordAt(m,time,fallback){
  const events=harmonyEvents(m);let name=fallback;
  for(const e of events){if(e.start>time+.001)break;name=e.name;}
  return parseChord(name||'');
}
function intervalTarget(note,root,mode,interval){
  const scale=scaleFor(root,mode),below=[];
  for(let q=note-16;q<note;q++)if(scale.includes(pc(q)))below.push(q);
  return below.at(-(interval==='sixths'?5:2))??note-4;
}
function harmonyPitches(ms,settings,chords){
  const items=ms.flatMap((m,i)=>m.notes.filter(n=>n.midi!==null).map(n=>({n,m,i}))),result=new Map(),byVoice=new Map();
  for(const item of items){const list=byVoice.get(item.n.voice)||[];list.push(item);byVoice.set(item.n.voice,list);}
  for(const line of byVoice.values()){
    const rows=line.map(({n,m,i})=>{
      const target=intervalTarget(n.midi,settings.root,settings.mode,'thirds'),chord=chordAt(m,n.start,chords[i]);
      const scale=scaleFor(settings.root,settings.mode),candidates=[];
      for(let q=Math.max(48,n.midi-16);q<=Math.min(84,n.midi-3);q++){
        const interval=pc(n.midi-q);
        if(![3,4,7,8,9].includes(interval))continue;
        if(!scale.includes(pc(q))&&!chord?.triad.includes(pc(q)))continue;
        let cost=Math.abs(q-target)*.1;
        if(chord&&!chord.triad.includes(pc(q)))cost+=strong(n,m)>.9?1.5:.25;
        if(interval===7)cost+=.4;
        candidates.push({q,cost});
      }
      // Rest instead of an out-of-range note or crossing above a low melody.
      const onChord=chord&&strong(n,m)>.9?candidates.filter(c=>chord.triad.includes(pc(c.q))):[];
      return onChord.length?onChord:candidates.length?candidates:[{q:null,cost:0}];
    });
    const costs=[],parents=[];
    rows.forEach((row,i)=>{costs[i]=[];parents[i]=[];row.forEach((c,j)=>{
      let best=Infinity,parent=0;if(!i)best=0;
      else rows[i-1].forEach((p,k)=>{
        const leap=p.q===null||c.q===null?0:Math.abs(c.q-p.q);
        let transition=leap*.09+Math.max(0,leap-5)*.18;
        const tied=direct(line[i].n.el,'tie').some(t=>t.getAttribute('type')==='stop');
        if(tied&&line[i].n.midi===line[i-1].n.midi&&c.q!==p.q)transition+=100;
        const value=costs[i-1][k]+transition;if(value<best){best=value;parent=k;}
      });costs[i][j]=best+c.cost;parents[i][j]=parent;
    });});
    let j=costs.at(-1).indexOf(Math.min(...costs.at(-1)));
    for(let i=line.length-1;i>=0;i--){result.set(line[i].n.el,rows[i][j].q);j=parents[i][j];}
  }
  return result;
}

export function droneChoice(measure,root,mode,chordName){
  const tonic=scaleFor(root,mode)[0],fifth=pc(tonic+7),chord=parseChord(chordName||'');
  const notes=measure.notes.filter(n=>n.midi!==null&&!n.grace&&n.duration>0);
  const total=notes.reduce((s,n)=>s+n.duration*strong(n,measure),0);
  if(!total)return [];
  const safe=[tonic,fifth].filter(t=>{
    const rub=notes.reduce((s,n)=>s+([1,6,11].includes(pc(n.midi-t))?n.duration*strong(n,measure):0),0)/total;
    return rub<=.18&&(!chord||chord.triad.includes(t));
  });
  return safe.map(p=>48+p);
}
function addTie(n,type){
  const d=n.ownerDocument,t=elem(d,'tie');t.setAttribute('type',type);
  n.insertBefore(t,direct(n,'type')[0]||direct(n,'notations')[0]||null);
  let notation=direct(n,'notations')[0];if(!notation){notation=elem(d,'notations');n.append(notation);}
  const tied=elem(d,'tied');tied.setAttribute('type',type);notation.append(tied);
}
function chunks(duration,pulse){
  const result=[];let at=0;
  while(at<duration-.00001){
    const boundary=(Math.floor((at+.00001)/pulse)+1)*pulse;
    const room=Math.min(duration-at,boundary-at);
    const q=[4,3,2,1.5,1,.75,.5,.375,.25,.1875,.125,.0625].find(v=>v<=room+.00001)||room;
    result.push(q);at+=q;
  }
  return result;
}
export function arrange(melody,id,settings,chords={},overrides={}){
  const doc=melody.cloneNode(true),ms=measures(doc,id);
  if(settings.chords)ms.forEach((m,i)=>{
    if(Object.hasOwn(overrides,i)){direct(m.el,'harmony').forEach(h=>h.remove());if(chords[i])addChord(m.el,chords[i]);}
    else if(!direct(m.el,'harmony').length&&chords[i])addChord(m.el,chords[i]);
  });
  if(settings.harmony!=='off'){
    const part=addPart(doc,id==='VH'?'VH2':'VH','Viola harmony');
    const targets=settings.harmony==='smooth'?harmonyPitches(ms,settings,chords):null;
    ms.forEach(m=>{
      const copy=m.el.cloneNode(true),originalNotes=direct(m.el,'note');
      for(const child of [...copy.children])if(!['attributes','note','backup','forward','barline'].includes(child.tagName))child.remove();
      for(const attrs of direct(copy,'attributes'))for(const clef of direct(attrs,'clef')){set(clef,'sign','C');set(clef,'line',3);}
      direct(copy,'note').forEach((n,j)=>{
        const mm=midi(n);if(mm!==null){let target=targets?targets.get(originalNotes[j]):intervalTarget(mm,settings.root,settings.mode,settings.harmony);
          if(target!==null&&target<48)target=null;
          if(target===null){direct(n,'pitch').forEach(p=>p.remove());n.prepend(elem(doc,'rest'));for(const tag of ['tie','accidental','notations'])direct(n,tag).forEach(e=>e.remove());}
          else writePitch(n,scaleSpell(target,settings.root,settings.mode));
        }
        direct(n,'lyric').forEach(e=>e.remove());n.removeAttribute('id');n.removeAttribute('color');
      });part.append(copy);
    });
  }
  if(settings.drone!=='off'){
    const part=addPart(doc,id==='VD'?'VD2':'VD',settings.drone==='adaptive'?'Viola adaptive drone':'Viola drone');
    let previous=[];
    ms.forEach((m,i)=>{
      const el=elem(doc,'measure');el.setAttribute('number',m.number);
      const divisions=Math.max(480,m.divisions)*4,attrs=elem(doc,'attributes');attrs.append(elem(doc,'divisions',divisions));
      const key=elem(doc,'key');key.append(elem(doc,'fifths',m.fifths));
      if(!i||m.fifths!==ms[i-1].fifths)attrs.append(key);
      const time=elem(doc,'time');time.append(elem(doc,'beats',m.beats),elem(doc,'beat-type',m.beatType));
      if(!i||m.beats!==ms[i-1].beats||m.beatType!==ms[i-1].beatType)attrs.append(time);
      if(!i){const clef=elem(doc,'clef');clef.append(elem(doc,'sign','C'),elem(doc,'line',3));attrs.append(clef);}
      el.append(attrs);
      const tonic=48+scaleFor(settings.root,settings.mode)[0];
      let tones=settings.drone==='adaptive'?droneChoice(m,settings.root,settings.mode,chords[i]):settings.drone==='fifth'?[tonic,tonic+7]:[tonic];
      if(settings.drone==='adaptive'&&direct(m.el,'harmony').length>1){
        // A pedal must be compatible with every chord in this bar.
        tones=tones.filter(t=>harmonyEvents(m).every(e=>!e.name||parseChord(e.name)?.triad.includes(pc(t))));
      }
      const durations=chunks(m.duration,pulseLength(m));let last=[];
      durations.forEach((q,j)=>{
        const group=(tones.length?tones:[null]).map((tone,k)=>{
          const n=noteXML(doc,tone,q,divisions,settings.root,settings.mode);if(k)n.prepend(elem(doc,'chord'));
          if(tone!==null){
            const prev=(j?last:previous).find(p=>midi(p)===tone);
            const boundaryRepeat=!j&&i>0&&(phraseEnd(ms[i-1])||Array.from(m.el.getElementsByTagName('repeat')).some(r=>r.getAttribute('direction')==='forward'));
            if(prev&&!boundaryRepeat){addTie(prev,'start');addTie(n,'stop');}
          }
          el.append(n);return n;
        });last=group;
      });
      previous=last;direct(m.el,'barline').forEach(b=>el.append(b.cloneNode(true)));part.append(el);
    });
  }
  return doc;
}
