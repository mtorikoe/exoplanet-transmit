/* ============================================================
   data.js — shared constants used across game modules
   ============================================================ */

const WL = [
  { name:'Visible (g)',  range:'400–550 nm', color:'#b8e860', dip:.970,
    note:'Moderate dip. Standard baseline.' },
  { name:'Red (i)',      range:'700–820 nm', color:'#f06060', dip:.963,
    note:'Slightly deeper — less limb-darkening.' },
  { name:'Infrared (z)', range:'900–1000 nm',color:'#ff9955', dip:.956,
    note:'Deepest dip — most uniform disk.' },
  { name:'Blue (u)',     range:'320–400 nm', color:'#70aaff', dip:.976,
    note:'Shallowest + noisiest channel.' },
];

const PLANETS = [
  { name:'Kepler-22b type',   desc:'Super-Earth in the habitable zone. Surface may allow liquid water. Radius: 2.4x Earth.',   color:'#4fc3f7' },
  { name:'Hot Jupiter',       desc:'Gas giant orbiting extremely close. A year lasts 3 Earth days. Surface: 1,200 C.',         color:'#ff7043' },
  { name:'Mini-Neptune',      desc:'Thick hydrogen atmosphere, no solid surface. Radius 3x Earth. Common in our galaxy.',      color:'#9575cd' },
  { name:'Rocky super-Earth', desc:'About twice Earth mass. Could host liquid water at the right orbital distance.',           color:'#8d6e63' },
  { name:'Ice giant',         desc:'Frozen methane and ammonia world — similar to Uranus and Neptune in our solar system.',    color:'#80cbc4' },
  { name:'Lava world',        desc:'Tidally locked magma ocean. One face permanently toward its star at 2,500 C.',             color:'#ef5350' },
];