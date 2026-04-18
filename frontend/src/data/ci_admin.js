/**
 * Données administratives de Côte d'Ivoire
 * Source: Wikipedia / RGPH 2014
 * Structure: Region → Département → Sous-préfectures
 * 31 régions, 108 départements, 509 sous-préfectures
 */

const CI_ADMIN = [
  { region: "District d'Abidjan", departements: [
    { nom: "Abidjan", sous_prefectures: ["Abobo","Adjame","Attecoube","Cocody","Plateau","Yopougon","Koumassi","Marcory","Port-Bouet","Treichville","Bingerville","Brofodoume","Anyama","Songon"] },
  ]},
  { region: "District de Yamoussoukro", departements: [
    { nom: "Attiegouakro", sous_prefectures: ["Attiegouakro","Lolobo"] },
    { nom: "Yamoussoukro", sous_prefectures: ["Yamoussoukro","Kossou"] },
  ]},
  { region: "Gbokle", departements: [
    { nom: "Fresco", sous_prefectures: ["Dahiri","Fresco","Gbagbam"] },
    { nom: "Sassandra", sous_prefectures: ["Dakpadou","Grihiri","Lobakuya","Medon","Sago","Sassandra"] },
  ]},
  { region: "Nawa", departements: [
    { nom: "Buyo", sous_prefectures: ["Buyo","Dapeoua"] },
    { nom: "Gueyo", sous_prefectures: ["Dabouyo","Gueyo"] },
    { nom: "Meagui", sous_prefectures: ["Gnamangui","Meagui","Oupoyo"] },
    { nom: "Soubre", sous_prefectures: ["Grand-Zattry","Liliyo","Okrouyo","Soubre"] },
  ]},
  { region: "San-Pedro", departements: [
    { nom: "San-Pedro", sous_prefectures: ["Doba","Dogbo","Gabiadji","Grand-Bereby","San-Pedro"] },
    { nom: "Tabou", sous_prefectures: ["Dapo-Iboke","Djamandioke","Djouroutou","Grabo","Olodio","Tabou"] },
  ]},
  { region: "Indenie-Djuablin", departements: [
    { nom: "Abengourou", sous_prefectures: ["Abengourou","Amelekia","Aniassue","Ebilassokro","Niable","Yakasse-Feyasse","Zaranou"] },
    { nom: "Agnibilekrou", sous_prefectures: ["Agnibilekrou","Akoboissue","Dame","Duffrebo","Tanguelan"] },
    { nom: "Bettie", sous_prefectures: ["Bettie","Diamarakro"] },
  ]},
  { region: "Sud-Comoe", departements: [
    { nom: "Aboisso", sous_prefectures: ["Aboisso","Adaou","Adjouan","Ayame","Bianouan","Kouakro","Mafere","Yaou"] },
    { nom: "Adiake", sous_prefectures: ["Adiake","Assinie-Mafia","Etueboue"] },
    { nom: "Grand-Bassam", sous_prefectures: ["Bongo","Bonoua","Grand-Bassam"] },
    { nom: "Tiapoum", sous_prefectures: ["Noe","Nouamou","Tiapoum"] },
  ]},
  { region: "Moronou", departements: [
    { nom: "Arrah", sous_prefectures: ["Arrah","Kotobi","Krebe"] },
    { nom: "Bongouanou", sous_prefectures: ["Ande","Assie-Koumassi","Bongouanou","N'Guessankro"] },
    { nom: "M'Batto", sous_prefectures: ["Anoumaba","Assahara","M'Batto","Tiemelekro"] },
  ]},
  { region: "Folon", departements: [
    { nom: "Kaniasso", sous_prefectures: ["Goulia","Kaniasso","Mahandiana-Sokourani"] },
    { nom: "Minignan", sous_prefectures: ["Kimbirila-Nord","Minignan","Sokoro","Tienko"] },
  ]},
  { region: "Kabadougou", departements: [
    { nom: "Gbeleban", sous_prefectures: ["Gbeleban","Samango","Seydougou"] },
    { nom: "Madinani", sous_prefectures: ["Fengolo","Madinani","N'Goloblasso"] },
    { nom: "Odienne", sous_prefectures: ["Bako","Bougousso","Dioulatiedougou","Odienne","Tieme"] },
    { nom: "Samatiguila", sous_prefectures: ["Kimbirila-Sud","Samatiguila"] },
    { nom: "Seguelon", sous_prefectures: ["Gbongaha","Seguelon"] },
  ]},
  { region: "Goh", departements: [
    { nom: "Gagnoa", sous_prefectures: ["Bayota","Dahiepa-Kehi","Dignago","Dougroupalegnaoa","Doukouyo","Gagnoa","Galebre-Galebouo","Gnagbodougnoa","Guiberoua","Ouragahio","Serihio","Yopohue"] },
    { nom: "Oume", sous_prefectures: ["Diegonefla","Guepahouo","Oume","Tonla"] },
  ]},
  { region: "Loh-Djiboua", departements: [
    { nom: "Divo", sous_prefectures: ["Chiepo","Didoko","Divo","Hire","Nebo","Ogoudou","Zego"] },
    { nom: "Guitry", sous_prefectures: ["Dairo-Didizo","Guitry","Lauzoua","Yocoboue"] },
    { nom: "Lakota", sous_prefectures: ["Djidji","Gagore","Goudouko","Lakota","Niambezaria","Zikisso"] },
  ]},
  { region: "Belier", departements: [
    { nom: "Didievi", sous_prefectures: ["Bollo","Didievi","Molonou-Ble","Raviart","Tie-N'Diekro"] },
    { nom: "Djekanou", sous_prefectures: ["Bonikro","Djekanou"] },
    { nom: "Tiebissou", sous_prefectures: ["Lomokankro","Molonou","Tiebissou","Yakpabo-Sakassou"] },
    { nom: "Toumodi", sous_prefectures: ["Angoda","Kokoumbo","Kpouebo","Toumodi"] },
  ]},
  { region: "Iffou", departements: [
    { nom: "Daoukro", sous_prefectures: ["Akpassanou","Ananda","Daoukro","Ettrokro","N'Gattakro","Ouelle","Samanza"] },
    { nom: "M'Bahiakro", sous_prefectures: ["Bonguera","Kondossou","M'Bahiakro"] },
    { nom: "Prikro", sous_prefectures: ["Anianou","Famienkro","Koffi-Amonkro","Nafana","Prikro"] },
  ]},
  { region: "N'Zi", departements: [
    { nom: "Bocanda", sous_prefectures: ["Bengassou","Bocanda","Kouadioblekro","N'Zekrezessou"] },
    { nom: "Dimbokro", sous_prefectures: ["Abigui","Diangokro","Dimbokro","Nofou"] },
    { nom: "Kouassi-Kouassikro", sous_prefectures: ["Kouassi-Kouassikro","Mekro"] },
  ]},
  { region: "Agneby-Tiassa", departements: [
    { nom: "Agboville", sous_prefectures: ["Aboude","Ananguie","Agboville","Attobrou","Azaguie","Cechi","Grand-Morie","Guessiguie","Loviguie","Oress-Krobou","Rubino"] },
    { nom: "Sikensi", sous_prefectures: ["Gomon","Sikensi"] },
    { nom: "Taabo", sous_prefectures: ["Pacobo","Taabo"] },
    { nom: "Tiassale", sous_prefectures: ["Gbolouville","Morokro","N'Douci","Tiassale"] },
  ]},
  { region: "Grands-Ponts", departements: [
    { nom: "Dabou", sous_prefectures: ["Dabou","Lopou","Toupah"] },
    { nom: "Grand-Lahou", sous_prefectures: ["Ahouanou","Bacanda","Ebounou","Grand-Lahou","Toukouzou"] },
    { nom: "Jacqueville", sous_prefectures: ["Attoutou","Jacqueville"] },
  ]},
  { region: "La Me", departements: [
    { nom: "Adzope", sous_prefectures: ["Adzope","Agou","Annepe","Assikoi","Becedi-Brignan","Yakasse-Me"] },
    { nom: "Akoupe", sous_prefectures: ["Affery","Akoupe","Becoefin"] },
    { nom: "Alepe", sous_prefectures: ["Aboisso-Comoe","Alepe","Allosso","Danguira","Oghiwapo"] },
    { nom: "Yakasse-Attobrou", sous_prefectures: ["Abongoua","Bieby","Yakasse-Attobrou"] },
  ]},
  { region: "Cavally", departements: [
    { nom: "Blolequin", sous_prefectures: ["Blolequin","Diboke","Doke","Tinhou","Zeaglo"] },
    { nom: "Guiglo", sous_prefectures: ["Bedy-Goazon","Guiglo","Kaade","Nizahon"] },
    { nom: "Tai", sous_prefectures: ["Tai","Zagne"] },
    { nom: "Toulepleu", sous_prefectures: ["Bakoubly","Meo","Nezobly","Pehe","Tiobly","Toulepleu"] },
  ]},
  { region: "Guemon", departements: [
    { nom: "Bangolo", sous_prefectures: ["Bangolo","Beoue-Zibiao","Blenimeouin","Dieuzon","Gohouo-Zagna","Guinglo-Tahouake","Kahin-Zarabaon","Zeo","Zou"] },
    { nom: "Duekoue", sous_prefectures: ["Bagohouo","Duekoue","Gbapleu","Guezon"] },
    { nom: "Facobly", sous_prefectures: ["Facobly","Koua","Semien","Tieny-Seably"] },
    { nom: "Kouibly", sous_prefectures: ["Kouibly","Nidrou","Ouyably-Gnondrou","Totrodrou"] },
  ]},
  { region: "Tonkpi", departements: [
    { nom: "Biankouma", sous_prefectures: ["Biankouma","Blapleu","Gbangbegouine","Gbonne","Gouine","Kpata","Santa"] },
    { nom: "Danane", sous_prefectures: ["Daleu","Danane","Gbon-Houye","Kouan-Houle","Mahapleu","Seileu","Zonneu"] },
    { nom: "Man", sous_prefectures: ["Bogouine","Fagnampleu","Gbangbegouine-Yati","Logouale","Man","Podiagouine","Sandougou-Soba","Sangouine","Yapleu","Zagoue","Ziogouine"] },
    { nom: "Sipilou", sous_prefectures: ["Sipilou","Yorodougou"] },
    { nom: "Zouan-Hounien", sous_prefectures: ["Banneu","Bin-Houye","Goulaleu","Teapleu","Yelleu","Zouan-Hounien"] },
  ]},
  { region: "Haut-Sassandra", departements: [
    { nom: "Daloa", sous_prefectures: ["Bediala","Daloa","Gadouan","Gboghe","Gonate","Zaibo"] },
    { nom: "Issia", sous_prefectures: ["Boguedia","Iboghe","Issia","Nahio","Namane","Saioua","Tapeguia"] },
    { nom: "Vavoua", sous_prefectures: ["Bazra-Nattis","Danano","Dania","Ketro-Bassam","Seitifla","Vavoua"] },
    { nom: "Zoukougbeu", sous_prefectures: ["Domangbeu","Gregbeu","Guessabo","Zoukougbeu"] },
  ]},
  { region: "Marahoue", departements: [
    { nom: "Bouafle", sous_prefectures: ["Begbessou","Bonon","Bouafle","N'Douffoukankro","Pakouabo","Tibeita","Zaguieta"] },
    { nom: "Sinfra", sous_prefectures: ["Bazre","Kononfla","Kouetinfla","Sinfra"] },
    { nom: "Zuenoula", sous_prefectures: ["Gohitafla","Iriefla","Kanzra","Maminigui","Voueboufla","Zanzra","Zuenoula"] },
  ]},
  { region: "Bagoue", departements: [
    { nom: "Boundiali", sous_prefectures: ["Baya","Boundiali","Ganaoni","Kassere","Siempurgo"] },
    { nom: "Kouto", sous_prefectures: ["Blessegue","Gbon","Kolia","Kouto","Sianhala"] },
    { nom: "Tengrela", sous_prefectures: ["Debete","Kanakono","Papara","Tengrela"] },
  ]},
  { region: "Poro", departements: [
    { nom: "Dikodougou", sous_prefectures: ["Boron","Dikodougou","Guiembe"] },
    { nom: "Korhogo", sous_prefectures: ["Dassoungboho","Kanoroba","Karakoro","Kiemou","Kombolokoura","Komborodougou","Koni","Korhogo","Lataha","Nafoun","Napieoleedougou","N'Ganon","Niofoin","Sirasso","Sohouo","Tioroniaradougou"] },
    { nom: "M'Bengue", sous_prefectures: ["Bougou","Katiala","Katogo","M'Bengue"] },
    { nom: "Sinematiali", sous_prefectures: ["Bouakaha","Kagbolodougou","Sediego","Sinematiali"] },
  ]},
  { region: "Tchologo", departements: [
    { nom: "Ferkessedougou", sous_prefectures: ["Ferkessedougou","Koumbala","Togoniere"] },
    { nom: "Kong", sous_prefectures: ["Bilimono","Kong","Nafana","Sikolo"] },
    { nom: "Ouangolodougou", sous_prefectures: ["Diawala","Kaouara","Nielle","Ouangolodougou","Toumoukoro"] },
  ]},
  { region: "Gbeke", departements: [
    { nom: "Beoumi", sous_prefectures: ["Ando-Kekrenou","Beoumi","Bodokro","Kondrobo","Lolobo","Marabadiassa","N'Guessankro"] },
    { nom: "Botro", sous_prefectures: ["Botro","Diabo","Krofoinsou","Languibonou"] },
    { nom: "Bouake", sous_prefectures: ["Bouake","Bounda","Brobo","Djebonoua","Mamini"] },
    { nom: "Sakassou", sous_prefectures: ["Ayaou-Sran","Dibri-Assirikro","Sakassou","Toumodi-Sakassou"] },
  ]},
  { region: "Hambol", departements: [
    { nom: "Dabakala", sous_prefectures: ["Bassawa","Bonieredougou","Dabakala","Foumbolo","Niemene","Satama-Sokoro","Satama-Sokoura","Sokala-Sobara","Tiendene-Bambarasso","Yaossedougou"] },
    { nom: "Katiola", sous_prefectures: ["Fronan","Katiola","Timbe"] },
    { nom: "Niakaramadougou", sous_prefectures: ["Arikokaha","Badikaha","Niakaramadougou","Niediekaha","Tafiere","Tortiya"] },
  ]},
  { region: "Bafing", departements: [
    { nom: "Koro", sous_prefectures: ["Booko","Borotou","Koro","Mahandougou","Niokosso"] },
    { nom: "Ouaninou", sous_prefectures: ["Gbelo","Gouekan","Koonan","Ouaninou","Saboudougou","Santa"] },
    { nom: "Touba", sous_prefectures: ["Dioman","Foungbesso","Guinteguela","Touba"] },
  ]},
  { region: "Bere", departements: [
    { nom: "Dianra", sous_prefectures: ["Dianra","Dianra-Village"] },
    { nom: "Kounahiri", sous_prefectures: ["Kongasso","Kounahiri"] },
    { nom: "Mankono", sous_prefectures: ["Bouandougou","Mankono","Marandalah","Sarhala","Tieningboue"] },
  ]},
  { region: "Worodougou", departements: [
    { nom: "Kani", sous_prefectures: ["Djibrosso","Fadiadougou","Kani","Morondo"] },
    { nom: "Seguela", sous_prefectures: ["Bobo-Diarabana","Dualla","Kamalo","Massala","Seguela","Sifie","Worofla"] },
  ]},
  { region: "Bounkani", departements: [
    { nom: "Bouna", sous_prefectures: ["Bouka","Bouna","Ondefidouo","Youndouo"] },
    { nom: "Doropo", sous_prefectures: ["Danoa","Doropo","Kalamon","Niamoue"] },
    { nom: "Nassian", sous_prefectures: ["Bogofa","Kakpin","Kotouba","Nassian","Sominasse"] },
    { nom: "Tehini", sous_prefectures: ["Gogo","Tehini","Tougbo"] },
  ]},
  { region: "Gontougo", departements: [
    { nom: "Bondoukou", sous_prefectures: ["Appimandou","Pinda-Boroko","Bondo","Bondoukou","Goumere","Laoud-Iba","Sapli-Sepingo","Sorobango","Tabagne","Tagadi","Taoudi","Yezimala"] },
    { nom: "Koun-Fao", sous_prefectures: ["Boahia","Kokomian","Kouassi-Dattekro","Koun-Fao","Tankesse","Tienkoikro"] },
    { nom: "Sandegue", sous_prefectures: ["Bandakagni-Tomora","Dimandougou","Sandegue","Yorobodi"] },
    { nom: "Tanda", sous_prefectures: ["Amanvi","Diamba","Tanda","Tchedio"] },
    { nom: "Transua", sous_prefectures: ["Assuefry","Kouassi-Niaguini","Transua"] },
  ]},
];

export const getRegions = () => CI_ADMIN.map(r => r.region).sort();

export const getDepartements = (region) => {
  const r = CI_ADMIN.find(r => r.region === region);
  return r ? r.departements.map(d => d.nom).sort() : [];
};

export const getSousPrefectures = (region, departement) => {
  const r = CI_ADMIN.find(r => r.region === region);
  if (!r) return [];
  const d = r.departements.find(d => d.nom === departement);
  return d ? d.sous_prefectures.sort() : [];
};

export default CI_ADMIN;
