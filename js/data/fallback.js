export const romans = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
export const monthLabels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export const fallbackCombinations = [
  [2,5,12,25,34,35],
  [14,15,16,23,42,48],
  [7,9,30,39,41,44],
  [7,16,21,25,45,46],
  [11,12,25,26,33,48],
  [5,8,19,22,36,45],
  [1,16,31,33,34,47],
  [15,17,22,26,39,41],
  [6,7,14,21,28,46],
  [1,7,21,22,23,44]
];

export const fallbackMonthlyAwards = [
  21,21,0,0,0,0,0,0,0,0,0,0
];

export const fallbackHistory = [
  {year:2026,start:213.57,awards:42,spent:0,extra:0,end:255.57,note:'Temporada en curso'},
  {year:2025,start:2147,awards:331.43,spent:2264.86,extra:0,end:213.57,note:'Salida importante del bote'},
  {year:2024,start:1760,awards:387.23,spent:0,extra:0,end:2147.23,note:''},
  {year:2023,start:1568,awards:252,spent:120,extra:60,end:1760,note:'Juego extraordinario: 120 € gastados / 60 € premiados'},
  {year:2022,start:1291.48,awards:277.16,spent:0,extra:0,end:1568.64,note:''},
  {year:2021,start:828,awards:463.48,spent:0,extra:0,end:1291.48,note:''},
  {year:2020,start:508,awards:320,spent:0,extra:0,end:828,note:''},
  {year:2019,start:233,awards:275,spent:0,extra:0,end:508,note:''},
  {year:2018,start:10,awards:223,spent:0,extra:0,end:233,note:''},
  {year:2017,start:0,awards:10,spent:0,extra:0,end:10,note:''},
  {year:2016,start:286.78,awards:280.47,spent:0,extra:0,end:567.25,note:''},
  {year:2015,start:46,awards:280.78,spent:40,extra:0,end:286.78,note:'40 € gastados en dos décimos de lotería'},
  {year:2014,start:7,awards:39,spent:0,extra:0,end:46,note:''},
  {year:2013,start:8,awards:329,spent:0,extra:0,end:337,note:''},
  {year:2012,start:43,awards:8,spent:43,extra:0,end:8,note:'Salida/ajuste histórico inferido por diferencia de saldo'}
];

export const fallbackRules = [
  ['Premios importantes','Si toca un premio igual o superior a 6.000 €, solo participan en el reparto quienes estén al día o tengan como máximo 2 € de deuda.'],
  ['Deudas prolongadas','Con una deuda superior a 8 €, el socio puede ser expulsado y no reincorporarse hasta después del siguiente reparto del premio acumulado.'],
  ['Nuevas incorporaciones','Quien entre nuevo debe ponerse al día desde el último reparto del premio acumulado hasta su fecha de alta.'],
  ['Baja voluntaria','Quien abandone solo tiene derecho a su parte del premio acumulado si está al corriente en el momento de la baja.'],
  ['Comidas o cenas','Si se utiliza el bote para una comida/cena, quien no asista recibe su parte proporcional o puede aplicarla a su cuota, siempre que no tenga deuda.'],
  ['Cambios de normas','Las normas pueden modificarse en casos especiales mediante votación secreta e individual y con acuerdo unánime.']
];
