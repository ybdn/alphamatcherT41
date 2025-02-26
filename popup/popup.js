document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup chargé !");

  const nextActionButton = document.getElementById("next-action");
  const iconTrigger = document.getElementById("icon-trigger");

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
        let response = await browser.tabs.sendMessage(tab.id, { command: "nextStep" });
        console.log("Réponse reçue du content script :", response);
        
        if (response) {
          if (response.status === "done") {
            alert("Toutes les étapes ont été exécutées !");
          } else if (response.status === "next") {
            console.log(`Étape suivante : ${response.step}`);
          } else if (response.status === "error") {
            console.error(`Erreur dans l'étape : ${response.step}`);
            alert(`Erreur: ${response.error || "Une erreur s'est produite"}`);
          }
        } else {
          console.warn("Aucune réponse reçue du content script.");
          alert("Aucune réponse reçue. Le script est-il bien actif sur cette page?");
        }
      } catch (error) {
        console.error("Erreur lors de l'envoi du message :", error);
        alert("Erreur de communication avec la page. Etes-vous sur une page FAED?");
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
        alert("Aucun onglet actif trouvé");
        return;
      }

      try {
        // Injection du script
        console.log("Injection d'alphaMatchers.js dans l'onglet:", tab.id);
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["/content/alphaMatchers.js"]
        });
        console.log("✅ alphaMatchers.js injecté avec succès !");

        // Attente courte pour laisser le script s'initialiser
        await new Promise(resolve => setTimeout(resolve, 500));

        // Envoi d'un message pour vérifier que le script est actif
        console.log("Envoi d'une commande nextStep pour vérifier l'activité du script");
        const response = await browser.tabs.sendMessage(tab.id, { command: "nextStep" });
        
        console.log("Réponse reçue:", response);
        if (response && (response.status === "next" || response.status === "error")) {
          console.log("Le script alphaMatchers.js est correctement activé");
        } else {
          console.warn("Réponse inattendue du script alphaMatchers.js");
        }
      } catch (error) {
        console.error("❌ Erreur lors de l'exécution d'alphaMatchers.js :", error);
        alert("Erreur lors de l'exécution du script: " + error.message);
      }
    });
  } else {
    console.error("Icône introuvable dans le popup.");
  }
});
