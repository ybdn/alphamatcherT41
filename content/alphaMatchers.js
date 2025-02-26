// Variables globales
let isActive = false;
let currentStepIndex = 0;

// Fonction pour journaliser les informations avec un format cohérent
function logInfo(message, data = null) {
    const timestamp = new Date().toISOString().substr(11, 8);
    if (data) {
        console.log(`[${timestamp}] 🔷 AlphaMatchers: ${message}`, data);
    } else {
        console.log(`[${timestamp}] 🔷 AlphaMatchers: ${message}`);
    }
}

// Fonction pour afficher une fenêtre d'erreur avec les erreurs détectées
function showErrorWindow(errors) {
    logInfo("Affichage de la fenêtre d'erreur");
    
    // Supprimer toute fenêtre d'erreur existante
    const existingErrorWindow = document.getElementById('t41-error-window');
    if (existingErrorWindow) {
        existingErrorWindow.remove();
    }
    
    // Créer la fenêtre d'erreur
    const errorWindow = document.createElement('div');
    errorWindow.id = 't41-error-window';
    errorWindow.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 500px;
        max-height: 80vh;
        background-color: white;
        border: 2px solid #FF4136;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        padding: 20px;
        overflow-y: auto;
    `;
    
    // Créer l'en-tête
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        border-bottom: 1px solid #eee;
        padding-bottom: 10px;
    `;
    
    const title = document.createElement('h2');
    title.textContent = 'Erreurs détectées dans la fiche';
    title.style.cssText = `
        margin: 0;
        color: #FF4136;
        font-size: 18px;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '✕';
    closeButton.style.cssText = `
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #555;
    `;
    closeButton.onclick = () => errorWindow.remove();
    
    header.appendChild(title);
    header.appendChild(closeButton);
    errorWindow.appendChild(header);
    
    // Ajouter la liste des erreurs
    const errorList = document.createElement('ul');
    errorList.style.cssText = `
        list-style-type: none;
        padding: 0;
        margin: 0;
    `;
    
    errors.forEach(error => {
        const errorItem = document.createElement('li');
        errorItem.style.cssText = `
            padding: 10px;
            margin-bottom: 8px;
            background-color: #FFF5F5;
            border-left: 4px solid #FF4136;
            font-size: 14px;
        `;
        errorItem.textContent = error;
        errorList.appendChild(errorItem);
    });
    
    errorWindow.appendChild(errorList);
    
    // Ajouter des boutons d'action
    const actionButtons = document.createElement('div');
    actionButtons.style.cssText = `
        display: flex;
        justify-content: flex-end;
        margin-top: 20px;
        gap: 10px;
    `;
    
    const continueButton = document.createElement('button');
    continueButton.textContent = 'Ignorer et continuer';
    continueButton.style.cssText = `
        padding: 8px 16px;
        background-color: #DDDDDD;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;
    continueButton.onclick = () => {
        errorWindow.remove();
        // Continuer le processus si l'utilisateur choisit d'ignorer
        logInfo("L'utilisateur a choisi d'ignorer les erreurs et de continuer");
        // On pourrait ajouter ici un callback ou un événement pour continuer le flux
    };
    
    const fixButton = document.createElement('button');
    fixButton.textContent = 'Corriger les erreurs';
    fixButton.style.cssText = `
        padding: 8px 16px;
        background-color: #FF4136;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;
    fixButton.onclick = () => {
        errorWindow.remove();
        logInfo("L'utilisateur a choisi de corriger les erreurs");
        // Rien à faire ici, l'utilisateur va corriger manuellement
    };
    
    actionButtons.appendChild(continueButton);
    actionButtons.appendChild(fixButton);
    errorWindow.appendChild(actionButtons);
    
    // Ajouter la fenêtre au document
    document.body.appendChild(errorWindow);
    
    // Retourner la fenêtre pour permettre des manipulations supplémentaires
    return errorWindow;
}

// Fonction principale pour vérifier les données alphanumériques
function verifyAlphaNumericData() {
    logInfo("⭐ DÉBUT DE LA VÉRIFICATION DES DONNÉES ALPHANUMÉRIQUES ⭐");

    try {
        // Sélection sécurisée des champs
        const getValue = (selector) => {
            const element = document.querySelector(selector);
            const found = element ? "✅ trouvé" : "❌ non trouvé";
            const value = element?.value?.trim() || "";
            logInfo(`Élément ${selector}: ${found}, valeur: "${value}"`);
            return value;
        };

        logInfo("1️⃣ Extraction des valeurs des champs...");
        const idpp = getValue("#formValidationCorrection\\:identifiantGaspard");
        const typeSaisie = getValue("#formValidationCorrection\\:typeDeSignalisationValue");
        const nom = getValue("#formValidationCorrection\\:nom");
        const prenom = getValue("#formValidationCorrection\\:prenom");
        const serviceInitiateur = getValue("#formValidationCorrection\\:serviceInitiateur");
        const una = getValue("#formValidationCorrection\\:una");
        const ficheEtabliePar = getValue("#formValidationCorrection\\:ficheEtabliePar");
        const serviceRattachement = getValue("#formValidationCorrection\\:serviceRattachement");

        logInfo("Résumé des valeurs extraites:", {
            idpp, typeSaisie, nom, prenom, serviceInitiateur, una, ficheEtabliePar, serviceRattachement
        });

        let errors = [];
        let validationResults = {
            neotest: "Non vérifié",
            frankDesmis: "Non vérifié",
            typeSaisie: "Non vérifié",
            idppCheck: "Non vérifié",
            serviceInitiateurFormat: "Non vérifié",
            unaFormat: "Non vérifié",
            serviceRattachementFormat: "Non vérifié"
        };

        // 2️⃣ Détection des NEO-TESTS
        logInfo("2️⃣ Vérification des mentions NEO-TEST...");
        const hasNeoTest = [idpp, typeSaisie, nom, prenom, serviceInitiateur, una, ficheEtabliePar, serviceRattachement]
            .some(field => field.toUpperCase().includes("NEOTEST") || field.toUpperCase().includes("NEO-TEST"));
        
        if (hasNeoTest) {
            errors.push("Présence d'une mention 'NEOTEST' ou 'NEO-TEST' détectée.");
            validationResults.neotest = "❌ ÉCHEC";
            logInfo("❌ Test échoué: mention NEO-TEST détectée");
        } else {
            validationResults.neotest = "✅ OK";
            logInfo("✅ Test réussi: aucune mention NEO-TEST");
        }

        // Vérification FRANCK DESMIS
        logInfo("2️⃣ Vérification du nom 'FRANCK DESMIS'...");
        if (ficheEtabliePar.toUpperCase().includes("FRANCK DESMIS")) {
            errors.push("Fiche établie par 'FRANCK DESMIS' détectée.");
            validationResults.frankDesmis = "❌ ÉCHEC";
            logInfo("❌ Test échoué: FRANCK DESMIS détecté");
        } else {
            validationResults.frankDesmis = "✅ OK";
            logInfo("✅ Test réussi: pas de FRANCK DESMIS");
        }

        // 3️⃣ Vérification du Type / Type de saisie
        logInfo("3️⃣ Vérification du type de saisie...");
        if (typeSaisie !== "SM") {
            logInfo("Type de saisie différent de SM, vérification du service de rattachement...");
            if (!/^\d{5}$/.test(serviceRattachement)) {
                errors.push("Le champ 'Service de rattachement' est obligatoire et doit être un nombre à 5 chiffres.");
                validationResults.typeSaisie = "❌ ÉCHEC";
                logInfo("❌ Test échoué: Service de rattachement invalide");
            } else {
                validationResults.typeSaisie = "✅ OK";
                logInfo("✅ Test réussi: Service de rattachement valide");
            }
        } else {
            validationResults.typeSaisie = "✅ OK (Type SM)";
            logInfo("✅ Test ignoré: Type de saisie = SM");
        }

        // 4️⃣ Vérification de l'IDPP
        logInfo("4️⃣ Vérification de l'IDPP...");
        if (idpp) {
            logInfo("IDPP présent, vérification du service initiateur...");
            validationResults.idppCheck = "✅ OK";
            
            if (/CELLULE|DEPARTEMENTALE|DÉPARTEMENTALE/i.test(serviceInitiateur)) {
                errors.push("Le champ 'Service initiateur' ne doit pas contenir 'CELLULE' ou 'DÉPARTEMENTALE'.");
                validationResults.serviceInitiateurFormat = "❌ ÉCHEC";
                logInfo("❌ Test échoué: Service initiateur contient CELLULE ou DEPARTEMENTALE");
            } else {
                validationResults.serviceInitiateurFormat = "✅ OK";
                logInfo("✅ Test réussi: Service initiateur valide");
            }
        } else {
            logInfo("IDPP absent, vérification des autres champs...");
            validationResults.idppCheck = "❌ IDPP manquant";
            
            if (!/\d+/.test(serviceInitiateur)) {
                errors.push("Le 'Service initiateur' doit contenir du texte et des chiffres.");
                validationResults.serviceInitiateurFormat = "❌ ÉCHEC";
                logInfo("❌ Test échoué: Service initiateur doit contenir des chiffres");
            } else {
                validationResults.serviceInitiateurFormat = "✅ OK";
                logInfo("✅ Test réussi: Service initiateur contient des chiffres");
            }
            
            if (!/^\d{5}\/\d{5}\/\d{4}$/.test(una)) {
                errors.push("Le champ 'UNA' doit être au format : 12345/12345/2024.");
                validationResults.unaFormat = "❌ ÉCHEC";
                logInfo("❌ Test échoué: Format UNA invalide");
            } else {
                validationResults.unaFormat = "✅ OK";
                logInfo("✅ Test réussi: Format UNA valide");
            }
            
            if (!/^\d{5}$/.test(serviceRattachement)) {
                errors.push("Le champ 'Service de rattachement' est obligatoire et doit être un nombre à 5 chiffres.");
                validationResults.serviceRattachementFormat = "❌ ÉCHEC";
                logInfo("❌ Test échoué: Service de rattachement invalide");
            } else {
                validationResults.serviceRattachementFormat = "✅ OK";
                logInfo("✅ Test réussi: Service de rattachement valide");
            }
        }

        // Mise en évidence des champs avec erreurs
        if (errors.length > 0) {
            logInfo("Mise en évidence des champs avec erreurs...");
            highlightErrorFields(validationResults);
        }

        // Affichage du résumé des vérifications
        logInfo("📊 RÉSUMÉ DES VÉRIFICATIONS:", validationResults);

        // Affichage des erreurs
        if (errors.length > 0) {
            logInfo(`❌ ÉCHEC DE LA VALIDATION: ${errors.length} erreur(s) détectée(s)`, errors);
            showErrorWindow(errors);
            return false;
        }

        logInfo("✅ VALIDATION RÉUSSIE: Toutes les données sont conformes");
        return true;
    } catch (error) {
        logInfo(`🔴 ERREUR TECHNIQUE: ${error.message}`, error);
        showErrorWindow(["Erreur technique lors de la vérification: " + error.message]);
        return false;
    }
}

// Fonction pour mettre en évidence les champs avec erreurs
function highlightErrorFields(validationResults) {
    try {
        // Réinitialiser les styles précédents
        const allFields = [
            "#formValidationCorrection\\:identifiantGaspard",
            "#formValidationCorrection\\:typeDeSignalisationValue",
            "#formValidationCorrection\\:serviceInitiateur",
            "#formValidationCorrection\\:una",
            "#formValidationCorrection\\:ficheEtabliePar",
            "#formValidationCorrection\\:serviceRattachement"
        ];
        
        allFields.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.border = "";
                element.style.backgroundColor = "";
                
                // Supprimer l'indicateur d'erreur existant s'il y en a un
                const errorIndicator = document.querySelector(`${selector}-error-indicator`);
                if (errorIndicator) {
                    errorIndicator.remove();
                }
            }
        });
        
        // Appliquer les styles d'erreur
        if (validationResults.neotest === "❌ ÉCHEC" || validationResults.frankDesmis === "❌ ÉCHEC") {
            highlightField("#formValidationCorrection\\:ficheEtabliePar");
        }
        
        if (validationResults.typeSaisie === "❌ ÉCHEC" || validationResults.serviceRattachementFormat === "❌ ÉCHEC") {
            highlightField("#formValidationCorrection\\:serviceRattachement");
        }
        
        if (validationResults.serviceInitiateurFormat === "❌ ÉCHEC") {
            highlightField("#formValidationCorrection\\:serviceInitiateur");
        }
        
        if (validationResults.unaFormat === "❌ ÉCHEC") {
            highlightField("#formValidationCorrection\\:una");
        }
        
        logInfo("Mise en évidence des champs terminée");
    } catch (error) {
        logInfo(`Erreur lors de la mise en évidence des champs: ${error.message}`, error);
    }
}

// Fonction pour mettre en évidence un champ spécifique
function highlightField(selector) {
    const element = document.querySelector(selector);
    if (element) {
        // Sauvegarder les styles originaux
        const originalBorder = element.style.border;
        const originalBackground = element.style.backgroundColor;
        
        // Appliquer les styles d'erreur
        element.style.border = "2px solid #FF4136";
        element.style.backgroundColor = "#FFF5F5";
        
        // Ajouter un indicateur d'erreur
        const parent = element.parentNode;
        const errorIndicator = document.createElement("div");
        errorIndicator.id = `${selector.replace(/[\\:]/g, '')}-error-indicator`;
        errorIndicator.innerHTML = "⚠️";
        errorIndicator.style.cssText = `
            display: inline-block;
            margin-left: 8px;
            color: #FF4136;
            font-size: 16px;
        `;
        parent.appendChild(errorIndicator);
        
        // Ajouter une info-bulle sur l'indicateur d'erreur
        errorIndicator.title = "Ce champ contient une erreur";
        
        logInfo(`Champ mis en évidence: ${selector}`);
    } else {
        logInfo(`Champ introuvable pour mise en évidence: ${selector}`);
    }
}

// Fonction pour activer le script
function activateScript() {
    isActive = true;
    currentStepIndex = 0;
    
    logInfo("🚀 ACTIVATION DU SCRIPT ALPHAMATCHERS");
    logInfo("Script activé et prêt à exécuter les vérifications");
    
    // Vérification immédiate des données
    logInfo("Lancement de la vérification des données...");
    const result = verifyAlphaNumericData();
    if (result) {
        logInfo("✅✅✅ DONNÉES VALIDÉES AVEC SUCCÈS ✅✅✅");
        // Si les données sont valides, on peut continuer avec la séquence normale
        // Par exemple, en envoyant un message au contentScript pour poursuivre
        return true;
    } else {
        logInfo("❌❌❌ ÉCHEC DE LA VALIDATION DES DONNÉES ❌❌❌");
        return false;
    }
}

// Fonction pour désactiver le script
function deactivateScript() {
    isActive = false;
    logInfo("Script désactivé");
    
    // Informer le background script que le script a été arrêté
    browser.runtime.sendMessage({
        command: "scriptShutdownComplete",
        script: "alphaMatchers"
    }).catch(error => {
        console.error("Erreur lors de l'envoi du message d'arrêt:", error);
    });
}

// Écouter les messages du background script et du popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logInfo("Message reçu dans alphaMatchers.js:", message);
    
    if (message.command === "startScript" && message.script === "alphaMatchers") {
        logInfo("Commande de démarrage reçue");
        const result = activateScript();
        sendResponse({ success: true, result });
        return true;
    }
    else if (message.command === "stopScript" && message.script === "alphaMatchers") {
        logInfo("Commande d'arrêt reçue");
        deactivateScript();
        sendResponse({ success: true });
        return true;
    }
    else if (message.command === "checkAlphaNumeric") {
        logInfo("Commande de vérification des données alphanumériques reçue");
        const result = verifyAlphaNumericData();
        sendResponse({ success: true, result });
        return true;
    }
});

// Initialisation automatique si le script est chargé directement
if (document.readyState === "complete" || document.readyState === "interactive") {
    logInfo("Script chargé directement, initialisation...");
    
    // Nous ne lançons pas automatiquement la vérification ici pour éviter les interférences
    // avec le flux normal de l'extension
    
    // Envoyer un message pour indiquer que le script est prêt
    browser.runtime.sendMessage({
        type: "SCRIPT_READY",
        script: "alphaMatchers"
    }).catch(error => {
        console.error("Erreur lors de l'envoi du message d'initialisation:", error);
    });
} else {
    // Attendre que le document soit complètement chargé
    document.addEventListener("DOMContentLoaded", () => {
        logInfo("Document chargé, script prêt");
        
        // Envoyer un message pour indiquer que le script est prêt
        browser.runtime.sendMessage({
            type: "SCRIPT_READY",
            script: "alphaMatchers"
        }).catch(error => {
            console.error("Erreur lors de l'envoi du message d'initialisation:", error);
        });
    });
}

// Export des fonctions pour les tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        verifyAlphaNumericData,
        showErrorWindow,
        highlightErrorFields,
        highlightField,
        activateScript,
        deactivateScript
    };
}
