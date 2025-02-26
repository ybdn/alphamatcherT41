document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup chargé !");

  const nextActionButton = document.getElementById("next-action");
  const iconTrigger = document.getElementById("icon-trigger");

  // Fonction pour exécuter le script contentScript.js en cliquant sur "Lancer"
  if (nextActionButton) {
    nextActionButton.addEventListener("click", () => {
      console.log("Bouton 'Suivant' cliqué.");

      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
          const tab = tabs[0];
          console.log("Onglet actif trouvé :", tab);

          // Envoyer une commande au content script pour avancer d'une étape
          browser.tabs.sendMessage(tab.id, { command: "nextStep" }).then(
            (response) => {
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
            }
          ).catch((error) => {
            console.error("Erreur lors de l'envoi du message :", error);
          });
        } else {
          console.error("Aucun onglet actif trouvé.");
        }
      }).catch((error) => {
        console.error("Erreur lors de la récupération des onglets :", error);
      });

      // Ajout d'un écouteur pour la touche "Entrée"
      document.addEventListener("keydown", function handleEnter(event) {
        if (event.key === "Enter") {
          console.log("Touche Entrée détectée, passage à l'étape suivante...");
          browser.runtime.sendMessage({ command: "nextStep" });
          document.removeEventListener("keydown", handleEnter); // Supprime l'écoute après exécution
        }
      });
    });
  } else {
    console.error("Bouton 'Lancer' introuvable dans le popup.");
  }

  // Fonction pour exécuter alphaMatchers.js en cliquant sur l'icône
  if (iconTrigger) {
    iconTrigger.addEventListener("click", () => {
      console.log("Icône cliquée, exécution de alphaMatchers.js...");

      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
          const tab = tabs[0];

          browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["../content/alphaMatchers.js"]
          }).then(() => {
            console.log("alphaMatchers.js injecté avec succès !");
          }).catch((error) => {
            console.error("Erreur lors de l'injection de alphaMatchers.js :", error);
          });

          // Ajout d'un écouteur pour la touche "Entrée"
          document.addEventListener("keydown", function handleEnter(event) {
            if (event.key === "Enter") {
              console.log("Touche Entrée détectée, passage à l'étape suivante...");
              browser.runtime.sendMessage({ command: "nextStep" });
              document.removeEventListener("keydown", handleEnter); // Supprime l'écoute après exécution
            }
          });
        } else {
          console.error("Aucun onglet actif trouvé.");
        }
      }).catch((error) => {
        console.error("Erreur lors de la récupération des onglets :", error);
      });
    });
  } else {
    console.error("Icône introuvable dans le popup.");
  }
});
