// Original, code-native editorial art. Visible illustrations are separate from
// source-post/social metadata; no client screenshots or measured charts are implied.
import fs from 'node:fs';
import path from 'node:path';

const P = { paper:'#F0EBE1', tan:'#E4DBC8', ink:'#1B1611', rust:'#C6401E', muted:'#6E6455', rule:'#D6CCBA' };
const art = {
  maintenance: { alt:'A working document surrounded by an ongoing cycle of review and maintenance.', draw: () => `
    <path d="M273 559C128 279 392 51 715 130C988 197 1104 507 840 668" fill="none" stroke="${P.ink}" stroke-width="5"/>
    <path d="M303 190C628 20 1007 298 894 564C788 796 345 742 224 440" fill="none" stroke="${P.rule}" stroke-width="3" stroke-dasharray="11 11"/>
    ${sheet(421,194,350,411,-4)}
    <path d="M816 650l23 26 37-11M256 539l20 28 19-32" class="stroke"/>
    <circle cx="917" cy="352" r="61" fill="${P.rust}"/>
    <path d="M891 352l18 20 37-46" stroke="${P.paper}" stroke-width="8" fill="none"/>
    <circle cx="264" cy="282" r="15" fill="${P.rust}"/>` },
  workflow: { alt:'Documents moving through a connected sequence, with an explicit review gate.', draw: () => `
    <path d="M172 500H400V330H766V510H1018" class="route"/>
    ${sheet(124,290,210,244,-8)}${sheet(490,174,222,258,5)}${sheet(860,348,184,216,-5)}
    <path d="M764 276V562" class="gate"/><circle cx="764" cy="330" r="26" fill="${P.rust}"/>
    <path d="M750 330l10 10 18-22" stroke="${P.paper}" stroke-width="6" fill="none"/>
    <path d="M1014 492l20 18-20 18" class="stroke"/>` },
  review: { alt:'A magnifying lens examining a document, with a visible human review mark.', draw: () => `
    ${sheet(234,128,422,506,-5)}
    <circle cx="735" cy="355" r="152" fill="${P.paper}" stroke="${P.ink}" stroke-width="13"/>
    <circle cx="735" cy="355" r="131" fill="none" stroke="${P.rule}" stroke-width="2"/>
    <path d="M676 356l42 42 81-98" fill="none" stroke="${P.rust}" stroke-width="16" stroke-linecap="square"/>
    <path d="M842 466l126 149" stroke="${P.ink}" stroke-width="39"/>
    <path d="M831 463l30-26" stroke="${P.paper}" stroke-width="4"/>` },
  knowledge: { alt:'An open reference book connected to a small set of source documents.', draw: () => `
    <path d="M600 360V204M600 250H321V196M600 250H887V196" class="route"/>
    ${smallSheet(252,92,130,140)}${smallSheet(534,66,130,140)}${smallSheet(821,92,130,140)}
    <path d="M190 328Q386 280 600 363Q814 280 1010 328V654Q806 602 600 681Q394 602 190 654Z" fill="${P.tan}" stroke="${P.ink}" stroke-width="3"/>
    <path d="M215 296Q412 264 600 343Q788 264 985 296V620Q788 575 600 652Q412 575 215 620Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/>
    <path d="M600 343V652" class="stroke"/>
    <path d="M253 379Q411 359 559 410M253 431Q411 410 559 461M253 483Q411 461 512 493M641 410Q789 359 947 379M641 461Q789 410 947 431M641 512Q789 461 904 477" stroke="${P.muted}" stroke-width="3" fill="none"/>
    <path d="M777 312V460l29-25 29 17V303" fill="${P.rust}"/>` },
  economics: { alt:'A balance comparing a stack of work with the resources required to support it.', draw: () => `
    <path d="M600 300V648M488 652H712" stroke="${P.ink}" stroke-width="14"/>
    <path d="M210 289L990 226" stroke="${P.ink}" stroke-width="13"/>
    <circle cx="600" cy="257" r="30" fill="${P.rust}"/>
    <path d="M277 284L178 505M277 284L385 505M911 235L811 457M911 235L1020 457" stroke="${P.ink}" stroke-width="3" fill="none"/>
    <path d="M156 506H409Q390 582 282 582Q175 582 156 506M789 458H1041Q1020 534 914 534Q806 534 789 458" fill="${P.tan}" stroke="${P.ink}" stroke-width="3"/>
    ${smallSheet(210,350,148,151,-6)}
    <g fill="${P.tan}" stroke="${P.ink}" stroke-width="3"><path d="M852 410h122v38H852z"/><path d="M852 365h122v38H852z"/><path d="M852 320h122v38H852z"/></g>
    <path d="M860 320h106v16H860z" fill="${P.rust}"/>` },
  privacy: { alt:'Source documents passing through a controlled boundary into a smaller permitted output.', draw: () => `
    <rect x="138" y="128" width="462" height="528" fill="none" stroke="${P.muted}" stroke-width="2" stroke-dasharray="9 9"/>
    ${sheet(206,240,266,320,-7)}
    <path d="M520 390H1005" class="route"/>
    <path d="M600 154V626" stroke="${P.ink}" stroke-width="16"/>
    <rect x="577" y="329" width="46" height="120" fill="${P.rust}"/>
    <path d="M589 349h22M589 375h22M589 402h22M589 428h22" stroke="${P.paper}" stroke-width="4"/>
    ${smallSheet(826,282,196,230,6)}
    <path d="M856 408h124" stroke="${P.rust}" stroke-width="10"/>` },
  training: { alt:'Three people represented around a shared table, working from the same set of instructions.', draw: () => `
    <circle cx="598" cy="172" r="60" fill="${P.tan}" stroke="${P.ink}" stroke-width="3"/>
    <path d="M492 281q106-117 212 0" fill="${P.tan}" stroke="${P.ink}" stroke-width="3"/>
    <circle cx="198" cy="464" r="61" fill="${P.tan}" stroke="${P.ink}" stroke-width="3"/>
    <circle cx="1002" cy="464" r="61" fill="${P.tan}" stroke="${P.ink}" stroke-width="3"/>
    <rect x="309" y="292" width="582" height="339" rx="155" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>
    ${smallSheet(439,367,133,166,-11)}${smallSheet(627,372,133,166,12)}
    <path d="M250 465H425M776 465H948M598 238V350" stroke="${P.ink}" stroke-width="11"/>
    <circle cx="599" cy="555" r="18" fill="${P.rust}"/><path d="M565 555h-30M632 555h30" stroke="${P.rust}" stroke-width="4"/>` },
  language: { alt:'A field of possible word-like tiles, with one connected path selected from many alternatives.', draw: () => `
    ${Array.from({length:20},(_,i)=>{const col=i%5,row=Math.floor(i/5);return `<rect x="${169+col*181}" y="${134+row*140}" width="142" height="94" fill="${[2,7,8,13,18].includes(i)?P.tan:P.paper}" stroke="${P.rule}" stroke-width="2"/><path d="M${192+col*181} ${166+row*140}h75m-75 21h${i%3===0?51:91}" stroke="${P.muted}" stroke-width="4"/>`;}).join('')}
    <path d="M603 180V319H785V460H604V600" stroke="${P.rust}" stroke-width="10" fill="none"/>
    ${[[603,180],[603,319],[785,319],[785,460],[604,460],[604,600]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="12" fill="${P.rust}"/>`).join('')}` },
  history: { alt:'A continuous path winding through several generations of machine components.', draw: () => `
    <path d="M152 587C170 236 412 97 603 310S894 682 1048 207" stroke="${P.ink}" stroke-width="5" fill="none"/>
    <circle cx="203" cy="404" r="65" fill="${P.tan}" stroke="${P.ink}" stroke-width="3"/>
    <path d="M172 364v81m31-81v81m31-81v81" stroke="${P.ink}" stroke-width="8"/>
    <rect x="406" y="169" width="126" height="127" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/>
    <path d="M428 199h83m-83 22h83m-83 22h50" class="stroke"/>
    <rect x="714" y="438" width="129" height="130" rx="3" fill="${P.rust}"/>
    <path d="M739 463h79v80h-79z" fill="none" stroke="${P.paper}" stroke-width="3"/>
    <circle cx="1015" cy="351" r="49" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/>
    <circle cx="1015" cy="351" r="17" fill="${P.rust}"/>
    <path d="M143 589l20 11 10-22M1031 211l20-17 11 23" class="stroke"/>` },
  infrastructure: { alt:'The physical rooms, racks, and connections beneath a seemingly simple AI service.', draw: () => `
    <path d="M174 644V253L603 91l423 162v391Z" fill="${P.tan}" stroke="${P.ink}" stroke-width="3"/>
    <path d="M174 253h852M600 93v160" class="stroke"/>
    ${[254,492,730].map((x,i)=>`<rect x="${x}" y="303" width="172" height="341" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/>${Array.from({length:5},(_,j)=>`<rect x="${x+19}" y="${328+j*57}" width="134" height="39" fill="none" stroke="${P.ink}" stroke-width="2"/><circle cx="${x+40}" cy="${347+j*57}" r="5" fill="${i===1&&j===2?P.rust:P.ink}"/><path d="M${x+65} ${347+j*57}h66" stroke="${P.rule}" stroke-width="4"/>`).join('')}`).join('')}
    <path d="M141 645h918" stroke="${P.ink}" stroke-width="7"/><path d="M517 195h164" stroke="${P.rust}" stroke-width="12"/>` },
  readiness: { alt:'A practical work folder with a short sequence of checks and one next step highlighted.', draw: () => `
    <path d="M173 250v-67h261l45 67h548v393H173Z" fill="${P.tan}" stroke="${P.ink}" stroke-width="3"/>
    <path d="M208 312V168h737v454H208Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/>
    ${[0,1,2].map(i=>`<rect x="274" y="${249+i*109}" width="52" height="52" fill="none" stroke="${P.ink}" stroke-width="3"/><path d="M362 ${263+i*109}h${400-i*49}m-${400-i*49} 25h${292-i*33}" stroke="${P.muted}" stroke-width="4"/>`).join('')}
    <path d="M282 273l14 15 24-32M282 382l14 15 24-32" stroke="${P.rust}" stroke-width="7" fill="none"/>
    <path d="M173 579h854v64H173z" fill="${P.tan}" stroke="${P.ink}" stroke-width="3"/>
    <circle cx="947" cy="191" r="79" fill="${P.rust}"/><path d="M912 191h66m-22-24 24 24-24 24" stroke="${P.paper}" stroke-width="7" fill="none"/>` },
  models: { alt:'Two ways to access a machine: an open structure beside a closed, controlled enclosure.', draw: () => `
    <path d="M182 577V216h331v361M182 216l68-58h331v361l-68 58M513 216l68-58" fill="none" stroke="${P.ink}" stroke-width="4"/>
    <path d="M203 565h290V237H203Z" fill="${P.tan}"/>
    <path d="M228 378h239M347 259v278" stroke="${P.rule}" stroke-width="3"/>
    <circle cx="347" cy="378" r="57" fill="${P.rust}"/>
    <path d="M669 577V216h331v361Z" fill="${P.ink}"/>
    <path d="M669 216l68-58h331v361l-68 58V216Z" fill="${P.tan}" stroke="${P.ink}" stroke-width="4"/>
    <path d="M765 378h145" stroke="${P.paper}" stroke-width="5"/><circle cx="886" cy="378" r="18" fill="${P.rust}"/>
    <path d="M186 642h327M672 642h327" stroke="${P.rule}" stroke-width="3"/>` },
  hype: { alt:'A loud announcement narrowed into one document that can actually be examined.', draw: () => `
    <path d="M146 299h157l232-148v451L303 454H146Z" fill="${P.tan}" stroke="${P.ink}" stroke-width="4"/>
    <path d="M235 454l35 159h87l-32-147" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>
    <path d="M535 155v448" stroke="${P.rust}" stroke-width="14"/>
    <path d="M585 257l105-55M588 377h129M585 492l105 55" stroke="${P.rule}" stroke-width="9"/>
    ${sheet(802,234,223,300,5)}
    <path d="M858 474l25 22 46-58" stroke="${P.rust}" stroke-width="9" fill="none"/>` },
};

function smallSheet(x,y,w,h,rotation=0){return sheet(x,y,w,h,rotation,true);}
function sheet(x,y,w,h,rotation=0,small=false){
  const left=x+w*.16,right=w*.68;
  return `<g transform="rotate(${rotation} ${x+w/2} ${y+h/2})"><path d="M${x+9} ${y+9}h${w}v${h}h-${w}z" fill="${P.tan}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/><path d="M${left} ${y+h*.2}h${right*.43}" stroke="${P.rust}" stroke-width="${small?6:9}"/>${Array.from({length:small?3:5},(_,i)=>`<path d="M${left} ${y+h*(.39+i*.095)}h${right*(i===(small?2:4)?.69:1)}" stroke="${P.muted}" stroke-width="${small?2:3}"/>`).join('')}</g>`;
}

const motifBySlug = {
 'ai-managed-services':'maintenance', 'ai-workflow-automation-for-operations':'workflow', 'ai-lead-response-automation':'workflow', 'integrate-crm-with-ai-automation':'workflow', 'automate-invoice-processing-with-ai':'economics',
 'human-in-the-loop-ai-systems':'review', 'explainable-ai-for-business-decisions':'knowledge', 'what-the-machine-cannot-do':'review',
 'how-the-machine-learns':'knowledge', 'single-source-of-truth-business-data':'knowledge', 'teaching-the-machine-your-business':'knowledge',
 'how-to-measure-ai-roi':'economics', 'how-much-does-ai-implementation-cost':'economics', 'the-currency-of-the-machine':'economics',
 'where-your-data-goes':'privacy', 'open-models-closed-models':'models', 'the-buildings-behind-the-intelligence':'infrastructure',
 'what-a-construction-estimator-should-never-automate':'review', 'will-this-replace-my-office-manager':'training',
 'ai-employee-training-program':'training', 'how-to-talk-to-the-machine':'language', 'the-prediction-engine':'language', 'why-the-machine-makes-things-up':'language', 'sorting-the-vocabulary':'models',
 'why-everything-happened-at-once':'history', 'seventy-years-of-overnight-success':'history',
 'ai-readiness-audit':'readiness', 'how-long-does-ai-implementation-take':'readiness', 'ai-consulting-for-small-business-that-ships':'readiness', 'what-an-agent-actually-is':'workflow', 'how-to-smell-the-hype':'hype',
};

export function editorialImageFor(post){
 const motif=motifBySlug[post.slug] || 'readiness';
 return { assetUrl:`/images/editorial/${post.slug}.svg`, width:1200,height:800,alt:art[motif].alt,credit:'Original editorial illustration',motif };
}
export function writeEditorialArtwork(posts,root){
 const dir=path.join(root,'images','editorial');fs.mkdirSync(dir,{recursive:true});
 for(const post of posts){
  if(!/^[a-z0-9-]+$/.test(post.slug))throw new Error(`Unsafe editorial slug: ${post.slug}`);
  const {motif}=editorialImageFor(post),spec=art[motif];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-labelledby="art-title art-desc"><title id="art-title">${spec.alt}</title><desc id="art-desc">Original conceptual illustration for The Ampersand. It is not a product screen or a chart of measured results.</desc><style>.stroke{stroke:${P.ink};stroke-width:3;fill:none}.route{stroke:${P.ink};stroke-width:3;fill:none;stroke-dasharray:10 9}.gate{stroke:${P.rust};stroke-width:8;fill:none}</style><rect width="1200" height="800" fill="${P.paper}"/><path d="M64 58h1072M64 742h1072" stroke="${P.rule}" stroke-width="2"/><path d="M64 58h68" stroke="${P.rust}" stroke-width="5"/>${spec.draw()}</svg>\n`;
  const file=path.join(dir,`${post.slug}.svg`);
  if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==svg)fs.writeFileSync(file,svg);
 }
 return posts.length;
}
