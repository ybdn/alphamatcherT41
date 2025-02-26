// Empêcher la redéclaration et l'exécution multiple
if (window.activeScript === "contentScript") {
    console.warn("⚠️ contentScript.js est déjà actif. Arrêt de alphaMatchers.js.");
} else {
    window.activeScript = "alphaMatchers"; // Définir alphaMatchers comme actif

    console.log("✅ AlphaMatchers script injecté et prêt sur la page :", window.location.href);

    // Envoyer un message pour stopper contentScript.js avant d'exécuter alphaMatchers.js
    browser.runtime.sendMessage({ command: "stopContentScript" });

    // Variables pour suivre l'état des étapes
    let currentStepIndex = 0;

    // Fonction pour extraire et valider les données alphanumériques
    function verifyAlphaNumericData() {
        console.log("🔍 Début de la vérification des données alphanumériques...");

        const getValue = (selector) => document.querySelector(selector)?.value?.trim() || "";

        const idpp = getValue("#formValidationCorrection\\:identifiantGaspard");
        const typeSaisie = getValue("#formValidationCorrection\\:typeDeSignalisationValue");
        const nom = getValue("#formValidationCorrection\\:nom");
        const prenom = getValue("#formValidationCorrection\\:prenom");
        const serviceInitiateur = getValue("#formValidationCorrection\\:serviceInitiateur");
        const una = getValue("#formValidationCorrection\\:una");
        const ficheEtabliePar = getValue("#formValidationCorrection\\:ficheEtabliePar");
        const serviceRattachement = getValue("#formValidationCorrection\\:serviceRattachement");

        let errors = [];

        if ([idpp, typeSaisie, nom, prenom, serviceInitiateur, una, ficheEtabliePar, serviceRattachement]
            .some(field => field.toUpperCase().includes("NEOTEST") || field.toUpperCase().includes("NEO-TEST"))) {
            errors.push("❌ Présence d'une mention 'NEOTEST' ou 'NEO-TEST' détectée.");
        }

        if (ficheEtabliePar.toUpperCase() === "FRANCK DESMIS") {
            errors.push("❌ Fiche établie par 'FRANCK DESMIS' détectée.");
        }

        if (errors.length > 0) {
            console.error("🔴 Erreurs détectées :", errors);
            alert(errors.join("\n"));
            return false;
        }

        console.log("✅ Aucune erreur détectée.");
        return true;
    }

    // Définition des étapes
    const steps = [
        {
            name: "Vérification des données alphanumériques avant validation",
            action: (sendResponse) => {
                if (verifyAlphaNumericData()) {
                    console.log("✅ Données alphanumériques conformes.");
                    currentStepIndex++;
                    sendResponse && sendResponse({ status: "next", step: "Vérification terminée" });
                } else {
                    console.log("❌ Erreur détectée, arrêt du processus.");
                    sendResponse && sendResponse({ status: "error", step: "Erreur lors de la vérification" });
                }
            }
        },
        {
            name: "Cocher 'Non' dans la page alpha numérique, puis cliquer sur l'onglet Portraits",
            actions: [
                {
                    description: "Cocher 'Non'",
                    selector: "label[for='formValidationCorrection:decisionValidationAlphaPortraits:1']",
                    action: (element) => element.click(),
                },
                {
                    description: "Cliquer sur l'onglet Portraits",
                    selector: "a[href='#formValidationCorrection:tabViewValidationFiche:tab1']",
                    action: (element) => element.click(),
                },
            ],
        }
    ];

    // Fonction pour exécuter les étapes
    function executeNextStep(sendResponse) {
        if (currentStepIndex >= steps.length) {
            console.log("✅ Toutes les étapes ont été exécutées.");
            sendResponse && sendResponse({ status: "done" });
            return;
        }

        const step = steps[currentStepIndex];
        console.log(`🚀 Exécution de l'étape : ${step.name}`);

        if (step.actions) {
            step.actions.forEach(action => {
                let element = document.querySelector(action.selector);
                if (element) {
                    action.action(element);
                    console.log(`✅ Action exécutée : ${action.description}`);
                } else {
                    console.error(`❌ Élément introuvable : ${action.selector}`);
                }
            });
        }

        currentStepIndex++;
        sendResponse && sendResponse({ status: "next", step: step.name });
    }

    // Écouter les messages envoyés par le popup
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("📩 Message reçu dans alphaMatchers.js :", message);

        if (message.command === "nextStep") {
            executeNextStep(sendResponse);
            return true;
        }
    });
}
