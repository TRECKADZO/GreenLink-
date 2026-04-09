/**
 * Divisions administratives de Côte d'Ivoire
 * Structure hiérarchique : Région -> Département -> Sous-préfecture
 * Source : Découpage administratif officiel de la République de Côte d'Ivoire
 */

const DIVISIONS_CI = {
  "Abidjan": {
    departements: {
      "Abidjan": ["Abobo", "Adjamé", "Anyama", "Attécoubé", "Bingerville", "Cocody", "Koumassi", "Marcory", "Plateau", "Port-Bouët", "Songon", "Treichville", "Yopougon"],
    }
  },
  "Yamoussoukro": {
    departements: {
      "Yamoussoukro": ["Yamoussoukro", "Attiégouakro", "Kossou"],
    }
  },
  "Agnéby-Tiassa": {
    departements: {
      "Agboville": ["Agboville", "Azaguié", "Grand-Morié", "Rubino", "Céchi"],
      "Tiassalé": ["Tiassalé", "N'Douci", "Morokro"],
    }
  },
  "Bafing": {
    departements: {
      "Touba": ["Touba", "Booko", "Guintéguéla", "Koro"],
    }
  },
  "Bagoué": {
    departements: {
      "Boundiali": ["Boundiali", "Ganaoni", "Kolia", "Siempurgo"],
      "Kouto": ["Kouto"],
      "Tengréla": ["Tengréla", "Kanakono", "Débété", "Papara"],
    }
  },
  "Bélier": {
    departements: {
      "Dimbokro": ["Dimbokro", "Kouakou-Broukro", "Abigui"],
      "Djékanou": ["Djékanou"],
      "Tiébissou": ["Tiébissou", "Molonoublé"],
      "Toumodi": ["Toumodi", "Kokumbo", "Kpouèbo"],
    }
  },
  "Béré": {
    departements: {
      "Mankono": ["Mankono", "Tienkoikro", "Marandallah", "Sarhala", "Kongasso"],
      "Dianra": ["Dianra", "Kounahiri"],
    }
  },
  "Bounkani": {
    departements: {
      "Bouna": ["Bouna", "Ondéfidouo", "Youndouo"],
      "Doropo": ["Doropo", "Kalamon", "Danoa"],
      "Nassian": ["Nassian"],
      "Téhini": ["Téhini", "Tougbo", "Kokpingué"],
    }
  },
  "Cavally": {
    departements: {
      "Guiglo": ["Guiglo", "Kaadé", "Nizahon"],
      "Bloléquin": ["Bloléquin", "Diboké", "Doké", "Zéo"],
      "Toulépleu": ["Toulépleu", "Bakoubly", "Tiobly", "Péhé"],
    }
  },
  "Folon": {
    departements: {
      "Minignan": ["Minignan", "Sokoro", "Goulia"],
    }
  },
  "Gbêkê": {
    departements: {
      "Bouaké": ["Bouaké", "Djébonoua", "Brobo", "Languibonou"],
      "Béoumi": ["Béoumi", "Bodokro", "Kondrobo", "Lolobo"],
      "Sakassou": ["Sakassou"],
    }
  },
  "Gbôklé": {
    departements: {
      "Sassandra": ["Sassandra", "Sago", "Lobakuya"],
      "Fresco": ["Fresco", "Dassioko"],
    }
  },
  "Gôh": {
    departements: {
      "Gagnoa": ["Gagnoa", "Bayota", "Dignago", "Guibéroua", "Ouragahio", "Serihio", "Gnagbodougnoa"],
    }
  },
  "Gontougo": {
    departements: {
      "Bondoukou": ["Bondoukou", "Sapli-Sépingo", "Tabagne", "Tagadi", "Pinda-Boroko"],
      "Koun-Fao": ["Koun-Fao", "Amanvi", "Kouassi-Datékro"],
      "Tanda": ["Tanda", "Assuéfry", "Transua", "Tankessé"],
    }
  },
  "Grands-Ponts": {
    departements: {
      "Dabou": ["Dabou", "Lopou", "Toupah", "Sikensi"],
      "Grand-Lahou": ["Grand-Lahou", "Toukouzou", "Irobo", "Ahouanou"],
      "Jacqueville": ["Jacqueville"],
    }
  },
  "Guémon": {
    departements: {
      "Duékoué": ["Duékoué", "Guézon", "Gbapleu", "Kouibly"],
      "Bangolo": ["Bangolo", "Digoualé", "Zou", "Zéaglo"],
    }
  },
  "Hambol": {
    departements: {
      "Katiola": ["Katiola", "Fronan", "Timbé", "Niakaramandougou"],
      "Dabakala": ["Dabakala", "Boniérédougou", "Foumbolo", "Satama-Sokoro", "Satama-Sokoura"],
    }
  },
  "Haut-Sassandra": {
    departements: {
      "Daloa": ["Daloa", "Bediala", "Gonaté", "Zoukougbeu"],
      "Issia": ["Issia", "Boguédia", "Iboguhé", "Saïoua", "Nahio"],
      "Vavoua": ["Vavoua", "Bazré", "Dananon", "Kétro-Bassam"],
    }
  },
  "Iffou": {
    departements: {
      "Daoukro": ["Daoukro", "Ettrokro", "Ouellé"],
      "Prikro": ["Prikro", "Koffi-Amonkro", "Sokala-Sobara"],
      "M'Bahiakro": ["M'Bahiakro", "Nofou", "Satama-Sokoura"],
    }
  },
  "Indénié-Djuablin": {
    departements: {
      "Abengourou": ["Abengourou", "Aniassué", "Ebilassokro", "Niablé", "Amélékia", "Yakassé-Féyassé"],
      "Agnibilékrou": ["Agnibilékrou", "Daménou", "Tanguelan"],
      "Béttié": ["Béttié"],
    }
  },
  "Kabadougou": {
    departements: {
      "Odienné": ["Odienné", "Bako", "Dioulatiédougou", "Samango", "N'Goloblasso", "Tienko"],
      "Madinani": ["Madinani", "Gbéléban", "Séguélon"],
      "Samatiguila": ["Samatiguila", "Kimbirila-Nord"],
    }
  },
  "La Mé": {
    departements: {
      "Adzopé": ["Adzopé", "Assikoi", "Annépé", "Bécédi-Brignan", "Yakassé-Attobrou"],
      "Akoupé": ["Akoupé", "Kotobi", "Bécouéfin"],
      "Alépé": ["Alépé", "Aboisso-Comoé", "Oghlwapo"],
    }
  },
  "Lôh-Djiboua": {
    departements: {
      "Divo": ["Divo", "Guitry", "Hiré", "Lakota"],
      "Lakota": ["Lakota", "Zikisso", "Goudouko"],
    }
  },
  "Marahoué": {
    departements: {
      "Bouaflé": ["Bouaflé", "Bonon", "Manfla", "Zaguiéta"],
      "Sinfra": ["Sinfra", "Bazra-Nattis", "Konéfla"],
      "Zuénoula": ["Zuénoula", "Gohitafla"],
    }
  },
  "Moronou": {
    departements: {
      "Bongouanou": ["Bongouanou", "Arrah", "Anoumaba", "M'Batto"],
    }
  },
  "Nawa": {
    departements: {
      "Soubré": ["Soubré", "Buyo", "Grand-Zattry", "Liliyo", "Méagui", "Okrouyo"],
    }
  },
  "N'Zi": {
    departements: {
      "Dimbokro": ["Dimbokro", "Diabo"],
      "Bocanda": ["Bocanda", "Kouadioblékro", "N'Zécrézessou"],
    }
  },
  "Poro": {
    departements: {
      "Korhogo": ["Korhogo", "Karakoro", "Lataha", "Tioroniaradougou", "Kanoroba", "Dassoungboho"],
      "Sinématiali": ["Sinématiali", "Nganon"],
      "Dikodougou": ["Dikodougou", "Guiembé"],
      "M'Bengué": ["M'Bengué", "Bougou", "Katiali"],
    }
  },
  "San-Pédro": {
    departements: {
      "San-Pédro": ["San-Pédro", "Doba", "Grand-Béréby"],
      "Tabou": ["Tabou", "Grabo", "Djouroutou", "Olodio"],
    }
  },
  "Sassandra-Marahoué": {
    departements: {
      "Daloa": ["Daloa"],
    }
  },
  "Sud-Comoé": {
    departements: {
      "Aboisso": ["Aboisso", "Adiaké", "Ayamé", "Bianouan", "Etuéboué", "Maféré", "Tiapoum", "Krindjabo"],
      "Grand-Bassam": ["Grand-Bassam", "Bonoua", "Vitré"],
    }
  },
  "Tchologo": {
    departements: {
      "Ferkessédougou": ["Ferkessédougou", "Koumbala"],
      "Kong": ["Kong", "Bilimono", "Nafana"],
      "Ouangolodougou": ["Ouangolodougou", "Niellé", "Togoniéré", "Doropo"],
    }
  },
  "Tonkpi": {
    departements: {
      "Man": ["Man", "Logoualé", "Sangouiné", "Gbonné"],
      "Biankouma": ["Biankouma", "Gbonné", "Santa"],
      "Danané": ["Danané", "Gouiné", "Mahapleu", "Sipilou"],
      "Zouan-Hounien": ["Zouan-Hounien", "Bin-Houyé", "Yapleu"],
    }
  },
  "Worodougou": {
    departements: {
      "Séguéla": ["Séguéla", "Dualla", "Massala", "Worofla", "Sifié"],
      "Kani": ["Kani", "Diarabana", "Morondo"],
    }
  },
};

// Extract flat lists for easy access
export const REGIONS_CI = Object.keys(DIVISIONS_CI).sort();

export const getDepartements = (region) => {
  if (!region || !DIVISIONS_CI[region]) return [];
  return Object.keys(DIVISIONS_CI[region].departements).sort();
};

export const getSousPrefectures = (region, departement) => {
  if (!region || !departement || !DIVISIONS_CI[region]) return [];
  const deps = DIVISIONS_CI[region].departements;
  if (!deps[departement]) return [];
  return [...deps[departement]].sort();
};

// Get all départements (flat list)
export const ALL_DEPARTEMENTS = (() => {
  const set = new Set();
  Object.values(DIVISIONS_CI).forEach(r => {
    Object.keys(r.departements).forEach(d => set.add(d));
  });
  return [...set].sort();
})();

// Get all sous-préfectures (flat list)
export const ALL_SOUS_PREFECTURES = (() => {
  const set = new Set();
  Object.values(DIVISIONS_CI).forEach(r => {
    Object.values(r.departements).forEach(sps => {
      sps.forEach(sp => set.add(sp));
    });
  });
  return [...set].sort();
})();

export default DIVISIONS_CI;
