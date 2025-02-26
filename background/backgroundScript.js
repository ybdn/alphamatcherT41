console.log("Le script d'arrière-plan est chargé avec succès.");

// Listener pour les installations de l'extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension Assistance T41 installée.");
});

// Exemple : écoute les messages envoyés depuis d'autres scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message reçu :", message);
  if (message.type === "FAED_ACTION") {
    console.log("Action FAED détectée :", message.payload);
    sendResponse({ status: "Action reçue en arrière-plan." });
  }
});

// Ajout de l'écouteur pour le clic sur l'icône de l'extension
chrome.action.onClicked.addListener(async (tab) => {
  console.log("L'icône de l'extension a été cliquée. Injection de alphaMatchers.js...");

  if (tab && tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/alphaMatchers.js"]
    });
  }
});
