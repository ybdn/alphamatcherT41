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
    try {
      const element = document.querySelector(selector);
      const fallbackElement = fallbackSelector ? document.querySelector(fallbackSelector) : null;

      if ((element && !element.disabled && element.getAttribute('aria-disabled') !== 'true') || fallbackElement) {
        clearInterval(interval);
        callback(element, fallbackElement);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        console.error(`Aucun élément trouvé pour les sélecteurs : ${selector}, ${fallbackSelector}`);
      }
    } catch (error) {
      clearInterval(interval);
      console.error("Erreur dans waitForElementOrFallback :", error);
    }
  }, 100);
}

// Fonction pour attendre un élément
function waitForElement(selector, callback, timeout = 5000) {
  const startTime = Date.now();
  const interval = setInterval(() => {
    try {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        callback(element);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        console.error(`Élément introuvable : ${selector}`);
      }
    } catch (error) {
      clearInterval(interval);
      console.error("Erreur dans waitForElement :", error);
    }
  }, 100);
}

// Fonction pour exécuter les étapes contenant plusieurs actions
function executeMultipleActions(actions, sendResponse, actionIndex = 0) {
  if (actionIndex >= actions.length) {
    console.log("Toutes les actions de l'étape ont été exécutées.");
    currentStepIndex++;
    sendResponse && sendResponse({ status: "next", step: "Actions terminées" });
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
      sendResponse && sendResponse({ status: "error", step: action.description });
    }
  });
}

// Fonction pour exécuter une étape
function executeNextStep(sendResponse) {
  if (currentStepIndex >= steps.length) {
    console.log("Toutes les étapes ont été exécutées.");
    sendResponse && sendResponse({ status: "done" });
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
        sendResponse && sendResponse({ status: "next", step: step.name });
      } catch (error) {
        console.error(`Erreur lors de l'exécution de l'étape : ${step.name}`, error);
        sendResponse && sendResponse({ status: "error", step: step.name });
      }
    });
  } else {
    // Étape classique
    waitForElement(step.selector, (element) => {
      try {
        step.action(element);
        console.log(`Étape terminée : ${step.name}`);
        currentStepIndex++;
        sendResponse && sendResponse({ status: "next", step: step.name });
      } catch (error) {
        console.error(`Erreur lors de l'exécution de l'étape : ${step.name}`, error);
        sendResponse && sendResponse({ status: "error", step: step.name });
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
