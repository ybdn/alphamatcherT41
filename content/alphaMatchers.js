console.log("AlphaMatchers script injecté et prêt sur la page :", window.location.href);

// Variables pour suivre l'état du script
let isActive = false;
let currentStepIndex = 0;
let activeIntervals = [];
let messageListeners = [];

// Fonction pour initialiser le script
function initialize() {
  if (isActive) {
    console.warn("⚠️ alphaMatchers.js est déjà actif.");
    return;
  }
  
  console.log("📍 Initialisation d'alphaMatchers.js...");
  
  // Configurer l'écouteur de messages
  const messageHandler = (message, sender, sendResponse) => {
    console.log("📩 Message reçu dans alphaMatchers.js :", message);
    
    if (message.command === "nextStep") {
      executeNextStep(sendResponse);
      return true; // Indique que sendResponse sera utilisé de manière asynchrone
    } 
    else if (message.command === "stopScript" && 
             (message.script === "alphaMatchers" || !message.script)) {
      shutdownScript()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }
    else if (message.command === "startScript" && message.script === "alphaMatchers") {
      activateScript();
      sendResponse({ success: true });
      return true;
    }
  };
  
  browser.runtime.onMessage.addListener(messageHandler);
  messageListeners.push(messageHandler);
  
  // Activer directement le script après l'initialisation
  activateScript();
}

// Fonction pour activer le script
function activateScript() {
  isActive = true;
  currentStepIndex = 0;
  
  console.log("🚀 alphaMatchers.js activé, prêt à exécuter les étapes.");
  
  // Vérification des données immédiate
  if (verifyAlphaNumericData()) {
    console.log("✅ Données alphanumériques conformes.");
  } else {
    console.log("❌ Erreurs dans les données alphanumériques.");
  }
}

// Fonction pour arrêter le script
function shutdownScript() {
  return new Promise((resolve, reject) => {
    try {
      console.log("🛑 Arrêt de alphaMatchers.js en cours...");
      
      // Effacer tous les intervalles et timeouts actifs
      activeIntervals.forEach(intervalId => {
        clearInterval(intervalId);
        clearTimeout(intervalId);
      });
      activeIntervals = [];
      
      // Supprimer les écouteurs de messages
      messageListeners.forEach(listener => {
        browser.runtime.onMessage.removeListener(listener);
      });
      messageListeners = [];
      
      // Réinitialiser l'état
      currentStepIndex = 0;
      isActive = false;
      
      // Notifier le script d'arrière-plan de l'achèvement de l'arrêt
      browser.runtime.sendMessage({ 
        command: "scriptShutdownComplete", 
        script: "alphaMatchers" 
      }).then(() => {
        console.log("✅ alphaMatchers.js a été arrêté avec succès");
        resolve();
      }).catch(error => {
        console.error("⚠️ Erreur lors de la notification d'arrêt:", error);
        reject(error);
      });
    } catch (error) {
      console.error("⚠️ Erreur lors de l'arrêt de alphaMatchers.js:", error);
      reject(error);
    }
  });
}

// Fonction pour afficher une fenêtre d'erreur en dehors du popup
function showErrorWindow(errors) {
    console.log("🔔 Affichage de la fenêtre d'erreur pour les erreurs:", errors);
    const errorMessage = errors.join("\n");

    // Afficher une alerte simple pour le débogage
    alert("Erreurs détectées :\n" + errorMessage);
}

// Fonction pour extraire et valider les données alphanumériques
function verifyAlphaNumericData() {
    console.log("🔍 Début de la vérification des données alphanumériques...");

    try {
        // Sélection sécurisée des champs
        const getValue = (selector) => {
            const element = document.querySelector(selector);
            console.log(`Recherche de l'élément ${selector}: ${element ? "trouvé" : "non trouvé"}`);
            return element?.value?.trim() || "";
        };

        const idpp = getValue("#formValidationCorrection\\:identifiantGaspard");
        const typeSaisie = getValue("#formValidationCorrection\\:typeDeSignalisationValue");
        const nom = getValue("#formValidationCorrection\\:nom");
        const prenom = getValue("#formValidationCorrection\\:prenom");
        const serviceInitiateur = getValue("#formValidationCorrection\\:serviceInitiateur");
        const una = getValue("#formValidationCorrection\\:una");
        const ficheEtabliePar = getValue("#formValidationCorrection\\:ficheEtabliePar");
        const serviceRattachement = getValue("#formValidationCorrection\\:serviceRattachement");

        console.log("Valeurs extraites:", {
            idpp, typeSaisie, nom, prenom, serviceInitiateur, una, ficheEtabliePar, serviceRattachement
        });

        let errors = [];

        // Détection des NEO-TESTS
        if ([idpp, typeSaisie, nom, prenom, serviceInitiateur, una, ficheEtabliePar, serviceRattachement]
            .some(field => field.toUpperCase().includes("NEOTEST") || field.toUpperCase().includes("NEO-TEST"))) {
            errors.push("Présence d'une mention 'NEOTEST' ou 'NEO-TEST' détectée.");
        }

        if (ficheEtabliePar.toUpperCase() === "FRANCK DESMIS") {
            errors.push("Fiche établie par 'FRANCK DESMIS' détectée.");
        }

        // Vérification du Type / Type de saisie
        if (typeSaisie !== "SM") {
            if (!/^\d{5}$/.test(serviceRattachement)) {
                errors.push("Le champ 'Service de rattachement' est obligatoire et doit être un nombre à 5 chiffres.");
            }
        }

        // Vérification de l'IDPP
        if (idpp) {
            if (/CELLULE|DEPARTEMENTALE|DÉPARTEMENTALE/i.test(serviceInitiateur)) {
                errors.push("Le champ 'Service initiateur' ne doit pas contenir 'CELLULE' ou 'DÉPARTEMENTALE'.");
            }
        } else {
            if (!/\d+/.test(serviceInitiateur)) {
                errors.push("Le 'Service initiateur' doit contenir du texte et des chiffres.");
            }
            if (!/^\d{5}\/\d{5}\/\d{4}$/.test(una)) {
                errors.push("Le champ 'UNA' doit être au format : 12345/12345/2024.");
            }
            if (!/^\d{5}$/.test(serviceRattachement)) {
                errors.push("Le champ 'Service de rattachement' est obligatoire et doit être un nombre à 5 chiffres.");
            }
        }

        // Affichage des erreurs
        if (errors.length > 0) {
            console.error("🔴 Erreurs détectées :", errors);
            showErrorWindow(errors);
            return false;
        }

        console.log("✅ Aucune erreur détectée.");
        return true;
    } catch (error) {
        console.error("🔴 Erreur lors de la vérification des données:", error);
        showErrorWindow(["Erreur technique lors de la vérification: " + error.message]);
        return false;
    }
}

// Définition des étapes
const steps = [
    {
        name: "Vérification des données alphanumériques avant validation",
        action: (sendResponse) => {
            if (verifyAlphaNumericData()) {
                console.log("✅ Données alphanumériques conformes.");
                currentStepIndex++;
                sendResponse && sendResponse({ status: "next", step: "Vérification des données alphanumériques terminée" });
            } else {
                console.log("❌ Erreur détectée, arrêt du processus.");
                sendResponse && sendResponse({ status: "error", step: "Erreur lors de la vérification des données alphanumériques" });
            }
        }
    },
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
    // Autres étapes...
];

// Fonction pour exécuter l'étape suivante
function executeNextStep(sendResponse) {
    if (!isActive) {
        console.warn("⚠️ Tentative d'exécution d'une étape alors que alphaMatchers.js n'est pas actif");
        sendResponse && sendResponse({ status: "error", error: "Script inactif" });
        return;
    }

    if (currentStepIndex >= steps.length) {
        console.log("✅ Toutes les étapes ont été exécutées.");
        sendResponse && sendResponse({ status: "done" });
        return;
    }

    const step = steps[currentStepIndex];
    console.log(`🚀 Exécution de l'étape : ${step.name}`);

    try {
        if (step.action) {
            step.action(sendResponse);
        } else if (step.actions) {
            // Exécution séquentielle des actions
            let actionPromises = step.actions.map(action => {
                return new Promise((resolve, reject) => {
                    const element = document.querySelector(action.selector);
                    if (element) {
                        try {
                            action.action(element);
                            console.log(`✅ Action exécutée : ${action.description}`);
                            resolve();
                        } catch (error) {
                            console.error(`❌ Erreur lors de l'exécution de l'action : ${action.description}`, error);
                            reject(error);
                        }
                    } else {
                        console.error(`❌ Élément introuvable : ${action.selector}`);
                        reject(new Error(`Élément introuvable : ${action.selector}`));
                    }
                });
            });

            Promise.all(actionPromises)
                .then(() => {
                    console.log(`✅ Toutes les actions de l'étape "${step.name}" exécutées avec succès.`);
                    currentStepIndex++;
                    sendResponse && sendResponse({ status: "next", step: step.name });
                })
                .catch(error => {
                    console.error(`❌ Erreur lors de l'exécution de l'étape "${step.name}" :`, error);
                    sendResponse && sendResponse({ status: "error", step: step.name, error: error.message });
                });
        } else {
            const element = document.querySelector(step.selector);
            if (element) {
                step.action(element);
                console.log(`✅ Étape "${step.name}" terminée.`);
                currentStepIndex++;
                sendResponse && sendResponse({ status: "next", step: step.name });
            } else {
                console.error(`❌ Élément introuvable pour l'étape "${step.name}" : ${step.selector}`);
                sendResponse && sendResponse({ 
                    status: "error", 
                    step: step.name,
                    error: `Élément introuvable : ${step.selector}`
                });
            }
        }
    } catch (error) {
        console.error(`❌ Erreur inattendue lors de l'exécution de l'étape "${step.name}" :`, error);
        sendResponse && sendResponse({ 
            status: "error", 
            step: step.name,
            error: error.message
        });
    }
}

// Initialiser le script automatiquement
initialize();

// Exporter des fonctions pour les tests
window.alphaMatchers = {
    initialize,
    activateScript,
    shutdownScript,
    executeNextStep,
    verifyAlphaNumericData
};
