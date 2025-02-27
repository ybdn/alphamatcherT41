document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup chargé !");

  const iconTrigger = document.getElementById("icon-trigger");
  const appIcon = document.querySelector(".app-icon");
  
  // Fonction pour mettre à jour l'icône en fonction du statut de validation
  function updateIcon(hasError) {
    if (hasError === null) {
      // État initial ou indéterminé
      appIcon.src = "../icons/icon-48.png";
    } else if (hasError) {
      // Erreurs détectées
      appIcon.src = "../icons/icon-48-red.png";
    } else {
      // Pas d'erreur
      appIcon.src = "../icons/icon-48-green.png";
    }
  }

  // Fonction pour récupérer l'onglet actif
  async function getActiveTab() {
    try {
      let tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0 && tabs[0].id) {
        console.log("Onglet actif trouvé:", tabs[0].url);
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

  // Fonction pour vérifier les données alphanumériques
  async function checkAlphaNumericData() {
    let tab = await getActiveTab();
    if (!tab) {
      console.error("Aucun onglet actif trouvé");
      return null;
    }

    try {
      console.log("Vérification des données alphanumériques...");
      
      let alphaCheckResponse = await browser.tabs.sendMessage(tab.id, { 
        command: "checkAlphaNumeric" 
      });
      
      console.log("Réponse de la vérification alphanumerique:", alphaCheckResponse);
      
      if (alphaCheckResponse && alphaCheckResponse.success) {
        updateIcon(!alphaCheckResponse.result); // Mettre à jour l'icône selon le résultat
        return alphaCheckResponse.result;
      } else {
        console.error("Erreur lors de la vérification");
        updateIcon(null); // État indéterminé
        return null;
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'exécution d'alphaMatchers.js :", error);
      
      // Si le script n'est pas injecté, tenter de l'injecter
      try {
        console.log("Tentative d'injection du script alphaMatchers.js...");
        
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["/content/alphaMatchers.js"]
        });
        
        console.log("Script injecté, nouvelle tentative de vérification...");
        
        // Attendre un peu pour laisser le script s'initialiser
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Réessayer la vérification
        const retryResponse = await browser.tabs.sendMessage(tab.id, { 
          command: "checkAlphaNumeric" 
        });
        
        if (retryResponse && retryResponse.success) {
          updateIcon(!retryResponse.result); // Mettre à jour l'icône selon le résultat
          return retryResponse.result;
        } else {
          console.error("Échec de la vérification");
          updateIcon(null); // État indéterminé
          return null;
        }
      } catch (injectionError) {
        console.error("Échec de l'injection du script:", injectionError);
        updateIcon(null); // État indéterminé
        return null;
      }
    }
  }

  // Fonction pour exécuter la séquence d'actions
  async function executeNextStep() {
    let tab = await getActiveTab();
    if (!tab) {
      console.error("Aucun onglet actif trouvé");
      return;
    }

    try {
      let response = await browser.tabs.sendMessage(tab.id, { command: "nextStep" });
      console.log("Réponse reçue du content script :", response);
      
      if (response) {
        if (response.status === "done") {
          console.log("Toutes les étapes ont été exécutées !");
        } else if (response.status === "error") {
          console.error(`Erreur dans l'étape : ${response.step}`);
        }
      } else {
        console.warn("Aucune réponse reçue du content script.");
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi du message :", error);
    }
  }

  // Fonction pour exécuter alphaMatchers.js en cliquant sur l'icône
  if (iconTrigger) {
    iconTrigger.addEventListener("click", async () => {
      console.log("Icône cliquée, exécution de alphaMatchers.js...");
      
      const result = await checkAlphaNumericData();
      
      // Si la vérification est réussie et qu'il n'y a pas d'erreurs, exécuter la séquence suivante
      if (result === true) {
        await executeNextStep();
      }
    });
  } else {
    console.error("Icône introuvable dans le popup.");
  }
  
  // Vérifier automatiquement l'état quand le popup s'ouvre
  (async () => {
    await checkAlphaNumericData();
  })();
});
