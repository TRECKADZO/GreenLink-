/**
 * Donnees administratives de Cote d'Ivoire
 * Structure: Region -> Departement -> Sous-prefecture
 * Source: Decoupage administratif officiel
 */

const CI_GEO_DATA = {
  "Agneby-Tiassa": {
    departements: {
      "Agboville": ["Agboville", "Azaguie", "Grand-Morié", "Rubino", "Céchi"],
      "Sikensi": ["Sikensi", "Gomon"],
      "Tiassalé": ["Tiassalé", "Moronou", "N'Douci"],
    }
  },
  "Bafing": {
    departements: {
      "Touba": ["Touba", "Booko", "Koro", "Guinteguela"],
      "Ouaninou": ["Ouaninou", "Gbonné"],
    }
  },
  "Bagoué": {
    departements: {
      "Boundiali": ["Boundiali", "Ganaoni", "Kasséré", "Baya", "Siempurgo"],
      "Kouto": ["Kouto", "Kasséré"],
      "Tengréla": ["Tengréla", "Kanakono", "Papara", "Débété"],
    }
  },
  "Bélier": {
    departements: {
      "Yamoussoukro": ["Yamoussoukro", "Kossou", "Attiégouakro"],
      "Didiévi": ["Didiévi", "Raviart"],
      "Tiébissou": ["Tiébissou", "Molonoublé", "Kouassi-Kouassikro"],
      "Toumodi": ["Toumodi", "Kokumbo", "Djekanou"],
    }
  },
  "Béré": {
    departements: {
      "Mankono": ["Mankono", "Sarhala", "Kongasso", "Marandallah"],
      "Dianra": ["Dianra", "Dianra-Village"],
      "Kounahiri": ["Kounahiri", "Kongasso"],
    }
  },
  "Bounkani": {
    departements: {
      "Bouna": ["Bouna", "Ondéfidouo", "Youndouo"],
      "Doropo": ["Doropo", "Kalamon", "Danoa"],
      "Nassian": ["Nassian", "Sominassé"],
      "Téhini": ["Téhini", "Tougbo"],
    }
  },
  "Cavally": {
    departements: {
      "Guiglo": ["Guiglo", "Kaadé", "Nizahon"],
      "Bloléquin": ["Bloléquin", "Diboké", "Zéaglo"],
      "Toulépleu": ["Toulépleu", "Bakoubly", "Péhé"],
      "Taï": ["Taï", "Zagné", "Daobly"],
    }
  },
  "District Abidjan": {
    departements: {
      "Abidjan": ["Abobo", "Adjamé", "Attécoubé", "Cocody", "Koumassi", "Marcory", "Plateau", "Port-Bouët", "Treichville", "Yopougon"],
      "Anyama": ["Anyama", "Brofodoumé"],
      "Bingerville": ["Bingerville"],
      "Songon": ["Songon"],
    }
  },
  "Gbêkê": {
    departements: {
      "Bouaké": ["Bouaké", "Brobo", "Djébonoua", "Languibonou"],
      "Béoumi": ["Béoumi", "Bodokro", "Kondrobo"],
      "Sakassou": ["Sakassou", "Toumodi-Sakassou"],
    }
  },
  "Gbôklé": {
    departements: {
      "Sassandra": ["Sassandra", "Dakpadou"],
      "Méagui": ["Méagui", "Oupoyo"],
      "Gueyo": ["Gueyo"],
    }
  },
  "Gôh": {
    departements: {
      "Gagnoa": ["Gagnoa", "Ouragahio", "Serihio", "Guépahouo", "Bayota", "Dignago"],
      "Oumé": ["Oumé", "Tonla", "Diégonéfla"],
    }
  },
  "Gontougo": {
    departements: {
      "Bondoukou": ["Bondoukou", "Sapli-Sépingo", "Laoudi-Ba", "Tabagne"],
      "Koun-Fao": ["Koun-Fao", "Tankessé"],
      "Tanda": ["Tanda", "Tchédio", "Transua", "Kouassi-Datékro"],
      "Transua": ["Transua", "Assuéfry"],
    }
  },
  "Grands-Ponts": {
    departements: {
      "Dabou": ["Dabou", "Toupah", "Lopou", "Cosrou"],
      "Jacqueville": ["Jacqueville", "Attoutou"],
      "Grand-Lahou": ["Grand-Lahou", "Toukouzou", "Bacanda"],
    }
  },
  "Guémon": {
    departements: {
      "Duékoué": ["Duékoué", "Guéhiébly", "Kouibly"],
      "Bangolo": ["Bangolo", "Zéo", "Diégonéfla"],
      "Facobly": ["Facobly", "Tiéningboué"],
    }
  },
  "Hambol": {
    departements: {
      "Katiola": ["Katiola", "Timbé", "Fronan", "Niakaramandougou"],
      "Dabakala": ["Dabakala", "Satama-Sokoro", "Boniéré", "Foumbolo"],
      "Niakara": ["Niakara", "Tafiré", "Badikaha"],
    }
  },
  "Haut-Sassandra": {
    departements: {
      "Daloa": ["Daloa", "Gonaté", "Bédiala", "Domangbeu"],
      "Issia": ["Issia", "Nahio", "Boguédia", "Saïoua"],
      "Vavoua": ["Vavoua", "Bazra-Nattis", "Kétro-Bassam", "Dananon"],
    }
  },
  "Iffou": {
    departements: {
      "Daoukro": ["Daoukro", "Ettrokro", "Ananda"],
      "Bocanda": ["Bocanda", "Kouadioblékro", "Bengassou"],
      "M'Bahiakro": ["M'Bahiakro", "Prikro", "Kondossou"],
    }
  },
  "Indénié-Djuablin": {
    departements: {
      "Abengourou": ["Abengourou", "Aniassué", "Niablé", "Amélékia", "Ebilassokro"],
      "Agnibilékrou": ["Agnibilékrou", "Damé", "Essiempoua"],
      "Bettié": ["Bettié", "Akoboissué"],
    }
  },
  "Kabadougou": {
    departements: {
      "Odienné": ["Odienné", "Bako", "Dioulatièdougou", "Samatiguila"],
      "Madinani": ["Madinani", "Tienko", "Kimbirila-Nord"],
      "Séguélon": ["Séguélon", "Gbéléban"],
    }
  },
  "La Mé": {
    departements: {
      "Adzopé": ["Adzopé", "Annépé", "Bécédi-Brignan", "Yakassé-Attobrou"],
      "Akoupé": ["Akoupé", "Bécouéfin", "Kotobi"],
      "Alépé": ["Alépé", "Oghlwapo"],
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
      "Bouaflé": ["Bouaflé", "Bonon", "Zuénoula"],
      "Zuénoula": ["Zuénoula", "Gohitafla"],
      "Sinfra": ["Sinfra", "Konéfla"],
    }
  },
  "Moronou": {
    departements: {
      "Bongouanou": ["Bongouanou", "Anoumaba", "Arrah"],
      "M'Batto": ["M'Batto", "Tiémélékro"],
      "Arrah": ["Arrah"],
    }
  },
  "Nawa": {
    departements: {
      "Soubré": ["Soubré", "Buyo", "Grand-Zattry", "Liliyo", "Okrouyo"],
      "Buyo": ["Buyo", "Guéyo"],
      "Guéyo": ["Guéyo"],
    }
  },
  "N'Zi": {
    departements: {
      "Dimbokro": ["Dimbokro", "Abigui", "Diabo"],
      "Bocanda": ["Bocanda", "Kouassi-Kouassikro"],
    }
  },
  "Poro": {
    departements: {
      "Korhogo": ["Korhogo", "Lataha", "Karakoro", "Dassoungboho", "Tioroniaradougou"],
      "Sinématiali": ["Sinématiali", "Nafoun"],
      "Dikodougou": ["Dikodougou", "Guiembé"],
      "M'Bengué": ["M'Bengué", "Bougou"],
    }
  },
  "San-Pédro": {
    departements: {
      "San-Pédro": ["San-Pédro", "Grand-Béréby", "Doba"],
      "Tabou": ["Tabou", "Grabo", "Olodio", "Djouroutou"],
    }
  },
  "Sassandra-Marahoué": {
    departements: {
      "Daloa": ["Daloa", "Vavoua", "Issia"],
    }
  },
  "Sud-Comoé": {
    departements: {
      "Aboisso": ["Aboisso", "Ayamé", "Maféré", "Bianouan", "Adiake"],
      "Adiaké": ["Adiaké", "Etuéboué", "Assinie-Mafia"],
      "Grand-Bassam": ["Grand-Bassam", "Bonoua", "Vitré"],
      "Tiapoum": ["Tiapoum", "Nouamou"],
    }
  },
  "Tchologo": {
    departements: {
      "Ferkessédougou": ["Ferkessédougou", "Koumbala", "Nielle"],
      "Kong": ["Kong", "Bilimono", "Nafana"],
      "Ouangolodougou": ["Ouangolodougou", "Niellé", "Lafiné"],
    }
  },
  "Tonkpi": {
    departements: {
      "Man": ["Man", "Logoualé", "Sangouiné", "Gbepleu"],
      "Biankouma": ["Biankouma", "Santa", "Sipilou"],
      "Danané": ["Danané", "Zouanhounien", "Mahapleu"],
      "Zouan-Hounien": ["Zouan-Hounien", "Bin-Houyé"],
    }
  },
  "Worodougou": {
    departements: {
      "Séguéla": ["Séguéla", "Massala", "Sifié", "Dualla"],
      "Kani": ["Kani", "Morondo"],
    }
  },
};

// Extraire les listes pour les selects
export function getRegions() {
  return Object.keys(CI_GEO_DATA).sort();
}

export function getDepartements(region) {
  if (!region || !CI_GEO_DATA[region]) return [];
  return Object.keys(CI_GEO_DATA[region].departements).sort();
}

export function getSousPrefectures(region, departement) {
  if (!region || !departement || !CI_GEO_DATA[region]) return [];
  const deps = CI_GEO_DATA[region].departements;
  return (deps[departement] || []).sort();
}

// Trouver la region a partir d'un departement
export function findRegionByDepartement(departement) {
  if (!departement) return null;
  for (const [region, data] of Object.entries(CI_GEO_DATA)) {
    if (data.departements[departement]) return region;
  }
  return null;
}

// Toutes les sous-prefectures a plat (pour recherche)
export function getAllSousPrefectures() {
  const all = [];
  for (const [region, data] of Object.entries(CI_GEO_DATA)) {
    for (const [dep, sps] of Object.entries(data.departements)) {
      for (const sp of sps) {
        all.push({ region, departement: dep, sous_prefecture: sp });
      }
    }
  }
  return all.sort((a, b) => a.sous_prefecture.localeCompare(b.sous_prefecture));
}

export default CI_GEO_DATA;
