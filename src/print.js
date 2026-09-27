import {OpenSheetMusicDisplay} from 'opensheetmusicdisplay';
import {printScore} from './print-layout.js';

export function createPrinter(){
  const stage=document.createElement('div');stage.id='printHost';stage.setAttribute('aria-hidden','true');document.body.appendChild(stage);
  const layout=document.createElement('div');layout.id='printLayout';stage.appendChild(layout);
  const pages=document.createElement('div');pages.id='printPages';stage.appendChild(pages);
  const renderer=new OpenSheetMusicDisplay(layout,{backend:'svg',autoResize:false,drawTitle:true,drawComposer:true,drawPartNames:true,autoBeam:true,newSystemFromXML:true,newPageFromXML:false,stretchLastSystemLine:true});
  // US Letter landscape minus the browser's 0.4-inch page margins.
  renderer.setCustomPageFormat(259.08,195.58);
  let task=Promise.resolve(),revision=0;
  return {
    prepare(score){
      const current=++revision,doc=printScore(score);
      task=task.catch(()=>{}).then(async()=>{if(current!==revision)return;await renderer.load(doc);if(current!==revision)return;renderer.Zoom=.7;renderer.render();const output=[];for(const svg of layout.querySelectorAll('svg')){const page=document.createElement('div');page.className='print-page';page.appendChild(svg.cloneNode(true));output.push(page);}pages.replaceChildren(...output);});
      return task;
    },
    async print(score){await this.prepare(score);if(!pages.children.length)throw Error('The printable score is not ready. Please try again.');window.print();}
  };
}
