document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup chargé !");

  const nextActionButton = document.getElementById("next-action");
  const iconTrigger = document.getElementById("icon-trigger");
  
  // Ajouter un élément pour afficher le statut
  const statusElement = document.createElement("div");
  statusElement.id = "status-indicator";
  statusElement.style.cssText = `
    margin-top: 10px;
    padding: 5px;
    border-radius: 4px;
    font-size: 12px;
    text-align: center;
  `;
  document.getElementById("script-card").appendChild(statusElement);

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
  
  // Fonction pour mettre à jour le statut
  function updateStatus(message, isError = false) {
    const statusElement = document.getElementById("status-indicator");
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.style.backgroundColor = isError ? "#FFF5F5" : "#F0FFF4";
      statusElement.style.color = isError ? "#FF4136" : "#38A169";
      statusElement.style.border = `1px solid ${isError ? "#FF4136" : "#38A169"}`;
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
        updateStatus("Vérification des données...");
        
        let alphaCheckResponse = await browser.tabs.sendMessage(tab.id, { 
          command: "checkAlphaNumeric" 
        });
        
        console.log("Réponse de la vérification alphanumerique:", alphaCheckResponse);
        
        if (alphaCheckResponse && alphaCheckResponse.result === true) {
          // Si la vérification est réussie, passer à l'étape suivante
          console.log("Données validées, passage à l'étape suivante");
          updateStatus("Données validées ✓");
          
          let response = await browser.tabs.sendMessage(tab.id, { command: "nextStep" });
          console.log("Réponse reçue du content script :", response);
          
          if (response) {
            if (response.status === "done") {
              updateStatus("Toutes les étapes terminées ✓");
              alert("Toutes les étapes ont été exécutées !");
            } else if (response.status === "next") {
              updateStatus(`Étape "${response.step}" terminée ✓`);
            } else if (response.status === "error") {
              updateStatus(`Erreur: ${response.error || "Une erreur s'est produite"}`, true);
              console.error(`Erreur dans l'étape : ${response.step}`);
            }
          } else {
            console.warn("Aucune réponse reçue du content script.");
            updateStatus("Aucune réponse reçue", true);
          }
        } else {
          // Si la vérification a échoué, afficher un message
          console.log("Données invalides, correction nécessaire");
          updateStatus("Vérifiez les données et corrigez les erreurs", true);
        }
      } catch (error) {
        console.error("Erreur lors de l'envoi du message :", error);
        updateStatus("Erreur de communication avec la page", true);
      }
    });
  } else {
    console.error("Bouton 'Lancer' introuvable dans le popup.");
  }

  // Fonction pour exécuter alphaMatchers.js en cliquant sur l'icône
  if (iconTrigger) {
    iconTrigger.addEventListener("click", async () => {
      console.log("Icône cliquée, exécution de alphaMatchers.js...");
      updateStatus("Lancement de la vérification...");
      
      let tab = await getActiveTab();
      if (!tab) {
        updateStatus("Aucun onglet actif trouvé", true);
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
            updateStatus("Données validées ✓");
          } else {
            updateStatus("Données invalides, correction nécessaire", true);
          }
        } else {
          updateStatus("Erreur lors de la vérification", true);
        }
      } catch (error) {
        console.error("❌ Erreur lors de l'exécution d'alphaMatchers.js :", error);
        
        // Si le script n'est pas injecté, tenter de l'injecter
        try {
          console.log("Tentative d'injection du script alphaMatchers.js...");
          updateStatus("Injection du script...");
          
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
              updateStatus("Données validées ✓");
            } else {
              updateStatus("Données invalides, correction nécessaire", true);
            }
          } else {
            updateStatus("Échec de la vérification", true);
          }
        } catch (injectionError) {
          console.error("Échec de l'injection du script:", injectionError);
          updateStatus("Impossible d'injecter le script", true);
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
          updateStatus("Vérification des données active");
        } else if (activeScriptResponse.activeScript) {
          updateStatus(`Script "${activeScriptResponse.activeScript}" actif`);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du statut initial:", error);
    }
  })();
});
