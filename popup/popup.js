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

  // Fonction pour exécuter alphaMatchers.js en cliquant sur "Lancer"
  if (nextActionButton) {
    nextActionButton.addEventListener("click", async () => {
      console.log("Bouton 'Lancer' cliqué - Exécution d'alphaMatchers.js");
      let tab = await getActiveTab();
      if (!tab) {
        alert("Aucun onglet actif trouvé");
        return;
      }

      try {
        // Lancer la vérification des données alphanumériques
        const response = await browser.tabs.sendMessage(tab.id, { 
          command: "checkAlphaNumeric" 
        });
        
        console.log("Réponse de la vérification alphanumerique:", response);
        
        if (response && response.success) {
          if (response.result) {
            updateIcon(false); // Pas d'erreur
          } else {
            updateIcon(true); // Erreur détectée
          }
        } else {
          console.error("Erreur lors de la vérification alphanumerique");
          
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
      } catch (error) {
        console.error("Erreur lors de l'envoi du message :", error);
        
        // Tenter l'injection si la commande échoue
        try {
          console.log("Erreur de communication, tentative d'injection...");
          await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["/content/alphaMatchers.js"]
          });
          
          console.log("Script injecté, nouvelle tentative...");
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const retryResponse = await browser.tabs.sendMessage(tab.id, { 
            command: "checkAlphaNumeric" 
          });
          
          console.log("Réponse après nouvelle tentative:", retryResponse);
        } catch (injectionError) {
          console.error("Échec complet:", injectionError);
        }
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