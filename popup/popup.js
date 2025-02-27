document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup chargé !");

  const nextActionButton = document.getElementById("next-action");
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

  // Fonction pour exécuter contentScript.js en cliquant sur "Lancer"
  if (nextActionButton) {
    nextActionButton.addEventListener("click", async () => {
      console.log("Bouton 'Suivant' cliqué.");
      let tab = await getActiveTab();
      if (!tab) {
        alert("Aucun onglet actif trouvé");
        return;
      }

      try {
        // Vérifier d'abord les données alphanumériques
        console.log("Vérification des données alphanumériques...");
        
        let alphaCheckResponse = await browser.tabs.sendMessage(tab.id, { 
          command: "checkAlphaNumeric" 
        });
        
        console.log("Réponse de la vérification alphanumerique:", alphaCheckResponse);
        
        if (alphaCheckResponse && alphaCheckResponse.result === true) {
          // Si la vérification est réussie, passer à l'étape suivante
          console.log("Données validées, passage à l'étape suivante");
          updateIcon(false); // Pas d'erreur
          
          let response = await browser.tabs.sendMessage(tab.id, { command: "nextStep" });
          console.log("Réponse reçue du content script :", response);
          
          if (response) {
            if (response.status === "done") {
              alert("Toutes les étapes ont été exécutées !");
            } else if (response.status === "error") {
              console.error(`Erreur dans l'étape : ${response.step}`);
            }
          } else {
            console.warn("Aucune réponse reçue du content script.");
          }
        } else {
          // Si la vérification a échoué, afficher un message
          console.log("Données invalides, correction nécessaire");
          updateIcon(true); // Erreur détectée
        }
      } catch (error) {
        console.error("Erreur lors de l'envoi du message :", error);
      }
    });
  } else {
    console.error("Bouton 'Lancer' introuvable dans le popup.");
  }

  // Fonction pour exécuter alphaMatchers.js en cliquant sur l'icône
  if (iconTrigger) {
    iconTrigger.addEventListener("click", async () => {
      console.log("Icône cliquée, exécution de alphaMatchers.js...");
      
      let tab = await getActiveTab();
      if (!tab) {
        console.error("Aucun onglet actif trouvé");
        return;
      }

      try {
        // Lancer la vérification des données alphanumériques
        const response = await browser.tabs.sendMessage(tab.id, { 
          command: "checkAlphaNumeric" 
        });
        
        console.log("Réponse reçue:", response);
        if (response && response.success) {
          if (response.result) {
            updateIcon(false); // Pas d'erreur
          } else {
            updateIcon(true); // Erreur détectée
          }
        } else {
          console.error("Erreur lors de la vérification");
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
            if (retryResponse.result) {
              updateIcon(false); // Pas d'erreur
            } else {
              updateIcon(true); // Erreur détectée
            }
          } else {
            console.error("Échec de la vérification");
          }
        } catch (injectionError) {
          console.error("Échec de l'injection du script:", injectionError);
        }
      }
    });
  } else {
    console.error("Icône introuvable dans le popup.");
  }
  
  // Vérifier le statut initial
  (async () => {
    try {
      const activeScriptResponse = await browser.runtime.sendMessage({
        command: "getActiveScript"
      });
      
      if (activeScriptResponse && activeScriptResponse.success) {
        if (activeScriptResponse.activeScript === "alphaMatchers") {
          // Vérifier l'état actuel de la validation
          let tab = await getActiveTab();
          if (tab) {
            try {
              const checkResponse = await browser.tabs.sendMessage(tab.id, { 
                command: "checkAlphaNumeric" 
              });
              
              if (checkResponse && checkResponse.success) {
                updateIcon(!checkResponse.result); // Mettre à jour l'icône selon le résultat
              }
            } catch (error) {
              console.error("Erreur lors de la vérification initiale:", error);
              updateIcon(null); // État indéterminé
            }
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du statut initial:", error);
    }
  })();
});
