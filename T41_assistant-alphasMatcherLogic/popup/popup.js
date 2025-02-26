document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup chargé !");

  const nextActionButton = document.getElementById("next-action");
  const iconTrigger = document.getElementById("icon-trigger");

  // Fonction pour récupérer l'onglet actif
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

  // Fonction pour exécuter contentScript.js en cliquant sur "Lancer"
  if (nextActionButton) {
    nextActionButton.addEventListener("click", async () => {
      console.log("Bouton 'Suivant' cliqué.");
      let tab = await getActiveTab();
      if (!tab) return;

      try {
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
      if (!tab) return;

      if (browser.scripting && browser.scripting.executeScript) {
        try {
          await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["../content/alphaMatchers.js"] // ✅ Correction du chemin
          });
          console.log("✅ alphaMatchers.js injecté avec succès !");

          // Envoi d'un message pour démarrer l'exécution après l'injection
          await browser.tabs.sendMessage(tab.id, { command: "startAlphaMatchers" });
          console.log("🔄 Commande envoyée pour démarrer alphaMatchers.js");
        } catch (error) {
          console.error("❌ Erreur lors de l'injection de alphaMatchers.js :", error);
        }
      } else {
        console.error("❌ L'API `scripting.executeScript` n'est pas disponible.");
      }
    });
  } else {
    console.error("Icône introuvable dans le popup.");
  }

  // Fonction pour gérer la touche "Entrée"
  function handleEnter(event) {
    if (event.key === "Enter") {
      console.log("Touche Entrée détectée, passage à l'étape suivante...");
      browser.runtime.sendMessage({ command: "nextStep" }).catch((error) => {
        console.error("Erreur lors de l'envoi de la commande 'nextStep' :", error);
      });
      document.removeEventListener("keydown", handleEnter);
    }
  }

  // Ajout de l'écouteur pour la touche "Entrée"
  document.addEventListener("keydown", handleEnter);
});
