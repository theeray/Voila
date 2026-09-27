import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DOMParser,XMLSerializer} from '@xmldom/xmldom';
import * as M from '../src/music.js';
import * as A from '../src/accompaniment.js';
import {playbackEvents,synthesizeWave,guitarVoicing} from '../src/audio.js';
import {printScore} from '../src/print-layout.js';
const probe=new DOMParser().parseFromString('<a/>','application/xml'),proto=Object.getPrototypeOf(probe.documentElement);
Object.defineProperty(proto,'children',{get(){return Array.from(this.childNodes).filter(n=>n.nodeType===1)}});
Object.defineProperty(proto,'id',{get(){return this.getAttribute('id')},set(v){this.setAttribute('id',v)}});
proto.remove=function(){this.parentNode?.removeChild(this)};proto.append=function(...es){es.forEach(e=>this.appendChild(e))};proto.prepend=function(e){this.insertBefore(e,this.firstChild)};proto.replaceChildren=function(...es){while(this.firstChild)this.removeChild(this.firstChild);this.append(...es)};
globalThis.DOMParser=DOMParser;globalThis.XMLSerializer=XMLSerializer;
const settings={root:'D',mode:'major',harmony:'smooth',drone:'adaptive',chords:true};
const tune=(bars,options={})=>M.fromDraft(bars.map(bar=>bar.map(midi=>({midi,duration:1}))),{beats:4,beatType:4,...options});
function barline(m,repeat,ending,type='start'){
  const b=M.elem(m.ownerDocument,'barline');b.setAttribute('location',repeat==='forward'?'left':'right');
  if(ending){const e=M.elem(m.ownerDocument,'ending');e.setAttribute('number',ending);e.setAttribute('type',type);b.append(e);}
  if(repeat){const r=M.elem(m.ownerDocument,'repeat');r.setAttribute('direction',repeat);b.append(r);}m.append(b);
}
test('clef preserves sound, all chromatic transpositions preserve exact pitches',()=>{
  const source=M.demo(),before=M.serialize(source),original=M.measures(source,'P1').flatMap(m=>m.notes.map(n=>n.midi));
  for(let semitones=-12;semitones<=12;semitones++)for(const octave of [-1,0,1]){
    const doc=M.makeMelody(source,'P1',{clef:'alto',semitones,octave});
    assert.deepEqual(M.measures(doc,'P1').flatMap(m=>m.notes.map(n=>n.midi)),original.map(n=>n+semitones+12*octave));
  }assert.equal(M.serialize(source),before);
});
test('diatonic chord suggestions distinguish major, minor, Dorian, and Mixolydian',()=>{
  for(const [root,mode,notes,chord] of [['D','major',[62,66,69,62],'D'],['A','minor',[69,72,76,69],'Am'],['D','dorian',[67,71,74,67],'G'],['D','mixolydian',[60,64,67,60],'C']]){
    const ms=M.measures(tune([notes]),'P1');assert.equal(A.suggestChords(ms,root,mode)[0],chord);
  }
});
test('imported changes and slash bass survive; a user override replaces only its bar',()=>{
  const doc=tune([[62,66,69,62],[69,73,76,69]]),ms=M.measures(doc,'P1');
  M.addChord(ms[0].el,'D/F#');const h=M.elem(doc,'harmony');h.append(M.elem(doc,'root'));M.set(h.firstChild,'root-step','A');h.append(M.elem(doc,'kind','major'));ms[0].el.insertBefore(h,ms[0].notes[2].el);
  assert.deepEqual(M.harmonyEvents(ms[0]).map(e=>[e.start,e.name]),[[0,'D/F#'],[2,'A']]);
  const before=M.serialize(doc),chords=A.suggestChords(M.measures(doc,'P1'),'D','major',{1:'Bm'});
  const arranged=A.arrange(doc,'P1',settings,chords,{1:'Bm'});
  assert.equal(M.direct(M.measures(arranged,'P1')[0].el,'harmony').length,2);
  assert.equal(chords[1],'Bm');assert.equal(A.suggestChords(M.measures(doc,'P1'),'D','major')[1],'A');assert.equal(M.serialize(doc),before);
  const replaced=A.arrange(doc,'P1',settings,{0:'',1:'Bm'},{0:''});
  assert.equal(M.direct(M.measures(replaced,'P1')[0].el,'harmony').length,0);
  assert.equal(guitarVoicing(M.parseChord('D/F#'))[0]%12,6);
});
test('smooth harmony stays below melody, in viola range, and uses chord tones on strong beats',()=>{
  const doc=tune([[62,66,69,66],[64,68,71,68],[61,64,69,64]]),chords={0:'D',1:'E',2:'A'};
  const arranged=A.arrange(doc,'P1',settings,chords),lead=M.measures(arranged,'P1'),harmony=M.measures(arranged,'VH');
  harmony.forEach((m,i)=>m.notes.forEach((n,j)=>{if(n.midi===null)return;assert.ok(n.midi>=48&&n.midi<lead[i].notes[j].midi);assert.ok(M.parseChord(chords[i]).triad.includes(n.midi%12));}));
  const low=A.arrange(tune([[48,49,50,51]]),'P1',settings,{0:'C'});
  assert.equal(M.measures(low,'VH')[0].notes[0].midi,null);assert.ok(M.measures(low,'VH')[0].notes.every((n,i)=>n.midi===null||(n.midi>=48&&n.midi<48+i)));
});
test('drone avoids semitone/tritone clashes and preserves exact compound-meter lengths',()=>{
  const conflict=M.measures(tune([[61,66,61,66]]),'P1')[0];assert.deepEqual(A.droneChoice(conflict,'C','major','C'),[]);
  const doc=M.demo(),arr=A.arrange(doc,'P1',{...settings,drone:'fifth'},A.suggestChords(M.measures(doc,'P1'),'D','major'));
  assert.ok(M.measures(arr,'VD').every(m=>m.duration===3));
  const notes=M.measures(arr,'VD')[0].notes;assert.equal(notes[0].duration,1.5);assert.ok(M.direct(notes[0].el,'tie').some(t=>t.getAttribute('type')==='start'));
  // MusicXML sound ties must precede note type.
  assert.ok([...notes[0].el.children].findIndex(e=>e.tagName==='tie')<[...notes[0].el.children].findIndex(e=>e.tagName==='type'));
});
test('repeat endings span multiple bars and ties merge into sustained media events',()=>{
  const doc=tune([[60],[62],[64],[65],[67]]),ms=M.measures(doc,'P1');barline(ms[0].el,'forward');barline(ms[1].el,null,'1');barline(ms[2].el,'backward','1','stop');barline(ms[3].el,null,'2');barline(ms[4].el,null,'2','discontinue');
  const seq=playbackEvents(doc,60,{melody:1,harmony:0,drone:0,chords:0},{});
  assert.deepEqual(seq.markers.map(m=>m.index),[0,1,2,0,3,4]);
  const drone=A.arrange(tune([[60,64,67,60],[60,64,67,60]]),'P1',{...settings,root:'C',harmony:'off',drone:'tonic'},{});
  const sound=playbackEvents(drone,60,{melody:0,drone:1},{});assert.equal(sound.events.length,1);assert.equal(sound.events[0].duration,8);
});
test('PCM preview contains nonzero, unclipped audio and valid WAV headers',()=>{
  const seq=playbackEvents(M.demo(),112,{melody:.75,harmony:.4,drone:.4,chords:.4},{0:'D/F#'}),wave=synthesizeWave(seq),data=new DataView(wave);
  assert.equal(new TextDecoder().decode(wave.slice(0,4)),'RIFF');assert.equal(data.getUint32(24,true),22050);
  let peak=0;for(let i=44;i<wave.byteLength;i+=2)peak=Math.max(peak,Math.abs(data.getInt16(i,true)));assert.ok(peak>1000&&peak<=29492);
});
test('print lines end on major repeats and do not change source notation',()=>{
  const doc=M.demo(),ms=M.measures(doc,'P1');barline(ms[2].el,'backward');barline(ms[6].el,'backward');
  const before=M.serialize(doc),printed=printScore(doc),starts=M.measures(printed,'P1').filter(m=>M.direct(m.el,'print').length).map(m=>m.index);
  assert.deepEqual(starts,[3,7]);assert.equal(M.serialize(doc),before);
});
