// Encapsulation du script dans un IIFE pour isoler les variables
(function() {
    // Variables globales encapsulées
    let isActive = false;
    let alphaStepIndex = 0; // Renommé pour éviter le conflit
    let domFormat = null; // Variable pour stocker le format DOM détecté
    let currentStepIndex = 0; // Pour suivre l'état des étapes d'automatisation

    // Définition des étapes de l'automatisation (intégrées depuis contentScript.js)
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
                    description: "Vérifier et cliquer sur l'onglet Portraits s'il n'est pas désactivé",
                    selector: "a[href='#formValidationCorrection:tabViewValidationFiche:tab1']",
                    action: (element) => {
                        // Vérifier si l'onglet ou son parent contient la classe ui-disabled
                        const liParent = element.closest('li');
                        const isDisabled = liParent && liParent.classList.contains('ui-state-disabled');
                        
                        if (isDisabled) {
                            logInfo("Onglet Portraits désactivé, passage à l'étape suivante");
                            // Incrémenter l'index pour sauter directement à l'étape des empreintes doigts
                            currentStepIndex++;
                        } else {
                            logInfo("Onglet Portraits actif, clic en cours");
                            element.click();
                        }
                    },
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
        },
        {
            name: "Cliquer sur 'OK et suivant' ou 'OK'",
            selector: "#formValidationCorrection\\:okSuivantValidationFicheSignalisation",
            fallbackSelector: "#formValidationCorrection\\:terminerValidationFicheSignalisation",
            action: (element, fallbackElement) => {
                if (element && !element.disabled && element.getAttribute('aria-disabled') !== 'true') {
                    console.log("Bouton 'OK et suivant' activé trouvé, clic en cours...");
                    element.click();
                } else if (fallbackElement) {
                    console.log("Bouton 'OK et suivant' désactivé. Bouton 'OK' trouvé, clic en cours...");
                    fallbackElement.click();
                } else {
                    console.error("Aucun des boutons 'OK et suivant' ou 'OK' n'est disponible.");
                }
            },
        },
    ];

    // Fonction pour journaliser les informations avec un format cohérent
    function logInfo(message, data = null) {
        const timestamp = new Date().toISOString().substr(11, 8);
        if (data) {
            console.log(`[${timestamp}] 🔷 AlphaMatchers: ${message}`, data);
        } else {
            console.log(`[${timestamp}] 🔷 AlphaMatchers: ${message}`);
        }
    }

    // Fonction pour vérifier la présence de l'indicateur de chargement
    function isLoadingIndicatorPresent() {
        const loadingIndicator = document.querySelector('.blockUI.blockMsg.blockElement.pe-blockui');
        const result = !!loadingIndicator;
        if (result) {
            logInfo("🔄 Indicateur de chargement détecté");
        }
        return result;
    }

    // Fonction pour attendre que l'indicateur de chargement disparaisse
    function waitForLoadingToComplete(callback, timeout = 30000) {
        const startTime = Date.now();
        logInfo("⏳ Attente de la fin du chargement...");
        
        const interval = setInterval(() => {
            if (!isLoadingIndicatorPresent()) {
                clearInterval(interval);
                logInfo("✅ Indicateur de chargement disparu, reprise de l'exécution");
                callback();
            } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                logInfo("⚠️ Délai d'attente dépassé pour l'indicateur de chargement");
                callback();
            }
        }, 200); // Vérifier toutes les 200ms
    }

    // Fonction pour détecter le format DOM de la page actuelle
    function detectDOMFormat() {
        // Vérifier d'abord si les éléments incluent tabViewValidationFiche
        const withTabView = document.querySelector("#formValidationCorrection\\:tabViewValidationFiche\\:nom");
        const withoutTabView = document.querySelector("#formValidationCorrection\\:nom");
        
        if (withTabView) {
            logInfo("Format DOM détecté: avec tabViewValidationFiche");
            return "tabView";
        } else if (withoutTabView) {
            logInfo("Format DOM détecté: sans tabViewValidationFiche");
            return "direct";
        } else {
            // Essayer d'autres sélecteurs pour détecter le format
            const anyForm = document.querySelector("#formValidationCorrection");
            if (anyForm) {
                logInfo("Format DOM détecté: formulaire trouvé mais format inconnu");
                return "unknown";
            } else {
                logInfo("Format DOM détecté: aucun formulaire trouvé");
                return "notFound";
            }
        }
    }

    // Fonction pour diagnostiquer le problème de détection des champs
    function diagnoseDOMIssues() {
        logInfo("🔍 DIAGNOSTIC DES PROBLÈMES DE DOM EN COURS...");
        
        // Vérifier si on peut trouver le type de saisie avec différentes méthodes
        const typeSelectors = [
            "#formValidationCorrection\\:typeDeSignalisationValue",
            "#formValidationCorrection\\:tabViewValidationFiche\\:typeDeSignalisationValue",
            "input[id*='typeDeSignalisation']"
        ];
        
        logInfo("--- Recherche du type de saisie ---");
        let typeFound = false;
        typeSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                typeFound = true;
                logInfo(`Sélecteur ${selector}: ✅ trouvé, valeur: "${element.value}"`);
            } else {
                logInfo(`Sélecteur ${selector}: ❌ non trouvé`);
            }
        });
        
        if (!typeFound) {
            // Recherche plus générique par attribut
            const allInputs = document.querySelectorAll('input[type="text"]');
            logInfo(`Nombre total d'inputs texte trouvés: ${allInputs.length}`);
            
            for (const input of allInputs) {
                if (input.id.includes('type') || input.name.includes('type')) {
                    logInfo(`Input potentiel trouvé pour le type: id=${input.id}, name=${input.name}, value="${input.value}"`);
                }
            }
            
            // Chercher par label
            const typeLabels = document.querySelectorAll('label');
            for (const label of typeLabels) {
                if (label.textContent.includes('Type')) {
                    logInfo(`Label "Type" trouvé: ${label.outerHTML}`);
                    const labelFor = label.getAttribute('for');
                    if (labelFor) {
                        const associatedInput = document.getElementById(labelFor);
                        if (associatedInput) {
                            logInfo(`Input associé trouvé: id=${associatedInput.id}, value="${associatedInput.value}"`);
                        }
                    }
                    
                    // Trouver l'élément suivant le label (navigation DOM)
                    const nextElement = label.nextElementSibling;
                    if (nextElement) {
                        logInfo(`Élément suivant le label: ${nextElement.tagName}, id=${nextElement.id}, value=${nextElement.value}`);
                    }
                }
            }
        }
        
        // Tester également la détection du service de rattachement
        logInfo("--- Recherche du service de rattachement ---");
        const serviceSelectors = [
            "#formValidationCorrection\\:ServiceRattachement",
            "#formValidationCorrection\\:tabViewValidationFiche\\:ServiceRattachement",
            "input[id*='ServiceRattachement']"
        ];
        
        serviceSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                logInfo(`Sélecteur ${selector}: ✅ trouvé, valeur: "${element.value}"`);
            } else {
                logInfo(`Sélecteur ${selector}: ❌ non trouvé`);
            }
        });
        
        logInfo("🔍 FIN DU DIAGNOSTIC");
    }

    // Fonction pour obtenir le sélecteur approprié en fonction du format DOM
    function getSelector(baseSelector, field) {
        if (domFormat === "tabView") {
            // Cas spéciaux pour certains champs
            if (field === "serviceInitiateur" || field === "serviceSignalisation") {
                return "#formValidationCorrection\\:tabViewValidationFiche\\:ServiceSignalisationListeActive_input";
            } else if (field === "una" || field === "numeroProcedure") {
                return "#formValidationCorrection\\:tabViewValidationFiche\\:NumeroProcedure";
            } else if (field === "serviceRattachement") {
                return "#formValidationCorrection\\:tabViewValidationFiche\\:ServiceRattachement";
            } else if (field === "ficheEtabliePar") {
                return "#formValidationCorrection\\:tabViewValidationFiche\\:ficheEtabliePar";
            } else if (field === "nom") {
                return "#formValidationCorrection\\:tabViewValidationFiche\\:nom";
            } else if (field === "prenom") {
                return "#formValidationCorrection\\:tabViewValidationFiche\\:prenom";
            } else if (field === "identifiantGaspard" || field === "idpp") {
                return "#formValidationCorrection\\:tabViewValidationFiche\\:identifiantGaspard";
            } else if (field === "typeSaisie" || field === "typeDeSignalisation") {
                // Pour le type de saisie, on essaie d'abord le format tabView mais on a aussi un fallback
                return "#formValidationCorrection\\:tabViewValidationFiche\\:typeDeSignalisationValue";
            }
            // Format avec tabViewValidationFiche
            return "#formValidationCorrection\\:tabViewValidationFiche\\:" + field;
        } else {
            // Format direct
            if (field === "serviceInitiateur" || field === "serviceSignalisation") {
                return "#formValidationCorrection\\:ServiceSignalisationListeActive_input";
            } else if (field === "una" || field === "numeroProcedure") {
                return "#formValidationCorrection\\:NumeroProcedure";
            } else if (field === "identifiantGaspard" || field === "idpp") {
                return "#formValidationCorrection\\:identifiantGaspard";
            } else if (field === "typeSaisie" || field === "typeDeSignalisation") {
                return "#formValidationCorrection\\:typeDeSignalisationValue";
            }
            return baseSelector;
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
            width: 600px;
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
            // Déclencher automatiquement les étapes suivantes
            executeNextStep((response) => {
                logInfo("Continuation automatique après ignorer les erreurs:", response);
            });
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

        // Vérification de l'indicateur de chargement avant de commencer
        if (isLoadingIndicatorPresent()) {
            logInfo("🔄 Indicateur de chargement détecté, mise en attente de la vérification");
            waitForLoadingToComplete(() => {
                performVerification();
            });
            return false;
        } else {
            return performVerification();
        }
    }

    // Fonction interne qui effectue la vérification des données
    function performVerification() {
        try {
            // Détection du format DOM si pas encore fait
            if (!domFormat) {
                domFormat = detectDOMFormat();
            }

            // Si le format DOM est inconnu, lancer le diagnostic
            if (domFormat === "unknown" || domFormat === "notFound") {
                diagnoseDOMIssues();
            }

            // Fonction pour obtenir la valeur d'un élément avec un sélecteur principal et une alternative
            const getValue = (baseSelector, field) => {
                const selector = getSelector(baseSelector, field);
                const element = document.querySelector(selector);
                
                if (element) {
                    const value = element.value?.trim() || "";
                    logInfo(`Élément ${selector}: ✅ trouvé, valeur: "${value}"`);
                    return value;
                }
                
                // Si le champ est le type de saisie, essayer une recherche directe
                if (field === "typeSaisie" || field === "typeDeSignalisation") {
                    // Essayer le sélecteur direct sans tabViewValidationFiche
                    const directSelector = "#formValidationCorrection\\:typeDeSignalisationValue";
                    const directElement = document.querySelector(directSelector);
                    
                    if (directElement) {
                        const value = directElement.value?.trim() || "";
                        logInfo(`Élément trouvé via sélecteur direct ${directSelector}: ✅ trouvé, valeur: "${value}"`);
                        return value;
                    }
                }
                
                // Si le format n'est pas trouvé, essayer les deux formats
                if (domFormat === "unknown" || domFormat === "notFound") {
                    const altSelector = field === "serviceInitiateur" || field === "serviceSignalisation"
                        ? "#formValidationCorrection\\:tabViewValidationFiche\\:ServiceSignalisationListeActive_input" 
                        : "#formValidationCorrection\\:" + field;
                    
                    const altElement = document.querySelector(altSelector);
                    if (altElement) {
                        const value = altElement.value?.trim() || "";
                        logInfo(`Élément ${altSelector}: ✅ trouvé, valeur: "${value}"`);
                        return value;
                    }
                }
                
                // Dernière tentative: chercher par texte de label pour le type de saisie
                if (field === "typeSaisie" || field === "typeDeSignalisation") {
                    const labels = document.querySelectorAll('label');
                    for (const label of labels) {
                        if (label.textContent.includes('Type')) {
                            const nextElement = label.nextElementSibling;
                            if (nextElement && nextElement.tagName === 'INPUT') {
                                const value = nextElement.value?.trim() || "";
                                logInfo(`Type de saisie trouvé via label: ✅ trouvé, valeur: "${value}"`);
                                return value;
                            }
                        }
                    }
                }
                
                logInfo(`Élément ${selector}: ❌ non trouvé, valeur: ""`);
                return "";
            };

            logInfo("1️⃣ Extraction des valeurs des champs...");
            
            // Extraction des valeurs en utilisant la fonction robuste
            const idpp = getValue("#formValidationCorrection\\:identifiantGaspard", "identifiantGaspard");
            const typeSaisie = getValue("#formValidationCorrection\\:typeDeSignalisationValue", "typeDeSignalisation");
            const nom = getValue("#formValidationCorrection\\:nom", "nom");
            const prenom = getValue("#formValidationCorrection\\:prenom", "prenom");
            const serviceSignalisation = getValue("#formValidationCorrection\\:serviceInitiateur", "serviceSignalisation");
            const una = getValue("#formValidationCorrection\\:una", "numeroProcedure");
            const ficheEtabliePar = getValue("#formValidationCorrection\\:ficheEtabliePar", "ficheEtabliePar");
            const serviceRattachement = getValue("#formValidationCorrection\\:serviceRattachement", "serviceRattachement");

            logInfo("Résumé des valeurs extraites:", {
                idpp, typeSaisie, nom, prenom, serviceSignalisation, una, ficheEtabliePar, serviceRattachement
            });

            let errors = [];
            let validationResults = {
                neotest: "Non vérifié",
                frankDesmis: "Non vérifié",
                typeSaisie: "Non vérifié",
                idppCheck: "Non vérifié",
                serviceSignalisationFormat: "Non vérifié",
                unaFormat: "Non vérifié",
                serviceRattachementFormat: "Non vérifié"
            };

            // 2️⃣ Détection des NEO-TESTS
            logInfo("2️⃣ Vérification des mentions NEO-TEST...");
            const hasNeoTest = [idpp, typeSaisie, nom, prenom, serviceSignalisation, una, ficheEtabliePar, serviceRattachement]
                .some(field => {
                    const upperField = field.toUpperCase();
                    return upperField.includes("NEOTEST") || 
                           upperField.includes("NEO-TEST") ||
                           upperField.includes("NEO") ||
                           upperField.includes("TEST");
                });
            
            if (hasNeoTest) {
                errors.push("Présence d'une mention 'NEOTEST', 'NEO-TEST', 'NEO' ou 'TEST' détectée.");
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
            // Faire un log détaillé du type de saisie pour le debugging
            logInfo(`Type de saisie récupéré: "${typeSaisie}" (longueur: ${typeSaisie.length})`);

            // Normaliser le type de saisie (enlever espaces, mettre en majuscules)
            const normalizedTypeSaisie = typeSaisie.trim().toUpperCase();
            logInfo(`Type de saisie normalisé: "${normalizedTypeSaisie}"`);

            // D'abord, vérifions si le type de saisie est valide en soi
            if (normalizedTypeSaisie) {
                validationResults.typeSaisie = "✅ OK";
                logInfo(`Type de saisie valide: "${normalizedTypeSaisie}"`);
            } else {
                validationResults.typeSaisie = "❌ ÉCHEC";
                errors.push("Le champ 'Type de saisie' est obligatoire.");
                logInfo("❌ Test échoué: Type de saisie manquant");
            }

            // Ensuite, vérification conditionnelle du service de rattachement
            if (normalizedTypeSaisie !== "SM") {
                logInfo(`Type de saisie (${normalizedTypeSaisie}) différent de SM, vérification du service de rattachement...`);
                // Nettoyage des espaces potentiels
                const cleanServiceRattachement = serviceRattachement.trim();
                logInfo(`Service de rattachement à vérifier: "${cleanServiceRattachement}"`);
                
                if (!/^\d{5}$/.test(cleanServiceRattachement)) {
                    errors.push("Erreur : Service de rattachement et d'investigation/Terminal de saisie. Collez ce texte : Terminal de saisie : indiquer le code unité à cinq chiffres de l'unité dotée du matériel (ex : 02590)");
                    validationResults.serviceRattachementFormat = "❌ ÉCHEC";
                    logInfo(`❌ Test échoué: Service de rattachement invalide: "${serviceRattachement}"`);
                } else {
                    validationResults.serviceRattachementFormat = "✅ OK";
                    logInfo("✅ Test réussi: Service de rattachement valide");
                }
            } else {
                validationResults.serviceRattachementFormat = "✅ OK (Ignoré)";
                logInfo(`✅ Test ignoré: Type de saisie = ${normalizedTypeSaisie} (SM), pas de vérification du service de rattachement`);
            }

            // 4️⃣ Vérification de l'IDPP
            logInfo("4️⃣ Vérification de l'IDPP et du Service de signalisation...");
            
            // Vérification si le service contient CELLULE ou DEPARTEMENT/DÉPARTEMENT
            const serviceForbiddenTerms = /CELLULE|DEPARTEMENT|DÉPARTEMENT/i;
            
            if (idpp) {
                logInfo("IDPP présent, vérification du service de signalisation et de rattachement...");
                validationResults.idppCheck = "✅ OK";
                
                // Vérification du service de signalisation
                if (serviceForbiddenTerms.test(serviceSignalisation)) {
                    errors.push("Erreur : Service de signalisation. Collez ce texte : Le service de signalisation est l'unité qui a réalisé le RDK.");
                    validationResults.serviceSignalisationFormat = "❌ ÉCHEC";
                    logInfo("❌ Test échoué: Service de signalisation contient CELLULE, DEPARTEMENT ou DÉPARTEMENT");
                } else {
                    validationResults.serviceSignalisationFormat = "✅ OK";
                    logInfo("✅ Test réussi: Service de signalisation valide");
                }
                
                // Vérification du service de rattachement (ne doit pas contenir 11707)
                if (serviceRattachement.includes("11707")) {
                    errors.push("Erreur : Service de rattachement et d'investigation/Terminal de saisie. Collez ce texte : Terminal de saisie : indiquer le code unité à cinq chiffres de l'unité dotée du matériel (ex : 02590)");
                    validationResults.serviceRattachementFormat = "❌ ÉCHEC";
                    logInfo("❌ Test échoué: Service de rattachement contient 11707");
                } else if (validationResults.serviceRattachementFormat !== "❌ ÉCHEC") {
                    validationResults.serviceRattachementFormat = "✅ OK";
                    logInfo("✅ Test réussi: Service de rattachement valide");
                }
            } else {
                logInfo("IDPP absent, vérification des autres champs...");
                validationResults.idppCheck = "❌ IDPP manquant";
                
                // Vérification du format du service de signalisation
                if (!(/\d+/.test(serviceSignalisation))) {
                    errors.push("Erreur : Service de signalisation. Collez ce texte : Le service de signalisation est l'unité qui a réalisé le RDK.");
                    validationResults.serviceSignalisationFormat = "❌ ÉCHEC";
                    logInfo("❌ Test échoué: Service de signalisation doit contenir des chiffres");
                } else if (serviceForbiddenTerms.test(serviceSignalisation)) {
                    errors.push("Erreur : Service de signalisation. Collez ce texte : Le service de signalisation est l'unité qui a réalisé le RDK.");
                    validationResults.serviceSignalisationFormat = "❌ ÉCHEC";
                    logInfo("❌ Test échoué: Service de signalisation contient CELLULE, DEPARTEMENT ou DÉPARTEMENT");
                } else {
                    validationResults.serviceSignalisationFormat = "✅ OK";
                    logInfo("✅ Test réussi: Service de signalisation valide");
                }
                
                // Vérification du format UNA
                if (!/^\d{5}\/\d{5}\/\d{4}$/.test(una)) {
                    errors.push("Erreur : UNA. Collez ce texte : L'UNA doit être au format 5/5/4.");
                    validationResults.unaFormat = "❌ ÉCHEC";
                    logInfo("❌ Test échoué: Format UNA invalide");
                } else {
                    validationResults.unaFormat = "✅ OK";
                    logInfo("✅ Test réussi: Format UNA valide");
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
            
            // Déclencher automatiquement les étapes suivantes
            logInfo("🔄 Déclenchement automatique des étapes suivantes...");
            executeNextStep((response) => {
                logInfo("✅ Réponse de l'exécution de l'étape:", response);
            });
            
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
                "identifiantGaspard",
                "typeDeSignalisationValue",
                "serviceInitiateur",
                "una",
                "ficheEtabliePar",
                "serviceRattachement",
                "nom",
                "prenom"
            ];
            
            allFields.forEach(field => {
                const selector = getSelector(`#formValidationCorrection\\:${field}`, field);
                const element = document.querySelector(selector);
                
                if (element) {
                    element.style.border = "";
                    element.style.backgroundColor = "";
                    
                    // Supprimer l'indicateur d'erreur existant s'il y en a un
                    const errorIndicator = document.querySelector(`${selector.replace(/[\\:]/g, '')}-error-indicator`);
                    if (errorIndicator) {
                        errorIndicator.remove();
                    }
                }
            });
            
            // Appliquer les styles d'erreur
            if (validationResults.neotest === "❌ ÉCHEC" || validationResults.frankDesmis === "❌ ÉCHEC") {
                highlightField("ficheEtabliePar");
            }
            
            if (validationResults.typeSaisie === "❌ ÉCHEC") {
                highlightField("typeDeSignalisationValue");
            }
            
            if (validationResults.serviceRattachementFormat === "❌ ÉCHEC") {
                highlightField("serviceRattachement");
            }
            
            if (validationResults.serviceSignalisationFormat === "❌ ÉCHEC") {
                highlightField("serviceInitiateur"); // Utilise le sélecteur pour Service initiateur/signalisation
            }
            
            if (validationResults.unaFormat === "❌ ÉCHEC") {
                highlightField("una");
            }
            
            logInfo("Mise en évidence des champs terminée");
        } catch (error) {
            logInfo(`Erreur lors de la mise en évidence des champs: ${error.message}`, error);
        }
    }

    // Fonction pour mettre en évidence un champ spécifique
    function highlightField(field) {
        const selector = getSelector(`#formValidationCorrection\\:${field}`, field);
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
            
            // Essayer de trouver un élément alternatif si l'élément direct n'est pas trouvé
            if (field === "serviceInitiateur") {
                const altSelector = "#formValidationCorrection\\:tabViewValidationFiche\\:ServiceSignalisationListeActive_input";
                const altElement = document.querySelector(altSelector);
                if (altElement) {
                    altElement.style.border = "2px solid #FF4136";
                    altElement.style.backgroundColor = "#FFF5F5";
                    logInfo(`Alternative utilisée pour mise en évidence: ${altSelector}`);
                }
            } else if (field === "una") {
                const altSelector = "#formValidationCorrection\\:tabViewValidationFiche\\:NumeroProcedure";
                const altElement = document.querySelector(altSelector);
                if (altElement) {
                    altElement.style.border = "2px solid #FF4136";
                    altElement.style.backgroundColor = "#FFF5F5";
                    logInfo(`Alternative utilisée pour mise en évidence: ${altSelector}`);
                }
            } else if (field === "serviceRattachement") {
                const altSelector = "#formValidationCorrection\\:tabViewValidationFiche\\:ServiceRattachement";
                const altElement = document.querySelector(altSelector);
                if (altElement) {
                    altElement.style.border = "2px solid #FF4136";
                    altElement.style.backgroundColor = "#FFF5F5";
                    logInfo(`Alternative utilisée pour mise en évidence: ${altSelector}`);
                }
            } else if (field === "typeDeSignalisationValue") {
                const altSelector = "#formValidationCorrection\\:tabViewValidationFiche\\:typeDeSignalisationValue";
                const altElement = document.querySelector(altSelector);
                if (altElement) {
                    altElement.style.border = "2px solid #FF4136";
                    altElement.style.backgroundColor = "#FFF5F5";
                    logInfo(`Alternative utilisée pour mise en évidence: ${altSelector}`);
                }
            }
        }
    }

    // Fonctions pour l'automatisation (intégrées depuis contentScript.js)
    // Fonction pour attendre un élément ou un fallback
    function waitForElementOrFallback(selector, fallbackSelector, callback, timeout = 5000) {
        // Vérifier d'abord si l'indicateur de chargement est présent
        if (isLoadingIndicatorPresent()) {
            logInfo(`🔄 Indicateur de chargement détecté, mise en attente avant de chercher ${selector} ou ${fallbackSelector}`);
            waitForLoadingToComplete(() => {
                waitForElementOrFallbackInternal(selector, fallbackSelector, callback, timeout);
            });
        } else {
            waitForElementOrFallbackInternal(selector, fallbackSelector, callback, timeout);
        }
    }

    // Fonction interne pour attendre un élément ou un fallback
    function waitForElementOrFallbackInternal(selector, fallbackSelector, callback, timeout = 5000) {
        const startTime = Date.now();
        const interval = setInterval(() => {
            try {
                // Vérifier à nouveau l'indicateur de chargement pendant la recherche de l'élément
                if (isLoadingIndicatorPresent()) {
                    clearInterval(interval);
                    logInfo(`🔄 Indicateur de chargement détecté pendant la recherche de ${selector} ou ${fallbackSelector}, reprise de l'attente`);
                    waitForLoadingToComplete(() => {
                        waitForElementOrFallbackInternal(selector, fallbackSelector, callback, timeout - (Date.now() - startTime));
                    });
                    return;
                }
                
                const element = document.querySelector(selector);
                const fallbackElement = fallbackSelector ? document.querySelector(fallbackSelector) : null;

                if ((element && !element.disabled && element.getAttribute('aria-disabled') !== 'true') || fallbackElement) {
                    clearInterval(interval);
                    callback(element, fallbackElement);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    logInfo(`Aucun élément trouvé pour les sélecteurs : ${selector}, ${fallbackSelector}`);
                }
            } catch (error) {
                clearInterval(interval);
                logInfo("Erreur dans waitForElementOrFallback :", error);
            }
        }, 100);
    }

    // Fonction pour attendre un élément
    function waitForElement(selector, callback, timeout = 5000) {
        // Vérifier d'abord si l'indicateur de chargement est présent
        if (isLoadingIndicatorPresent()) {
            logInfo(`🔄 Indicateur de chargement détecté, mise en attente avant de chercher ${selector}`);
            waitForLoadingToComplete(() => {
                waitForElementInternal(selector, callback, timeout);
            });
        } else {
            waitForElementInternal(selector, callback, timeout);
        }
    }

    // Fonction interne pour attendre un élément
    function waitForElementInternal(selector, callback, timeout = 5000) {
        const startTime = Date.now();
        const interval = setInterval(() => {
            try {
                // Vérifier à nouveau l'indicateur de chargement pendant la recherche de l'élément
                if (isLoadingIndicatorPresent()) {
                    clearInterval(interval);
                    logInfo(`🔄 Indicateur de chargement détecté pendant la recherche de ${selector}, reprise de l'attente`);
                    waitForLoadingToComplete(() => {
                        waitForElementInternal(selector, callback, timeout - (Date.now() - startTime));
                    });
                    return;
                }
                
                const element = document.querySelector(selector);
                if (element) {
                    clearInterval(interval);
                    callback(element);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    logInfo(`Élément introuvable : ${selector}`);
                }
            } catch (error) {
                clearInterval(interval);
                logInfo("Erreur dans waitForElement :", error);
            }
        }, 100);
    }

    // Fonction pour exécuter les étapes contenant plusieurs actions
    function executeMultipleActions(actions, sendResponse, actionIndex = 0) {
        if (isLoadingIndicatorPresent()) {
            logInfo(`🔄 Indicateur de chargement détecté avant l'exécution de l'action ${actionIndex}, mise en attente`);
            waitForLoadingToComplete(() => {
                executeMultipleActionsInternal(actions, sendResponse, actionIndex);
            });
        } else {
            executeMultipleActionsInternal(actions, sendResponse, actionIndex);
        }
    }

    // Fonction interne pour exécuter plusieurs actions
    function executeMultipleActionsInternal(actions, sendResponse, actionIndex = 0) {
        if (actionIndex >= actions.length) {
            logInfo("Toutes les actions de l'étape ont été exécutées.");
            currentStepIndex++;
            if (sendResponse) {
                sendResponse({ status: "next", step: "Actions terminées" });
            }
            return;
        }

        const action = actions[actionIndex];
        logInfo(`Exécution de l'action : ${action.description}`);

        // Vérifier spécifiquement si c'est l'action sur l'onglet Portraits
        if (action.description.includes("Vérifier et cliquer sur l'onglet Portraits")) {
            const portraitTabSelector = action.selector;
            const portraitTab = document.querySelector(portraitTabSelector);
            
            if (portraitTab) {
                const liParent = portraitTab.closest('li');
                const isDisabled = liParent && liParent.classList.contains('ui-state-disabled');
                
                if (isDisabled) {
                    logInfo("Onglet Portraits désactivé détecté avant de tenter le clic, passage à l'étape suivante");
                    // Terminer cette étape et passer à la suivante
                    currentStepIndex++;
                    if (sendResponse) {
                        sendResponse({ status: "next", step: "Onglet Portraits désactivé, passage à l'étape suivante" });
                    }
                    return;
                }
            }
        }

        waitForElement(action.selector, (element) => {
            try {
                action.action(element);
                logInfo(`Action terminée : ${action.description}`);
                executeMultipleActions(actions, sendResponse, actionIndex + 1); // Passer à l'action suivante
            } catch (error) {
                logInfo(`Erreur lors de l'exécution de l'action : ${action.description}`, error);
                if (sendResponse) {
                    sendResponse({ status: "error", step: action.description });
                }
            }
        });
    }

    // Fonction pour exécuter une étape
    function executeNextStep(sendResponse) {
        if (isLoadingIndicatorPresent()) {
            logInfo("🔄 Indicateur de chargement détecté avant l'exécution de l'étape suivante, mise en attente");
            waitForLoadingToComplete(() => {
                executeNextStepInternal(sendResponse);
            });
        } else {
            executeNextStepInternal(sendResponse);
        }
    }

    // Fonction interne pour exécuter l'étape suivante
    function executeNextStepInternal(sendResponse) {
        if (currentStepIndex >= steps.length) {
            logInfo("Toutes les étapes ont été exécutées.");
            if (sendResponse) {
                sendResponse({ status: "done" });
            }
            return;
        }

        const step = steps[currentStepIndex];
        logInfo(`Exécution de l'étape : ${step.name}`);

        if (step.actions) {
            // Étape avec plusieurs actions
            executeMultipleActions(step.actions, sendResponse);
        } else if (step.fallbackSelector) {
            // Étape avec fallback
            waitForElementOrFallback(step.selector, step.fallbackSelector, (element, fallbackElement) => {
                try {
                    step.action(element, fallbackElement);
                    logInfo(`Étape terminée : ${step.name}`);
                    currentStepIndex++;
                    if (sendResponse) {
                        sendResponse({ status: "next", step: step.name });
                    }
                } catch (error) {
                    logInfo(`Erreur lors de l'exécution de l'étape : ${step.name}`, error);
                    if (sendResponse) {
                        sendResponse({ status: "error", step: step.name });
                    }
                }
            });
        } else {
            // Étape classique
            waitForElement(step.selector, (element) => {
                try {
                    step.action(element);
                    logInfo(`Étape terminée : ${step.name}`);
                    currentStepIndex++;
                    if (sendResponse) {
                        sendResponse({ status: "next", step: step.name });
                    }
                } catch (error) {
                    logInfo(`Erreur lors de l'exécution de l'étape : ${step.name}`, error);
                    if (sendResponse) {
                        sendResponse({ status: "error", step: step.name });
                    }
                }
            });
        }
    }

    // Fonction pour activer le script
    function activateScript() {
        isActive = true;
        alphaStepIndex = 0;
        currentStepIndex = 0; // Réinitialiser l'index des étapes d'automatisation
        
        logInfo("🚀 ACTIVATION DU SCRIPT ALPHAMATCHERS");
        logInfo("Script activé et prêt à exécuter les vérifications");
        
        // Détection du format DOM
        domFormat = detectDOMFormat();
        logInfo(`Format DOM détecté: ${domFormat}`);
        
        // Vérification immédiate des données
        logInfo("Lancement de la vérification des données...");
        const result = verifyAlphaNumericData();
        if (result) {
            logInfo("✅✅✅ DONNÉES VALIDÉES AVEC SUCCÈS ✅✅✅");
            // Nous ne retournons pas immédiatement, la suite est gérée dans verifyAlphaNumericData
        } else {
            logInfo("❌❌❌ ÉCHEC DE LA VALIDATION DES DONNÉES ❌❌❌");
        }
        return result;
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
        else if (message.command === "nextStep") {
            logInfo("Commande d'exécution d'étape reçue");
            executeNextStep(sendResponse);
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

    // Export pour les tests (adapté pour fonctionner en module et en IIFE)
    if (typeof window !== 'undefined') {
        // Exposer les fonctions sur window pour les tests dans le navigateur
        window.alphaMatchers = {
            verifyAlphaNumericData,
            showErrorWindow,
            highlightErrorFields,
            highlightField,
            activateScript,
            deactivateScript,
            detectDOMFormat,
            executeNextStep,
            isLoadingIndicatorPresent
        };
    } else if (typeof module !== 'undefined' && module.exports) {
        // Export pour les tests Node.js
        module.exports = {
            verifyAlphaNumericData,
            showErrorWindow,
            highlightErrorFields,
            highlightField,
            activateScript,
            deactivateScript,
            detectDOMFormat,
            executeNextStep,
            isLoadingIndicatorPresent
        };
    }
})(); // Fin de l'IIFE
