// ===== background/backgroundScript.js =====

console.log("Le script d'arrière-plan est chargé avec succès.");

// Variable pour suivre le script actif
let activeScript = null;

// Initialiser l'état au démarrage
browser.storage.local.set({
  activeScript: null,
  lastUpdate: Date.now()
}).then(() => {
  console.log("État initial défini : aucun script actif");
});

// Gérer les demandes d'activation de script
function activateScript(scriptName, tabId) {
  console.log(`Demande d'activation pour ${scriptName}`);
  
  return browser.storage.local.get('activeScript')
    .then((data) => {
      const currentActiveScript = data.activeScript;
      
      if (currentActiveScript && currentActiveScript !== scriptName) {
        // Si un script différent est actif, l'arrêter d'abord
        console.log(`Arrêt de ${currentActiveScript} avant d'activer ${scriptName}`);
        return stopScript(currentActiveScript, tabId)
          .then(() => setActiveScript(scriptName));
      } else {
        // Si aucun script n'est actif ou si le même script est déjà actif
        return setActiveScript(scriptName);
      }
    });
}

// Définir le script actif dans le stockage
function setActiveScript(scriptName) {
  return browser.storage.local.set({
    activeScript: scriptName,
    lastUpdate: Date.now()
  }).then(() => {
    activeScript = scriptName;
    console.log(`Script actif défini sur ${scriptName}`);
    return { success: true, activeScript: scriptName };
  });
}

// Arrêter un script en cours
function stopScript(scriptName, tabId) {
  console.log(`Tentative d'arrêt de ${scriptName}...`);
  
  return new Promise((resolve) => {
    // Envoyer la commande d'arrêt au content script
    browser.tabs.sendMessage(tabId, { 
      command: "stopScript", 
      script: scriptName 
    }).then(() => {
      console.log(`Commande d'arrêt envoyée à ${scriptName}`);
      
      // Définir un délai pour s'assurer que le processus continue même si aucune confirmation n'est reçue
      const timeoutId = setTimeout(() => {
        console.warn(`Aucune confirmation d'arrêt reçue de ${scriptName}. Continuation forcée.`);
        resolve({ success: true, stopped: scriptName, timeout: true });
      }, 1000);
      
      // Écouter la confirmation d'arrêt
      function shutdownListener(message) {
        if (message.command === "scriptShutdownComplete" && message.script === scriptName) {
          console.log(`Confirmation d'arrêt reçue de ${scriptName}`);
          browser.runtime.onMessage.removeListener(shutdownListener);
          clearTimeout(timeoutId);
          resolve({ success: true, stopped: scriptName });
        }
      }
      
      browser.runtime.onMessage.addListener(shutdownListener);
    }).catch((error) => {
      console.error(`Erreur lors de l'envoi de la commande d'arrêt à ${scriptName}:`, error);
      resolve({ success: false, error: error.message });
    });
  });
}

// Écouteur pour les messages des content scripts et du popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message reçu :", message);
  
  if (message.command === "activateScript") {
    // Gérer la demande d'activation de script
    if (sender.tab && sender.tab.id) {
      activateScript(message.script, sender.tab.id)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Indique que sendResponse sera utilisé de manière asynchrone
    }
  } 
  else if (message.command === "getActiveScript") {
    // Renvoyer le script actuellement actif
    browser.storage.local.get('activeScript')
      .then(data => sendResponse({ success: true, activeScript: data.activeScript }));
    return true;
  }
  else if (message.command === "scriptShutdownComplete") {
    // Journaliser l'arrêt du script
    console.log(`Script ${message.script} a été arrêté avec succès`);
    
    if (activeScript === message.script) {
      activeScript = null;
      browser.storage.local.set({
        activeScript: null,
        lastUpdate: Date.now()
      });
    }
    
    sendResponse({ success: true });
    return true;
  }
  else if (message.type === "FAED_ACTION") {
    console.log("Action FAED détectée :", message.payload);
    sendResponse({ status: "Action reçue en arrière-plan." });
  }
});

// Gérer le clic sur l'icône - utiliser pour injecter alphaMatchers.js
browser.action.onClicked.addListener(async (tab) => {
  console.log("L'icône de l'extension a été cliquée. Activation de alphaMatchers.js...");
  
  if (tab && tab.id) {
    // Activer le script alphaMatchers
    activateScript("alphaMatchers", tab.id)
      .then(() => {
        // Maintenant injecter ou déclencher le script
        return browser.tabs.sendMessage(tab.id, { 
          command: "startScript", 
          script: "alphaMatchers" 
        });
      })
      .then(() => {
        console.log("alphaMatchers.js activé avec succès");
      })
      .catch(error => {
        console.error("Erreur lors de l'activation de alphaMatchers.js:", error);
      });
  }
});


// ===== content/alphaMatchers.js =====

console.log("✅ AlphaMatchers script injecté et prêt sur la page :", window.location.href);

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
  
  // Vérifier si un autre script est actif
  browser.runtime.sendMessage({ command: "getActiveScript" })
    .then(response => {
      if (response.success) {
        if (response.activeScript && response.activeScript !== "alphaMatchers") {
          console.log(`Un autre script (${response.activeScript}) est actif. Demande d'activation en cours...`);
        }
        
        // Demander l'activation
        return browser.runtime.sendMessage({ 
          command: "activateScript", 
          script: "alphaMatchers" 
        });
      }
    })
    .then(response => {
      if (response && response.success) {
        activateScript();
      } else {
        console.error("⚠️ Impossible d'activer alphaMatchers.js:", response);
      }
    })
    .catch(error => {
      console.error("⚠️ Erreur lors de l'initialisation de alphaMatchers.js:", error);
    });
}

// Fonction pour activer le script
function activateScript() {
  isActive = true;
  currentStepIndex = 0;
  
  console.log("🚀 alphaMatchers.js activé.");
  
  // Configurer l'écouteur de messages
  const messageHandler = (message, sender, sendResponse) => {
    if (!isActive && message.command !== "startScript" && message.command !== "stopScript") {
      console.log("⚠️ Message reçu mais alphaMatchers.js n'est pas actif");
      return;
    }
    
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

// Fonction pour attendre un élément avec gestion de nettoyage
function waitForElement(selector, callback, timeout = 5000) {
  const startTime = Date.now();
  const intervalId = setInterval(() => {
    if (!isActive) {
      clearInterval(intervalId);
      console.log(`⚠️ Interruption de waitForElement(${selector}) car le script n'est plus actif`);
      return;
    }
    
    try {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(intervalId);
        activeIntervals = activeIntervals.filter(id => id !== intervalId);
        callback(element);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(intervalId);
        activeIntervals = activeIntervals.filter(id => id !== intervalId);
        console.error(`⚠️ Élément introuvable : ${selector}`);
      }
    } catch (error) {
      clearInterval(intervalId);
      activeIntervals = activeIntervals.filter(id => id !== intervalId);
      console.error("⚠️ Erreur dans waitForElement :", error);
    }
  }, 100);
  
  activeIntervals.push(intervalId);
  return intervalId;
}

// Fonction pour extraire et valider les données alphanumériques
function verifyAlphaNumericData() {
    console.log("🔍 Début de la vérification des données alphanumériques...");

    // Le reste de la fonction reste identique...
    // ...
}

// Définition des étapes
const steps = [
    // Les étapes restent identiques...
    // ...
];

// Fonction pour exécuter l'étape suivante
function executeNextStep(sendResponse) {
  if (!isActive) {
    console.warn("⚠️ Tentative d'exécution d'une étape alors que alphaMatchers.js n'est pas actif");
    sendResponse && sendResponse({ status: "error", error: "Script inactif" });
    return;
  }
  
  // Le reste de la fonction reste identique...
  // ...
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


// ===== content/contentScript.js =====

console.log("✅ Content script injecté et prêt sur la page :", window.location.href);

// Variables pour suivre l'état du script
let isActive = false;
let currentStepIndex = 0;
let activeIntervals = [];
let messageListeners = [];

// Fonction pour initialiser le script
function initialize() {
  if (isActive) {
    console.warn("⚠️ contentScript.js est déjà actif.");
    return;
  }
  
  // Vérifier d'abord si un autre script est actif
  browser.runtime.sendMessage({ command: "getActiveScript" })
    .then(response => {
      if (response.success) {
        if (response.activeScript && response.activeScript !== "contentScript") {
          console.log(`Un autre script (${response.activeScript}) est actif. Demande d'activation en cours...`);
        }
        
        // Demander l'activation
        return browser.runtime.sendMessage({ 
          command: "activateScript", 
          script: "contentScript" 
        });
      }
    })
    .then(response => {
      if (response && response.success) {
        activateScript();
      } else {
        console.error("⚠️ Impossible d'activer contentScript.js:", response);
      }
    })
    .catch(error => {
      console.error("⚠️ Erreur lors de l'initialisation de contentScript.js:", error);
    });
}

// Fonction pour activer le script
function activateScript() {
  isActive = true;
  currentStepIndex = 0;
  
  console.log("🚀 contentScript.js activé.");
  
  // Configurer l'écouteur de messages
  const messageHandler = (message, sender, sendResponse) => {
    if (!isActive && message.command !== "startScript" && message.command !== "stopScript") {
      console.log("⚠️ Message reçu mais contentScript.js n'est pas actif");
      return;
    }
    
    console.log("📩 Message reçu dans contentScript.js :", message);
    
    if (message.command === "nextStep") {
      executeNextStep(sendResponse);
      return true; // Indique que sendResponse sera utilisé de manière asynchrone
    } 
    else if (message.command === "stopScript" && 
            (message.script === "contentScript" || !message.script)) {
      shutdownScript()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }
    else if (message.command === "startScript" && message.script === "contentScript") {
      activateScript();
      sendResponse({ success: true });
      return true;
    }
  };
  
  browser.runtime.onMessage.addListener(messageHandler);
  messageListeners.push(messageHandler);
}

// Fonction pour arrêter le script
function shutdownScript() {
  return new Promise((resolve, reject) => {
    try {
      console.log("🛑 Arrêt de contentScript.js en cours...");
      
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
        script: "contentScript" 
      }).then(() => {
        console.log("✅ contentScript.js a été arrêté avec succès");
        resolve();
      }).catch(error => {
        console.error("⚠️ Erreur lors de la notification d'arrêt:", error);
        reject(error);
      });
    } catch (error) {
      console.error("⚠️ Erreur lors de l'arrêt de contentScript.js:", error);
      reject(error);
    }
  });
}

// Les fonctions waitForElement, waitForElementOrFallback, executeMultipleActions, executeNextStep
// restent essentiellement les mêmes, mais avec des vérifications isActive ajoutées...

// Initialiser le script automatiquement
initialize();

// Exporter des fonctions pour les tests
window.contentScript = {
  initialize,
  activateScript,
  shutdownScript,
  executeNextStep
};


// ===== popup/popup.js =====

document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup chargé !");

  const nextActionButton = document.getElementById("next-action");
  const iconTrigger = document.getElementById("icon-trigger");

  // Obtenir le statut du script actif
  function getActiveScript() {
    return browser.runtime.sendMessage({ command: "getActiveScript" })
      .then(response => {
        if (response.success) {
          console.log(`Script actif actuel : ${response.activeScript || "aucun"}`);
          return response.activeScript;
        }
        throw new Error("Impossible de récupérer le statut du script actif");
      });
  }

  // Fonction pour obtenir l'onglet actif
  async function getActiveTab() {
    try {
      let tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0 && tabs[0].id) {
        return tabs[0];
      } else {
        console.error("Aucun onglet actif trouvé.");
        return null;
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des onglets :", error);
      return null;
    }
  }

  // Fonction pour mettre à jour l'interface utilisateur en fonction du script actif
  function updateUI(activeScript) {
    if (nextActionButton) {
      if (activeScript === "contentScript") {
        nextActionButton.textContent = "Suivant";
      } else if (activeScript === "alphaMatchers") {
        nextActionButton.textContent = "Suivant (AlphaMatchers)";
      } else {
        nextActionButton.textContent = "Lancer";
      }
    }
  }

  // Vérifier le script actif à l'ouverture du popup
  getActiveScript().then(updateUI).catch(console.error);

  // Fonction pour gérer l'exécution de contentScript.js (bouton Lancer)
  if (nextActionButton) {
    nextActionButton.addEventListener("click", async () => {
      console.log("Bouton 'Suivant/Lancer' cliqué.");
      let tab = await getActiveTab();
      if (!tab) return;

      try {
        // Vérifier quel script est actif
        const activeScript = await getActiveScript();
        
        // Si aucun script n'est actif ou si contentScript n'est pas actif, l'activer
        if (!activeScript || activeScript !== "contentScript") {
          await browser.runtime.sendMessage({ 
            command: "activateScript", 
            script: "contentScript" 
          });
          
          // Démarrer le script
          await browser.tabs.sendMessage(tab.id, {
            command: "startScript",
            script: "contentScript"
          });
          
          updateUI("contentScript");
        }
        
        // Envoyer la commande nextStep au script actif actuel (qui devrait être contentScript maintenant)
        let response = await browser.tabs.sendMessage(tab.id, { command: "nextStep" });
        
        if (response) {
          console.log("Réponse reçue du content script :", response);
          if (response.status === "done") {
            alert("Toutes les étapes ont été exécutées !");
          } else if (response.status === "next") {
            console.log(`Étape suivante : ${response.step}`);
          } else if (response.status === "error") {
            console.error(`Erreur dans l'étape : ${response.step}`);
          }
        } else {
          console.warn("Aucune réponse reçue du content script.");
        }
      } catch (error) {
        console.error("Erreur lors de l'exécution :", error);
      }
    });
  }

  // Fonction pour gérer l'exécution de alphaMatchers.js (clic sur l'icône)
  if (iconTrigger) {
    iconTrigger.addEventListener("click", async () => {
      console.log("Icône cliquée, exécution de alphaMatchers.js...");
      let tab = await getActiveTab();
      if (!tab) return;

      try {
        // Activer le script alphaMatchers
        await browser.runtime.sendMessage({ 
          command: "activateScript", 
          script: "alphaMatchers" 
        });
        
        // Démarrer le script
        await browser.tabs.sendMessage(tab.id, {
          command: "startScript",
          script: "alphaMatchers"
        });
        
        updateUI("alphaMatchers");
        
        // Exécuter automatiquement la première étape
        let response = await browser.tabs.sendMessage(tab.id, { command: "nextStep" });
        
        if (response) {
          console.log("Réponse reçue du script alphaMatchers :", response);
          // Traitement de la réponse...
        }
      } catch (error) {
        console.error("Erreur lors de l'exécution de alphaMatchers.js :", error);
      }
    });
  }

  // Gérer la touche Entrée
  document.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      console.log("Touche Entrée détectée, passage à l'étape suivante...");
      getActiveTab().then(tab => {
        if (tab) {
          browser.tabs.sendMessage(tab.id, { command: "nextStep" })
            .catch(error => {
              console.error("Erreur lors de l'envoi de la commande 'nextStep' :", error);
            });
        }
      });
    }
  });
});
