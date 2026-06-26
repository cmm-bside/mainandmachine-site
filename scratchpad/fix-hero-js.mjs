import fs from "node:fs";
process.chdir("/Users/christophermyers/mainandmachine-site");
let s = fs.readFileSync("js/hero-machine.js", "utf8");

const NB = " "; // the file uses a non-breaking space in the ternary
const find = `    const frag = document.createDocumentFragment();
    [...word.textContent].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'hm-letter';
      s.textContent = ch === ' ' ? '${NB}' : ch;
      s.style.setProperty('--i', i);
      frag.appendChild(s);
    });
    word.textContent = ''; word.appendChild(frag); word.dataset.split = '1';`;

const repl = `    const words = word.textContent.split(/(\\s+)/);
    let i = 0; const frag = document.createDocumentFragment();
    words.forEach(chunk => {
      if (/^\\s+$/.test(chunk)) { frag.appendChild(document.createTextNode(chunk)); return; }
      const wrap = document.createElement('span'); wrap.className = 'hm-word';
      [...chunk].forEach(ch => {
        const s = document.createElement('span'); s.className = 'hm-letter';
        s.textContent = ch; s.style.setProperty('--i', i++); wrap.appendChild(s);
      });
      frag.appendChild(wrap);
    });
    word.textContent = ''; word.appendChild(frag); word.dataset.split = '1';`;

const n = s.split(find).length - 1;
if (n !== 1) { console.log("FAIL match count =", n); process.exit(1); }
s = s.split(find).join(repl);
s = s.replace(
  "// split the accent word into letters (plain text in source -> JS-off shows it)",
  "// split the accent line into letters, grouped by WORD so it can never break mid-word");
fs.writeFileSync("js/hero-machine.js", s);
console.log("hero-machine.js word-grouping applied");
