console.log("AlphaMatchers script injecté et prêt sur la page :", window.location.href);

// Variables pour suivre l'état des étapes
let currentStepIndex = 0;

// Fonction pour afficher une fenêtre d'erreur en dehors du popup
function showErrorWindow(errors) {
    const errorMessage = errors.join("\n");

    const createWindow = (api) => {
        api.windows.create({
            url: "data:text/html," + encodeURIComponent(`
                <html>
                    <head>
                        <title>Erreur - Assistance T41</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                padding: 20px;
                                text-align: center;
                                background-color: #f8d7da;
                                color: #721c24;
                                border: 1px solid #f5c6cb;
                            }
                            h1 {
                                font-size: 20px;
                            }
                            p {
                                font-size: 16px;
                            }
                            button {
                                padding: 10px 20px;
                                margin-top: 20px;
                                border: none;
                                background-color: #721c24;
                                color: white;
                                font-size: 16px;
                                cursor: pointer;
                            }
                        </style>
                    </head>
                    <body>
                        <h1>Des erreurs ont été détectées :</h1>
                        <p>${errorMessage.replace(/\n/g, "<br>")}</p>
                        <button onclick="window.close()">Fermer</button>
                    </body>
                </html>
            `),
            type: "popup",
            width: 400,
            height: 300
        });
    };

    if (typeof browser !== "undefined") {
        createWindow(browser);
    } else if (typeof chrome !== "undefined") {
        createWindow(chrome);
    } else {
        alert("Erreur : Impossible d'afficher la fenêtre d'erreur.\n" + errorMessage);
    }
}

// Fonction pour extraire et valider les données alphanumériques
function verifyAlphaNumericData() {
    console.log("Début de la vérification des données alphanumériques...");

    // Sélection sécurisée des champs
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

    // Détection des NEO-TESTS
    if ([idpp, typeSaisie, nom, prenom, serviceInitiateur, una, ficheEtabliePar, serviceRattachement]
        .some(field => field.toUpperCase().includes("NEOTEST") || field.toUpperCase().includes("NEO-TEST"))) {
        errors.push("Présence d'une mention 'NEOTEST' ou 'NEO-TEST' détectée.");
    }

    if (ficheEtabliePar.toUpperCase() === "FRANCK DESMIS") {
        errors.push("Fiche établie par 'FRANCK DESMIS' détectée.");
    }

    // Vérification du Type / Type de saisie
    if (typeSaisie !== "SM") {
        if (!/^\d{5}$/.test(serviceRattachement)) {
            errors.push("Le champ 'Service de rattachement' est obligatoire et doit être un nombre à 5 chiffres.");
        }
    }

    // Vérification de l'IDPP
    if (idpp) {
        if (/CELLULE|DEPARTEMENTALE|DÉPARTEMENTALE/i.test(serviceInitiateur)) {
            errors.push("Le champ 'Service initiateur' ne doit pas contenir 'CELLULE' ou 'DÉPARTEMENTALE'.");
        }
    } else {
        if (!/\d+/.test(serviceInitiateur)) {
            errors.push("Le 'Service initiateur' doit contenir du texte et des chiffres.");
        }
        if (!/^\d{5}\/\d{5}\/\d{4}$/.test(una)) {
            errors.push("Le champ 'UNA' doit être au format : 12345/12345/2024.");
        }
        if (!/^\d{5}$/.test(serviceRattachement)) {
            errors.push("Le champ 'Service de rattachement' est obligatoire et doit être un nombre à 5 chiffres.");
        }
    }

    // Affichage des erreurs dans une nouvelle fenêtre
    if (errors.length > 0) {
        console.error("Erreurs détectées :", errors);
        showErrorWindow(errors);
        return false;
    }

    console.log("Aucune erreur détectée.");
    return true;
}

// Définition des étapes
const steps = [
    {
        name: "Vérification des données alphanumériques avant validation",
        action: (sendResponse) => {
            if (verifyAlphaNumericData()) {
                console.log("Données alphanumériques conformes.");
                currentStepIndex++;
                sendResponse && sendResponse({ status: "next", step: "Vérification des données alphanumériques terminée" });
            } else {
                console.log("Erreur détectée, arrêt du processus.");
                sendResponse && sendResponse({ status: "error", step: "Erreur lors de la vérification des données alphanumériques" });
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
    },
    {
        name: "Cliquer sur l'onglet Empreintes (doigts)",
        selector: "a[href='#formValidationCorrection:tabViewValidationFiche:tab2']",
        action: (element) => element.click(),
    },
    {
        name: "Cliquer sur l'onglet Empreintes (paumes)",
        selector: "a[href='#formValidationCorrection:tabViewValidationFiche:tab3']",
        action: (element) => element.click(),
    },
    {
        name: "Cocher 'Non' dans la page paume et cliquer sur 'Terminer'",
        actions: [
            {
                description: "Cocher 'Non' dans la page paume",
                selector: "label[for='formValidationCorrection:decisionsErreursEmpreintes:1']",
                action: (element) => element.click(),
            },
            {
                description: "Cliquer sur 'Terminer'",
                selector: "#formValidationCorrection\\:terminerControleBoutton",
                action: (element) => element.click(),
            },
        ],
    }
];

// Écouter les messages du popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message reçu dans alphaMatchers.js :", message);

    if (message.command === "nextStep") {
        executeNextStep(sendResponse);
        return true;
    }
});
