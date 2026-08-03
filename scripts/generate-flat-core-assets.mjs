import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, "../public/assets");
const palettes = [
  ["#f8b81d", "#e97716"], ["#2ca9e8", "#1973b8"], ["#f26a3d", "#bb3a26"], ["#71bd45", "#34893e"],
  ["#ffd044", "#e38b18"], ["#ef7e26", "#be4a18"], ["#4f9ed1", "#27658e"], ["#ff9345", "#d25e26"],
  ["#e34d45", "#a92831"], ["#72ad42", "#3e7d32"], ["#75bde7", "#3b79b6"], ["#e5ad2c", "#9d6a20"],
  ["#42aab5", "#207581"], ["#f3bd2e", "#cc751a"], ["#ef6743", "#a93632"], ["#a76be8", "#6940a5"],
];
const outline = "#18374b";
const dark = "#223b4a";
const hi = "#fff4c6";

const svg = (cells) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
${cells.map((c, i) => `<g transform="translate(${(i % 4) * 300} ${Math.floor(i / 4) * 300})">${c}</g>`).join("\n")}
</svg>`;

const bolts = (xs, y, color = hi) => xs.map((x) => `<circle cx="${x}" cy="${y}" r="6" fill="${color}" stroke="${outline}" stroke-width="4"/>`).join("");
const stripes = (x, y, count = 4) => Array.from({length:count}, (_, i) => `<path d="M${x+i*24} ${y}l18 18" stroke="#fff4c6" stroke-width="8"/>`).join("");

function chassis(i) {
  const [p, s] = palettes[i];
  const long = [1,2,6,7,8,9,10,11,12,14].includes(i);
  const x = long ? 24 : 45, w = long ? 252 : 212;
  const heavy = [2,4,5,6,11,14].includes(i);
  return `
    <path d="M${x+18} 120H${x+w-25}l18 22v54l-20 22H${x+22}L${x} 196v-52z" fill="${p}" stroke="${outline}" stroke-width="8" stroke-linejoin="round"/>
    <rect x="${x+18}" y="112" width="${w-44}" height="22" rx="8" fill="${s}" stroke="${outline}" stroke-width="6"/>
    <path d="M${x+28} 165h${w-58}" stroke="${s}" stroke-width="15" stroke-linecap="round"/>
    <path d="M${x+36} 192h${w-74}" stroke="${heavy ? dark : "#fff2a7"}" stroke-width="10" stroke-linecap="round"/>
    ${bolts([x+34,x+w/2,x+w-36],154)}
    ${heavy ? `<rect x="${x+75}" y="138" width="${w-150}" height="42" rx="8" fill="#324d5c" stroke="${outline}" stroke-width="5"/>` : ""}
    <rect x="${x+12}" y="206" width="${w-24}" height="12" rx="6" fill="${outline}" opacity=".22"/>
  `;
}

function body(i) {
  const [p, s] = palettes[i];
  const common = (inside) => `<g>${inside}<path d="M45 208h210" stroke="${outline}" stroke-width="9" stroke-linecap="round"/></g>`;
  if (i === 1) return common(`<path d="M38 88h222v114H38z" fill="${p}" stroke="${outline}" stroke-width="8"/><path d="M62 88v-25h174v25" fill="none" stroke="${outline}" stroke-width="8"/>${stripes(58,122,6)}<path d="M62 175h174" stroke="${s}" stroke-width="12"/>`);
  if (i === 2 || i === 7) return common(`<path d="M42 96h210l-22 104H65z" fill="${p}" stroke="${outline}" stroke-width="8" stroke-linejoin="round"/><path d="M55 108h184l-8 35H61z" fill="${hi}" opacity=".45"/><path d="M92 156h112" stroke="${s}" stroke-width="14" stroke-linecap="round"/>`);
  if (i === 3) return common(`<path d="M58 82h150l35 42v78H58z" fill="${p}" stroke="${outline}" stroke-width="8"/><rect x="78" y="112" width="105" height="52" rx="8" fill="${s}"/><path d="M210 96v104M232 120v80" stroke="${outline}" stroke-width="10"/>`);
  if (i === 4 || i === 6) return common(`<rect x="46" y="106" width="210" height="96" rx="24" fill="${p}" stroke="${outline}" stroke-width="8"/><circle cx="110" cy="128" r="28" fill="${s}" stroke="${outline}" stroke-width="7"/>${bolts([110],128)}<rect x="155" y="124" width="74" height="44" rx="10" fill="${s}" stroke="${outline}" stroke-width="6"/>`);
  if (i === 5) return common(`<path d="M40 118h218v84H40z" fill="${p}" stroke="${outline}" stroke-width="8"/><path d="M70 118l18-38h105l25 38" fill="${s}" stroke="${outline}" stroke-width="8"/><path d="M65 158h168" stroke="${hi}" stroke-width="10"/>`);
  if (i === 8) return common(`<rect x="44" y="82" width="208" height="120" rx="16" fill="${p}" stroke="${outline}" stroke-width="8"/><rect x="62" y="103" width="72" height="70" rx="12" fill="#d7f2ff" stroke="${outline}" stroke-width="6"/><path d="M154 104h78M154 132h78M154 160h78" stroke="${hi}" stroke-width="9"/>`);
  if (i === 9) return common(`<path d="M42 112h216v90H42z" fill="${p}" stroke="${outline}" stroke-width="8"/><path d="M68 112V70h118l42 42" fill="${s}" stroke="${outline}" stroke-width="8"/><path d="M83 142h133" stroke="${hi}" stroke-width="12"/>`);
  if (i === 10) return common(`<path d="M42 94h216v108H42z" fill="${p}" stroke="${outline}" stroke-width="8"/><path d="M60 112h180l-16 58H75z" fill="#d9f4ff" stroke="${outline}" stroke-width="6"/><path d="M90 94V68h118v26" stroke="${outline}" stroke-width="8"/>`);
  if (i === 11) return common(`<rect x="42" y="94" width="216" height="108" rx="14" fill="${p}" stroke="${outline}" stroke-width="8"/><path d="M64 113h172v48H64z" fill="${s}"/><path d="M82 137h136" stroke="${hi}" stroke-width="8" stroke-dasharray="16 12"/>`);
  if (i === 12) return common(`<path d="M42 113h55l20-42h104l35 42v89H42z" fill="${p}" stroke="${outline}" stroke-width="8"/><rect x="128" y="92" width="85" height="55" rx="15" fill="${s}"/><path d="M66 163h164" stroke="${hi}" stroke-width="10"/>`);
  if (i === 14) return common(`<rect x="42" y="92" width="216" height="110" rx="18" fill="${p}" stroke="${outline}" stroke-width="8"/><path d="M60 112h180v70H60z" fill="${s}"/><path d="M150 121v52M124 147h52" stroke="white" stroke-width="12" stroke-linecap="round"/>`);
  if (i === 15) return common(`<path d="M40 120Q150 44 260 120v82H40z" fill="${p}" stroke="${outline}" stroke-width="8"/><circle cx="101" cy="127" r="22" fill="${hi}"/><circle cx="198" cy="127" r="22" fill="${hi}"/><path d="M95 172q55 30 110 0" fill="none" stroke="${s}" stroke-width="10"/>`);
  return common(`<rect x="42" y="96" width="216" height="106" rx="15" fill="${p}" stroke="${outline}" stroke-width="8"/><path d="M62 118h176v48H62z" fill="${s}"/><path d="M75 142h150" stroke="${hi}" stroke-width="9"/>${bolts([68,232],187)}`);
}

function cab(i) {
  const [p, s] = palettes[i];
  const bubble = [1,5,10,13,15].includes(i);
  const roof = bubble ? "M60 203V112Q68 61 130 50h66q47 5 59 63v90z" : "M60 203V100l36-49h102q40 7 56 55v97z";
  return `
    <path d="${roof}" fill="${p}" stroke="${outline}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M146 69h43q27 8 39 43v34h-82z" fill="#bdeaff" stroke="${outline}" stroke-width="7"/>
    <path d="M78 103l27-34h27v77H78z" fill="#d9f4ff" stroke="${outline}" stroke-width="7"/>
    <path d="M139 65v95" stroke="${outline}" stroke-width="7"/>
    <rect x="75" y="165" width="158" height="28" rx="10" fill="${s}"/>
    <circle cx="219" cy="169" r="6" fill="${hi}"/>
    ${[2,3,7,8,11,14].includes(i) ? `<rect x="102" y="30" width="76" height="23" rx="10" fill="${s}" stroke="${outline}" stroke-width="6"/><circle cx="140" cy="28" r="10" fill="${i===3||i===14?"#ff5438":"#ffd338"}" stroke="${outline}" stroke-width="4"/>` : ""}
    ${i===4||i===12 ? `<path d="M74 95h165" stroke="${hi}" stroke-width="8" stroke-dasharray="14 10"/>` : ""}
  `;
}

function tool(i) {
  const [p, s] = palettes[(i + 4) % palettes.length];
  const plate = `<rect x="24" y="124" width="32" height="78" rx="8" fill="${s}" stroke="${outline}" stroke-width="7"/>${bolts([40],145)}`;
  if (i===0) return `${plate}<path d="M48 158L102 82h62l65 67-32 25-49-49h-26l-54 68" fill="none" stroke="${p}" stroke-width="25" stroke-linecap="round" stroke-linejoin="round"/><path d="M215 150l52 25-20 42-59-14z" fill="${s}" stroke="${outline}" stroke-width="8"/><path d="M57 161l50-68h55l54 54" fill="none" stroke="${hi}" stroke-width="5"/>`;
  if (i===1) return `${plate}<path d="M51 150h80" stroke="${p}" stroke-width="25"/><path d="M118 91h137v125H118l-28-63z" fill="${p}" stroke="${outline}" stroke-width="8"/><path d="M139 112v82M178 104v98M218 100v104" stroke="${hi}" stroke-width="6"/>`;
  if (i===2) return `${plate}<rect x="48" y="155" width="63" height="51" rx="10" fill="${p}" stroke="${outline}" stroke-width="7"/><path d="M77 160L211 58l24 23L105 176" fill="${s}" stroke="${outline}" stroke-width="7"/><path d="M112 139l91-69M139 122l22 23M171 95l23 22" stroke="${hi}" stroke-width="5"/><path d="M232 78v91q0 18 18 18" fill="none" stroke="${outline}" stroke-width="7"/><path d="M241 189q10 20 24 0" fill="none" stroke="${outline}" stroke-width="7"/>`;
  if (i===3) return `${plate}<path d="M53 155h72v38H53" fill="${p}" stroke="${outline}" stroke-width="7"/><path d="M118 174h137M118 198h137" stroke="${outline}" stroke-width="12" stroke-linecap="round"/><path d="M132 107v99M154 107v99" stroke="${s}" stroke-width="10"/>`;
  if (i===4) return `${plate}<rect x="49" y="145" width="71" height="52" rx="9" fill="${p}" stroke="${outline}" stroke-width="7"/><path d="M116 171h60" stroke="${s}" stroke-width="25"/><path d="M168 124l91 47-91 47z" fill="${p}" stroke="${outline}" stroke-width="8"/>${stripes(181,153,3)}`;
  if (i===5) return `${plate}<path d="M52 158h80" stroke="${p}" stroke-width="26"/><circle cx="196" cy="170" r="64" fill="${s}" stroke="${outline}" stroke-width="9"/><circle cx="196" cy="170" r="20" fill="${hi}" stroke="${outline}" stroke-width="7"/>`;
  if (i===6) return `${plate}<path d="M52 155h83l44-58" fill="none" stroke="${p}" stroke-width="24"/><path d="M171 83l87 53-37 68-93-58z" fill="${p}" stroke="${outline}" stroke-width="8"/>${stripes(164,117,3)}`;
  if (i===7) return `${plate}<path d="M51 160h75l42-55h52" fill="none" stroke="${p}" stroke-width="24"/><path d="M220 104v68" stroke="${outline}" stroke-width="14"/><path d="M203 176q18 29 36 0M229 176q18 29 36 0" fill="none" stroke="#45bcec" stroke-width="8" stroke-linecap="round"/>`;
  if (i===8) return `${plate}<path d="M53 161h139" stroke="${p}" stroke-width="24"/><path d="M182 159q52 0 52 45" fill="none" stroke="${outline}" stroke-width="11"/><path d="M221 210q18 25 37 0" fill="none" stroke="${outline}" stroke-width="9"/>`;
  if (i===9) return `${plate}<path d="M52 155h105" stroke="${p}" stroke-width="24"/><rect x="145" y="104" width="110" height="96" rx="14" fill="${p}" stroke="${outline}" stroke-width="8"/>${Array.from({length:13},(_,k)=>`<path d="M${151+k*8} 196l${k%2?5:-5} 32" stroke="#e58a25" stroke-width="7"/>`).join("")}`;
  if (i===10) return `${plate}<path d="M51 156h86" stroke="${p}" stroke-width="25"/><path d="M126 95h132v115H126l-28-58z" fill="${p}" stroke="${outline}" stroke-width="8"/><path d="M148 113l-20 78M190 105l-17 97M231 101l-13 104" stroke="#d7f5ff" stroke-width="7"/>`;
  if (i===11) return `${plate}<path d="M51 160h86" stroke="${p}" stroke-width="24"/><path d="M129 160l48-52 31 31 27-31 27 26-48 55h-70z" fill="${s}" stroke="${outline}" stroke-width="8"/>`;
  if (i===12) return `${plate}<rect x="49" y="151" width="68" height="51" rx="8" fill="${p}" stroke="${outline}" stroke-width="7"/><circle cx="177" cy="133" r="59" fill="${p}" stroke="${outline}" stroke-width="8"/><path d="M140 101l75 62M139 162l76-62" stroke="${hi}" stroke-width="8"/><path d="M230 133h29" stroke="${s}" stroke-width="18"/>`;
  if (i===13) return `${plate}<path d="M51 161h81" stroke="${p}" stroke-width="25"/><path d="M122 156l69-75 42 20-35 49 52 38-30 35-80-46z" fill="${s}" stroke="${outline}" stroke-width="8"/>`;
  if (i===14) return `${plate}<rect x="50" y="158" width="65" height="44" rx="8" fill="${p}" stroke="${outline}" stroke-width="7"/><path d="M84 158l38-72 28 72 34-72 28 72" fill="none" stroke="${s}" stroke-width="12"/><rect x="182" y="66" width="76" height="55" rx="8" fill="${p}" stroke="${outline}" stroke-width="8"/>`;
  return `${plate}<rect x="48" y="151" width="64" height="51" rx="8" fill="${p}" stroke="${outline}" stroke-width="7"/><path d="M108 158h143" stroke="${s}" stroke-width="20"/><path d="M120 151l20 20 20-20 20 20 20-20 20 20" fill="none" stroke="${hi}" stroke-width="5"/><circle cx="136" cy="184" r="14" fill="${dark}"/><circle cx="192" cy="184" r="14" fill="${dark}"/><circle cx="240" cy="184" r="14" fill="${dark}"/>`;
}

function movement(i) {
  const [p, s] = palettes[i];
  if (i < 8) {
    const r = i===4 ? 55 : i===5 ? 75 : 68;
    return `<circle cx="150" cy="170" r="${r}" fill="#253642" stroke="${outline}" stroke-width="8"/><circle cx="150" cy="170" r="${r-20}" fill="${p}" stroke="#101f29" stroke-width="7"/><circle cx="150" cy="170" r="20" fill="${hi}" stroke="${outline}" stroke-width="7"/>${bolts([150],170,"#fff")}<path d="M150 ${170-r+8}v16M150 ${170+r-24}v16M${150-r+8} 170h16M${150+r-24} 170h16" stroke="#758792" stroke-width="7"/>`;
  }
  if (i < 12) return `<path d="M37 130q0-39 39-39h148q39 0 39 39v76q0 34-34 34H71q-34 0-34-34z" fill="#263944" stroke="${outline}" stroke-width="8"/><path d="M66 115h168v100H66z" fill="none" stroke="${p}" stroke-width="17" stroke-dasharray="20 9"/><circle cx="91" cy="168" r="31" fill="${s}" stroke="${outline}" stroke-width="7"/><circle cx="150" cy="168" r="31" fill="${s}" stroke="${outline}" stroke-width="7"/><circle cx="209" cy="168" r="31" fill="${s}" stroke="${outline}" stroke-width="7"/>`;
  if (i===12) return `<circle cx="150" cy="170" r="72" fill="${p}" stroke="${outline}" stroke-width="9"/><circle cx="150" cy="170" r="20" fill="${hi}" stroke="${outline}" stroke-width="7"/><path d="M105 115l90 110M195 115L105 225" stroke="${s}" stroke-width="10"/>`;
  if (i===13) return `<circle cx="150" cy="170" r="70" fill="${p}" stroke="${outline}" stroke-width="9"/><path d="M150 106v128M86 170h128M105 125l90 90M195 125l-90 90" stroke="${hi}" stroke-width="14"/><circle cx="150" cy="170" r="19" fill="${s}" stroke="${outline}" stroke-width="6"/>`;
  if (i===14) return `<path d="M36 174h214q19 0 12 18-8 22-39 22H69q-29 0-33-40z" fill="${p}" stroke="${outline}" stroke-width="8"/><path d="M84 174l25-68M205 174l-22-68" stroke="${s}" stroke-width="14"/>`;
  return `<path d="M36 143q114-72 228 0l-22 79H58z" fill="#334d5a" stroke="${outline}" stroke-width="8"/><path d="M53 159h194l-14 42H67z" fill="${p}"/><path d="M79 168h142" stroke="${hi}" stroke-width="8" stroke-dasharray="14 9"/>`;
}

for (const [name, factory] of [["v6-flat-chassis.png", chassis], ["v6-flat-bodies.png", body], ["v6-flat-cabs.png", cab], ["v6-flat-tools.png", tool], ["v6-flat-movement.png", movement]]) {
  const source = svg(Array.from({ length: 16 }, (_, i) => factory(i)));
  await sharp(Buffer.from(source)).png({ compressionLevel: 9, palette: true }).toFile(path.join(output, name));
  console.log(`generated ${name}`);
}
