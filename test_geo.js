const address1 = "PLACE DE L'HOTEL DE VILLE, Bureau du Maire, 09210 LEZAT-SUR-LEZE";
const query1 = encodeURIComponent(address1.includes('France') ? address1 : `${address1}, France`);
console.log(query1);

fetch(`https://nominatim.openstreetmap.org/search?q=${query1}&format=json&limit=1`, {
  headers: { 'User-Agent': 'ElectroFix-App/1.0 (contact: admin@electrofix.fr)' }
})
.then(res => res.json())
.then(data => console.log("Result 1:", data));

const address2 = "PLACE DE L'HOTEL DE VILLE, 09210 LEZAT-SUR-LEZE";
const query2 = encodeURIComponent(address2.includes('France') ? address2 : `${address2}, France`);

fetch(`https://nominatim.openstreetmap.org/search?q=${query2}&format=json&limit=1`, {
  headers: { 'User-Agent': 'ElectroFix-App/1.0 (contact: admin@electrofix.fr)' }
})
.then(res => res.json())
.then(data => console.log("Result 2:", data));
