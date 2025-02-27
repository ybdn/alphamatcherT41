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
  console.log("Message reçu dans background :", message);
  
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
  else if (message.command === "executeContentScriptStep") {
    console.log("Commande reçue pour exécuter une étape dans le content script");
    
    // Récupérer l'onglet actif
    browser.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        if (tabs && tabs.length > 0 && tabs[0].id) {
          console.log("Envoi de la commande checkAlphaNumeric à l'onglet:", tabs[0].id);
          
          // Envoyer la commande checkAlphaNumeric au script alphaMatchers
          return browser.tabs.sendMessage(tabs[0].id, { command: "checkAlphaNumeric" });
        } else {
          console.error("Aucun onglet actif trouvé");
          return Promise.reject("Aucun onglet actif");
        }
      })
      .then(response => {
        console.log("Réponse du script alphaMatchers:", response);
        sendResponse({ success: true, response });
      })
      .catch(error => {
        console.error("Erreur lors de l'envoi de la commande:", error);
        sendResponse({ success: false, error: error.toString() });
      });
    
    return true; // Pour indiquer que sendResponse sera utilisé de manière asynchrone
  }
});

// Gérer le clic sur l'icône - utiliser pour injecter alphaMatchers.js
browser.action.onClicked.addListener(async (tab) => {
  console.log("L'icône de l'extension a été cliquée. Activation de alphaMatchers.js...");
  
  if (tab && tab.id) {
    try {
      // Injecter le script alphaMatchers.js manuellement
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/alphaMatchers.js"]
      });
      
      console.log("alphaMatchers.js injecté avec succès");
      
      // Maintenant activer le script
      await browser.tabs.sendMessage(tab.id, { 
        command: "checkAlphaNumeric" 
      });
      
      console.log("Commande de vérification envoyée à alphaMatchers.js");
    } catch (error) {
      console.error("Erreur lors de l'activation de alphaMatchers.js:", error);
    }
  }
});