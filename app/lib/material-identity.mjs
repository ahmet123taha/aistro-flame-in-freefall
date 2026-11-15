// Family identifiers aid discovery; they never establish equal product grades.
// Only explicit names are aliases. Do not strip mixture/composition qualifiers:
// cotton/polyester and an unspecified cotton/fiberglass blend are not pure cotton
// or the named SIBAL specimen merely because those words appear in their name.
const aliases=Object.freeze({
 'polymethyl methacrylate':'pmma','polymethylmethacrylate':'pmma','poly(methyl methacrylate)':'pmma',
 'ptfe / teflon':'teflon','ptfe':'teflon',
 'sibal fabric':'sibal','sibal cloth':'sibal','cotton-fiberglass (sibal)':'sibal','cotton/fiberglass (sibal)':'sibal',
 'cotton fabric':'cotton','cotton cloth':'cotton','cotton textile':'cotton','100% cotton':'cotton','pure cotton':'cotton',
 'pamuk':'cotton','pamuk kumaş':'cotton','pamuk kumaşı':'cotton','pamuk kumas':'cotton','pamuk kumasi':'cotton',
 'fiber glass':'fiberglass','glass fiber':'fiberglass','glass fibre':'fiberglass','cam elyaf':'fiberglass','cam elyafı':'fiberglass',
 'n-heptane':'heptane','n-dodecane':'dodecane','isooctane':'iso-octane','nc14':'n-tetradecane'
});
export function canonicalMaterial(value){
 const name=String(value||'').normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/i\u0307/g,'i').replace(/[‐‑‒–−]/g,'-').replace(/\s+/g,' ');
 return aliases[name]||name;
}
