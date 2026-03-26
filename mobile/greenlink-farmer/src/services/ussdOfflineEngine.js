/**
 * Moteur USSD Offline — Fonctionne SANS internet
 * Reproduit exactement la logique du backend /api/ussd/carbon-calculator
 * 
 * Utilise pour: agriculteurs, cooperatives, agents terrain
 */

const QUESTIONS = [
  { key: 'hectares', text: 'PRIME CARBONE *144*99#\n\nQuestion 1/12\nSurface plantation (hectares) ?\n\nEx: 3.5', type: 'number' },
  { key: 'arbres_grands', text: 'Question 2/12\nArbres GRANDS (> 12m) ?\n\nEx: 20', type: 'number' },
  { key: 'arbres_moyens', text: 'Question 3/12\nArbres MOYENS (8-12m) ?\n\nEx: 30', type: 'number' },
  { key: 'arbres_petits', text: 'Question 4/12\nArbres PETITS (< 8m) ?\n\nEx: 10', type: 'number' },
  { key: 'culture', text: 'Question 5/12\nCulture principale ?\n\n1. Cacao\n2. Cafe\n3. Anacarde', type: 'choice' },
  { key: 'engrais', text: 'Question 6/12\nEngrais chimiques ?\n\n1. Oui\n2. Non', type: 'yesno' },
  { key: 'brulage', text: 'Question 7/12\nBrulage des residus ?\n\n1. Oui\n2. Non', type: 'yesno' },
  { key: 'compost', text: 'Question 8/12\nCompost organique ?\n\n1. Oui\n2. Non', type: 'yesno' },
  { key: 'agroforesterie', text: 'Question 9/12\nAgroforesterie ?\n\n1. Oui\n2. Non', type: 'yesno' },
  { key: 'biochar', text: 'REDD+ Question 10/12\nBiochar ?\n\n1. Oui\n2. Non', type: 'yesno' },
  { key: 'zero_deforestation', text: 'REDD+ Question 11/12\nEngagement zero deforestation ?\n(Pas d\'extension sur foret)\n\n1. Oui\n2. Non', type: 'yesno' },
  { key: 'reboisement', text: 'REDD+ Question 12/12\nReboisement actif ?\n\n1. Oui\n2. Non', type: 'yesno' },
];

function parseAnswer(question, raw) {
  const val = raw.trim();
  if (question.type === 'number') {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return [null, false];
    return [num, true];
  }
  if (question.type === 'choice') {
    const map = { '1': 'cacao', '2': 'cafe', '3': 'anacarde' };
    if (map[val]) return [map[val], true];
    return [null, false];
  }
  if (question.type === 'yesno') {
    if (val === '1') return ['oui', true];
    if (val === '2') return ['non', true];
    return [null, false];
  }
  return [val, true];
}

function calculateCarbonPremium(answers) {
  const hectares = parseFloat(answers.hectares || 1);
  const arbresGrands = parseInt(answers.arbres_grands || 0);
  const arbresMoyens = parseInt(answers.arbres_moyens || 0);
  const arbresPetits = parseInt(answers.arbres_petits || 0);

  const weightedTrees = (arbresGrands * 1.0) + (arbresMoyens * 0.7) + (arbresPetits * 0.3);
  const arbresParHa = weightedTrees / Math.max(hectares, 0.1);
  const totalTrees = arbresGrands + arbresMoyens + arbresPetits;

  let score = 4.0;
  if (arbresParHa >= 80) score += 2.0;
  else if (arbresParHa >= 50) score += 1.5;
  else if (arbresParHa >= 20) score += 1.0;
  else if (arbresParHa >= 5) score += 0.5;

  const grandsRatio = arbresGrands / Math.max(totalTrees, 1);
  if (grandsRatio >= 0.5) score += 0.5;
  else if (grandsRatio >= 0.3) score += 0.3;

  if (answers.engrais === 'oui') score -= 0.5;
  else score += 0.5;

  if (answers.brulage === 'oui') score -= 1.5;
  else score += 0.5;

  if (answers.compost === 'oui') score += 1.0;
  if (answers.agroforesterie === 'oui') score += 1.0;

  // REDD+ bonus
  if (answers.biochar === 'oui') score += 0.3;
  if (answers.zero_deforestation === 'oui') score += 0.3;
  if (answers.reboisement === 'oui') score += 0.4;

  // Age des cacaoyers — defaut "mature" comme le backend
  const age = answers.age_cacaoyers || 'mature';
  if (age === 'mature') score += 0.5;
  else if (age === 'vieux') score += 0.3;

  score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  const scoreRatio = score / 10.0;

  const prixRseTonne = 18000;
  const co2PerHa = 2 + scoreRatio * 6;
  const primeParHa = prixRseTonne * co2PerHa * 0.49;
  const primeAnnuelle = primeParHa * hectares;

  const culture = answers.culture || 'cacao';
  const rendements = { cacao: 700, cafe: 500, anacarde: 400 };
  const rendementKgHa = rendements[culture] || 600;
  const primeFcfaKg = primeParHa / Math.max(rendementKgHa, 1);

  const arsResult = calculateArsLevel(answers, hectares, arbresGrands, totalTrees);

  // REDD+ score calculation
  let reddScore = 0;
  const reddPractices = [];
  if (answers.agroforesterie === 'oui') { reddScore += 1.5; reddPractices.push('Agroforesterie'); }
  if (answers.compost === 'oui') { reddScore += 1.0; reddPractices.push('Compost'); }
  if (answers.brulage === 'non') { reddScore += 1.0; reddPractices.push('Zero brulage'); }
  if (answers.engrais === 'non') { reddScore += 0.5; reddPractices.push('Zero engrais'); }
  if (answers.biochar === 'oui') { reddScore += 0.5; reddPractices.push('Biochar'); }
  if (answers.zero_deforestation === 'oui') { reddScore += 1.0; reddPractices.push('Zero deforestation'); }
  if (answers.reboisement === 'oui') { reddScore += 0.5; reddPractices.push('Reboisement'); }
  if (arbresParHa >= 60) reddScore += 1.5;
  else if (arbresParHa >= 30) reddScore += 1.0;
  else if (arbresParHa >= 15) reddScore += 0.5;
  reddScore = Math.min(Math.round(reddScore * 10) / 10, 10);
  let reddLevel = 'Non conforme';
  if (reddScore >= 8) reddLevel = 'Excellence';
  else if (reddScore >= 6) reddLevel = 'Avance';
  else if (reddScore >= 4) reddLevel = 'Intermediaire';
  else if (reddScore >= 2) reddLevel = 'Debutant';

  return {
    score: Math.round(score * 10) / 10,
    prime_fcfa_kg: Math.round(primeFcfaKg),
    arbres_par_ha: Math.round(arbresParHa),
    arbres_grands: arbresGrands,
    arbres_moyens: arbresMoyens,
    arbres_petits: arbresPetits,
    total_arbres: totalTrees,
    prime_annuelle: Math.round(primeAnnuelle),
    eligible: score >= 5.0,
    hectares,
    culture,
    rendement_kg_ha: rendementKgHa,
    co2_par_ha: Math.round(co2PerHa * 10) / 10,
    ars_level: arsResult.level,
    ars_pct: arsResult.pct,
    ars_conseil: arsResult.conseil,
    redd_score: reddScore,
    redd_level: reddLevel,
    redd_practices: reddPractices,
  };
}

function calculateArsLevel(answers, hectares, arbresGrands, arbresTotal) {
  // ARS utilise le nombre TOTAL d'arbres (non pondere), comme le backend
  const arbresParHa = arbresTotal / Math.max(hectares, 0.1);
  const arbresGrandsParHa = arbresGrands / Math.max(hectares, 0.1);
  let pct = 0;

  // Agroforesterie (35 pts)
  if (arbresParHa >= 60) pct += 35;
  else if (arbresParHa >= 40) pct += 25;
  else if (arbresParHa >= 20) pct += 15;
  else if (arbresParHa >= 10) pct += 8;

  // Grands arbres (15 pts)
  if (arbresGrandsParHa >= 30) pct += 15;
  else if (arbresGrandsParHa >= 15) pct += 10;
  else if (arbresGrandsParHa >= 5) pct += 5;

  // Pas de brulage (20 pts)
  if (answers.brulage === 'non') pct += 20;

  // Engrais (10 pts)
  if (answers.engrais === 'non') pct += 10;
  else if (answers.engrais === 'oui') pct += 5;

  // Pratiques complementaires (20 pts)
  if (answers.compost === 'oui') pct += 7;
  if (answers.agroforesterie === 'oui') pct += 7;
  // couverture_sol pas dans les questions USSD -> +6 si present
  
  pct = Math.min(pct, 100);

  let level, conseil;
  if (pct >= 80) {
    level = 'Or';
    conseil = 'Felicitations ! Vous etes au niveau Or ARS 1000.';
  } else if (pct >= 55) {
    level = 'Argent';
    const arbresManquants = Math.max(0, Math.floor((40 - arbresParHa) * Math.max(hectares, 1)));
    if (arbresManquants > 0) {
      conseil = `Plantez ${arbresManquants} arbres supplementaires pour viser le niveau Or.`;
    } else {
      conseil = 'Arretez le brulage et utilisez le compost pour atteindre le niveau Or.';
    }
  } else if (pct >= 30) {
    level = 'Bronze';
    conseil = "Plantez plus d'arbres ombres et arretez le brulage pour passer au niveau Argent.";
  } else {
    level = 'Non conforme';
    conseil = "Commencez par planter au moins 20 arbres/ha et arreter le brulage.";
  }

  return { level, pct, conseil };
}

/**
 * Traite une requete USSD de maniere stateless (identique au backend)
 * @param {string} textInput - Texte accumule (ex: "3.5*20*30*10")
 * @returns {object} Reponse USSD
 */
export function processUSSD(textInput = '') {
  const inputs = textInput ? textInput.split('*').filter(s => s !== '') : [];
  const numAnswers = inputs.length;

  // Premiere question
  if (numAnswers === 0) {
    return {
      text: QUESTIONS[0].text,
      continue_session: true,
      step: 1,
      total_steps: QUESTIONS.length,
    };
  }

  // Parser les reponses
  const answers = {};
  for (let i = 0; i < inputs.length && i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    const [value, valid] = parseAnswer(q, inputs[i]);
    if (!valid) {
      return {
        text: `Reponse invalide.\n\n${q.text}`,
        continue_session: true,
        step: i + 1,
        total_steps: QUESTIONS.length,
      };
    }
    answers[q.key] = value;
  }

  // Question suivante
  if (numAnswers < QUESTIONS.length) {
    const nextQ = QUESTIONS[numAnswers];
    return {
      text: nextQ.text,
      continue_session: true,
      step: numAnswers + 1,
      total_steps: QUESTIONS.length,
    };
  }

  // Toutes les reponses -> calcul
  const result = calculateCarbonPremium(answers);

  let resultText;
  if (result.eligible) {
    resultText = (
      `PRIME CARBONE + ARS 1000\n\n` +
      `Score: ${result.score}/10\n` +
      `Arbres/ha: ${result.arbres_par_ha}\n` +
      `CO2: ${result.co2_par_ha}t/ha\n\n` +
      `Prime estimee:\n` +
      `${result.prime_annuelle.toLocaleString('fr-FR')} FCFA/an\n` +
      `(${result.prime_fcfa_kg} FCFA/kg)\n\n` +
      `Niveau ARS: ${result.ars_level} (${result.ars_pct}%)\n` +
      `${result.ars_conseil}\n\n` +
      `Inscrivez-vous sur GreenLink\n` +
      `Tel: 07 87 76 10 23`
    );
  } else {
    resultText = (
      `ESTIMATION + ARS 1000\n\n` +
      `Score: ${result.score}/10\n` +
      `(Minimum requis: 5/10)\n\n` +
      `Niveau ARS: ${result.ars_level} (${result.ars_pct}%)\n` +
      `${result.ars_conseil}\n\n` +
      `Ameliorez votre score:\n` +
      `- Plus d'arbres d'ombrage\n` +
      `- Arretez le brulage\n` +
      `- Compost organique\n\n` +
      `Tel: 07 87 76 10 23`
    );
  }

  return {
    text: resultText,
    continue_session: false,
    step: QUESTIONS.length + 1,
    total_steps: QUESTIONS.length,
    result,
  };
}

export { QUESTIONS, calculateCarbonPremium, calculateArsLevel };

// ==============================
// SSRTE Offline Engine
// ==============================
const SSRTE_QUESTIONS = [
  {
    key: 'enfants_scolaires',
    text: 'SSRTE - Lutte contre le travail des enfants (ICI)\n\nQuestion 1/2\nAvez-vous des enfants en age scolaire sur votre parcelle ?\n\n1. Oui\n2. Non\n\n0. Retour',
    type: 'yesno',
  },
  {
    key: 'scolarises',
    text: 'SSRTE - Question 2/2\n\nSont-ils scolarises ?\n\n1. Oui\n2. Non\n\n0. Retour',
    type: 'yesno',
  },
];

/**
 * Traite le flux SSRTE offline
 * @param {string} textInput - Texte accumule
 * @returns {object} Reponse SSRTE
 */
export function processSSRTE(textInput = '') {
  const inputs = textInput ? textInput.split('*').filter(s => s !== '') : [];
  const numAnswers = inputs.length;

  if (numAnswers === 0) {
    return {
      text: SSRTE_QUESTIONS[0].text,
      continue_session: true,
      step: 1,
      total_steps: 2,
    };
  }

  // Q1: Enfants en age scolaire?
  const q1 = inputs[0];
  if (q1 === '0') {
    return { text: 'RETOUR', continue_session: false, step: 0, goBack: true };
  }
  if (q1 !== '1' && q1 !== '2') {
    return {
      text: 'Reponse invalide.\n\n' + SSRTE_QUESTIONS[0].text,
      continue_session: true,
      step: 1,
      total_steps: 2,
    };
  }

  const hasChildren = q1 === '1';

  // Si "Non" -> conforme, fin
  if (!hasChildren) {
    return {
      text: 'Merci pour votre reponse.\n\nAucune action SSRTE requise.\n\n0. Retour au menu',
      continue_session: false,
      step: 3,
      total_steps: 2,
      ssrteResult: { enfants_age_scolaire: false, scolarises: null, statut: 'conforme' },
    };
  }

  // Q2: Scolarises?
  if (numAnswers === 1) {
    return {
      text: SSRTE_QUESTIONS[1].text,
      continue_session: true,
      step: 2,
      total_steps: 2,
    };
  }

  const q2 = inputs[1];
  if (q2 === '0') {
    return {
      text: SSRTE_QUESTIONS[0].text,
      continue_session: true,
      step: 1,
      total_steps: 2,
    };
  }
  if (q2 !== '1' && q2 !== '2') {
    return {
      text: 'Reponse invalide.\n\n' + SSRTE_QUESTIONS[1].text,
      continue_session: true,
      step: 2,
      total_steps: 2,
    };
  }

  const isSchooled = q2 === '1';

  if (isSchooled) {
    return {
      text: 'Merci pour votre reponse.\n\nSituation conforme.\nContinuez a soutenir la scolarite\nde vos enfants.\n\n0. Retour au menu',
      continue_session: false,
      step: 3,
      total_steps: 2,
      ssrteResult: { enfants_age_scolaire: true, scolarises: true, statut: 'conforme' },
    };
  }

  return {
    text: 'Merci pour votre reponse.\n\nNous vous mettons en relation\navec votre cooperative pour un\naccompagnement SSRTE de l\'ICI.\n\nVotre cooperative sera informee.\n\n0. Retour au menu',
    continue_session: false,
    step: 3,
    total_steps: 2,
    ssrteResult: { enfants_age_scolaire: true, scolarises: false, statut: 'alerte_ici' },
  };
}

