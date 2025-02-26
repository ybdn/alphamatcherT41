# Fonction Matchers alphanumériques

## Objectif : 
Créer une fonction qui s'intègre dans le code de contentScript.js. qui vérifie la conformité des données alphanumériques des signalisations. Elle s'exécute dans l'étape 1, elle constitue la toute première étape du processus.

## Fonctionnalités 

### Etape 1 : Extraire le contenu des champs de la fiche

Il faut extraire les éléments suivants :
- **IDPP** ou **Identifiant GASPARD** : Format structuré (exemple : “GN-00014311009342024-ARI-PPM-28949”);
- **Type / Type de saisie** : Champ fixe (exemple: SN, SS, SSG);
- **Nom** : Champ texte;
- **Prénom(s)** : Champ texte;
- **Service initiateur** : TEXTE ET NOMBRE;
- **UNA** : format : Champ formaté (exemples: 12345/12345/2024, 43583/00123/2025);
- **Fiche établie par** : Champ texte;
- **Service de rattachement et d'investigation/Terminal de saisie** : Champ numérique (exemples : 12345, 04392, 010293);

### Étape 2 : Effectuer les vérifications

#### Etape 2.1 : Détection des NEO-TESTS
  Vérifier dans tous les champs s'il est mentionné quelque part 'NEOTEST' ou 'NEO-TEST'
  Vérifier si **Fiche établie par** contient 'FRANCK DESMIS'

#### Etape 2.2 : Vérification du **Type / Type de saisie**

  Si le **Type / Type de saisie** = SM : 
    Ne rien faire.

  Si le **Type / Type de saisie** =/= SM :
    **Service de rattachement et d'investigation/Terminal de saisie** est obligatoire et au bon format.

#### Etape 2.3 : Vérifier si **IDPP** est renseigné
  
  Si **IDPP** est renseigné :
    Vérifier **Service initiateur**, IL NE DOIS PAS INCLURE 'CELLULE' ou 'DEPARTEMENTALE' ou 'DÉPARTEMENTALE').

  Si **IDPP** n'est pas renseigné :
    Vérifier la conformité de :
    - **Service initiateur** : TEXTE ET NOMBRE;
    - **UNA** : format : Champ formaté (exemples: 12345/12345/2024, 43583/00123/2025);
    - **Service de rattachement et d'investigation/Terminal de saisie** : Champ numérique (exemples : 12345, 04392, 010293);


### Étape 3 : Surligner les erreurs détectées.

  Si une erreur a été détectée, selectionner les erreurs et interrompre le script.

## Contenu actuel de contentScript.js

console.log("Content script injecté et prêt sur la page :", window.location.href);

// Variables pour suivre l'état des étapes
let currentStepIndex = 0;

// Définition des étapes
const steps = [
  {
    name: "Cocher 'Non' dans la page alpha numérique, puis cliquer sur l'onglet Portraits",
    actions: [
      {
        description: "Cocher 'Non'",
        selector: "label[for='formValidationCorrection:decisionValidationAlphaPortraits:1']",
        action: (element) => element.click(),
      },
      {
        description: "Cliquer sur l'onglet Portraits",
        selector: "a[href='#formValidationCorrection:tabViewValidationFiche:tab1']",
        action: (element) => element.click(),
      },
    ],
  },
  {
    name: "Cliquer sur l'onglet Empreintes (doigts)",
    selector: "a[href='#formValidationCorrection:tabViewValidationFiche:tab2']",
    action: (element) => element.click(),
  },
  {
    name: "Cliquer sur l'onglet Empreintes (paumes)",
    selector: "a[href='#formValidationCorrection:tabViewValidationFiche:tab3']",
    action: (element) => element.click(),
  },
  {
    name: "Cocher 'Non' dans la page paume et cliquer sur 'Terminer'",
    actions: [
      {
        description: "Cocher 'Non' dans la page paume",
        selector: "label[for='formValidationCorrection:decisionsErreursEmpreintes:1']",
        action: (element) => element.click(),
      },
      {
        description: "Cliquer sur 'Terminer'",
        selector: "#formValidationCorrection\\:terminerControleBoutton",
        action: (element) => element.click(),
      },
    ],
  },
  {
    name: "Cliquer sur 'OK et suivant' ou 'OK'",
    selector: "#formValidationCorrection\\:okSuivantValidationFicheSignalisation",
    fallbackSelector: "#formValidationCorrection\\:terminerValidationFicheSignalisation",
    action: (element, fallbackElement) => {
      if (element && !element.disabled && element.getAttribute('aria-disabled') !== 'true') {
        console.log("Bouton 'OK et suivant' activé trouvé, clic en cours...");
        element.click();
      } else if (fallbackElement) {
        console.log("Bouton 'OK et suivant' désactivé. Bouton 'OK' trouvé, clic en cours...");
        fallbackElement.click();
      } else {
        console.error("Aucun des boutons 'OK et suivant' ou 'OK' n'est disponible.");
      }
    },
  },
];

// Fonction pour attendre un élément ou un fallback
function waitForElementOrFallback(selector, fallbackSelector, callback, timeout = 5000) {
  const startTime = Date.now();
  const interval = setInterval(() => {
    const element = document.querySelector(selector);
    const fallbackElement = fallbackSelector ? document.querySelector(fallbackSelector) : null;

    if ((element && !element.disabled && element.getAttribute('aria-disabled') !== 'true') || fallbackElement) {
      clearInterval(interval);
      callback(element, fallbackElement);
    } else if (Date.now() - startTime > timeout) {
      clearInterval(interval);
      console.error(`Aucun élément trouvé pour les sélecteurs : ${selector}, ${fallbackSelector}`);
    }
  }, 100);
}

// Fonction pour attendre un élément
function waitForElement(selector, callback, timeout = 5000) {
  const startTime = Date.now();
  const interval = setInterval(() => {
    const element = document.querySelector(selector);
    if (element) {
      clearInterval(interval);
      callback(element);
    } else if (Date.now() - startTime > timeout) {
      clearInterval(interval);
      console.error(`Élément introuvable : ${selector}`);
    }
  }, 100);
}

// Fonction pour exécuter les étapes contenant plusieurs actions
function executeMultipleActions(actions, sendResponse, actionIndex = 0) {
  if (actionIndex >= actions.length) {
    console.log("Toutes les actions de l'étape ont été exécutées.");
    currentStepIndex++;
    sendResponse({ status: "next", step: "Actions terminées" });
    return;
  }

  const action = actions[actionIndex];
  console.log(`Exécution de l'action : ${action.description}`);

  waitForElement(action.selector, (element) => {
    try {
      action.action(element);
      console.log(`Action terminée : ${action.description}`);
      executeMultipleActions(actions, sendResponse, actionIndex + 1); // Passer à l'action suivante
    } catch (error) {
      console.error(`Erreur lors de l'exécution de l'action : ${action.description}`, error);
      sendResponse({ status: "error", step: action.description });
    }
  });
}

// Fonction pour exécuter une étape
function executeNextStep(sendResponse) {
  if (currentStepIndex >= steps.length) {
    console.log("Toutes les étapes ont été exécutées.");
    sendResponse({ status: "done" });
    return;
  }

  const step = steps[currentStepIndex];
  console.log(`Exécution de l'étape : ${step.name}`);

  if (step.actions) {
    // Étape avec plusieurs actions
    executeMultipleActions(step.actions, sendResponse);
  } else if (step.fallbackSelector) {
    // Étape avec fallback
    waitForElementOrFallback(step.selector, step.fallbackSelector, (element, fallbackElement) => {
      try {
        step.action(element, fallbackElement);
        console.log(`Étape terminée : ${step.name}`);
        currentStepIndex++;
        sendResponse({ status: "next", step: step.name });
      } catch (error) {
        console.error(`Erreur lors de l'exécution de l'étape : ${step.name}`, error);
        sendResponse({ status: "error", step: step.name });
      }
    });
  } else {
    // Étape classique
    waitForElement(step.selector, (element) => {
      try {
        step.action(element);
        console.log(`Étape terminée : ${step.name}`);
        currentStepIndex++;
        sendResponse({ status: "next", step: step.name });
      } catch (error) {
        console.error(`Erreur lors de l'exécution de l'étape : ${step.name}`, error);
        sendResponse({ status: "error", step: step.name });
      }
    });
  }
}

// Écouter les messages du popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message reçu dans contentScript.js :", message);

  if (message.command === "nextStep") {
    executeNextStep(sendResponse);
    return true; // Indique que sendResponse sera utilisé de manière asynchrone
  }
});

