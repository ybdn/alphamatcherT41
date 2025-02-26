// Ajouter cette fonction au début du fichier
function logInfo(message, data = null) {
    const timestamp = new Date().toISOString().substr(11, 8);
    if (data) {
        console.log(`[${timestamp}] 🔷 AlphaMatchers: ${message}`, data);
    } else {
        console.log(`[${timestamp}] 🔷 AlphaMatchers: ${message}`);
    }
}

// Puis modifier la fonction verifyAlphaNumericData comme suit
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
        if (ficheEtabliePar.toUpperCase() === "FRANCK DESMIS") {
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

// Modifier également la fonction activateScript pour ajouter des logs supplémentaires
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
  } else {
    logInfo("❌❌❌ ÉCHEC DE LA VALIDATION DES DONNÉES ❌❌❌");
  }
}
