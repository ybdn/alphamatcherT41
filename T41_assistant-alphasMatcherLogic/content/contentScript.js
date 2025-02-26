console.log("✅ Content script injecté et prêt sur la page :", window.location.href);

// Vérifier si un autre script est actif
if (window.activeScript === "alphaMatchers") {
    console.warn("⚠️ alphaMatchers.js est déjà actif. Arrêt de contentScript.js.");
} else {
    window.activeScript = "contentScript"; // Définir contentScript comme actif

    // Envoyer un message pour stopper alphaMatchers.js avant d'exécuter contentScript.js
    browser.runtime.sendMessage({ command: "stopAlphaMatchers" });

    // Variables pour suivre l'état des étapes
    let currentStepIndex = 0;

    // Définition des étapes
    const steps = [
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
        },
        {
            name: "Cliquer sur l'onglet Empreintes (doigts)",
            selector: "a[href='#formValidationCorrection:tabViewValidationFiche:tab2']",
            action: (element) => element.click(),
        }
    ];

    // Fonction pour exécuter une étape
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
        } else {
            let element = document.querySelector(step.selector);
            if (element) {
                step.action(element);
                console.log(`✅ Étape terminée : ${step.name}`);
            } else {
                console.error(`❌ Élément introuvable : ${step.selector}`);
            }
        }

        currentStepIndex++;
        sendResponse && sendResponse({ status: "next", step: step.name });
    }

    // Écouter les messages du popup
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("📩 Message reçu dans contentScript.js :", message);

        if (message.command === "nextStep") {
            executeNextStep(sendResponse);
            return true;
        } else if (message.command === "stopScript") {
            console.warn("⚠️ Arrêt de contentScript.js car alphaMatchers.js est actif.");
            window.activeScript = null;
        }
    });
}
