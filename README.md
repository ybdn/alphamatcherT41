T41 Assistant
Description

L'extension Assistance T41 est un outil d'ergonomie destiné à aider les opérateurs dans le contrôle des fiches de signalisation FAED. Elle injecte des scripts dans les pages FAED pour remplacer des actions tout en fournissant un popup pour une meilleure interaction utilisateur.
Contexte et problématiques

Dans le cadre de l’utilisation de l’application T41 du FAED (Fichier Automatisé des Empreintes Digitales), les opérateurs effectuent quotidiennement des contrôles et validations de fiches de signalisation. Ces opérations sont répétitives et demandent un nombre conséquent de clics et mouvements de souris, ce qui peut entraîner des Troubles Musculo-Squelettiques (TMS) à long terme. L’objectif de l’extension est de réduire la charge cognitive et physique des opérateurs en automatisant certaines tâches tout en préservant leur capacité à intervenir en cas de besoin.
Fonctionnalités

    Automatisation des tâches répétitives :
        Identification et interaction avec des éléments précis des pages FAED.
        Exécution séquencée des processus, avec validation humaine entre chaque étape.
    Interface utilisateur : Popup interactif permettant de contrôler et tester les fonctionnalités.
    Sécurité : L'extension ne peut en aucun cas interagir directement avec la base de données FAED. Les actions se limitent à l'automatisation des manipulations d'interface utilisateur visibles dans le navigateur (DOM).

Installation

    Ouvrez Firefox et allez dans Extensions.
    Cliquez sur Installer depuis un fichier.
    Sélectionnez le fichier .xpi T41 Assistant dans le dossier de votre projet.

Utilisation

    Visitez une page FAED contenant une signalisation.
    Cliquez sur l'icône de l'extension dans la barre d'outils pour afficher le popup.
    Testez les fonctionnalités disponibles en suivant les étapes prédéfinies.

Structure

    background/ : Contient le script d'arrière-plan (backgroundScript.js).
    content/ : Contient le script injecté dans les pages web (contentScript.js).
    popup/ : Contient l'interface utilisateur (HTML et JS).
    manifest.json : Fichier de configuration de l'extension.
    README.md : Documentation du projet.

Explication du code
manifest.json

Ce fichier contient la configuration de l’extension :

    Les permissions (par exemple, l’accès aux pages de l’application FAED).
    Le déclenchement des scripts (contentScript.js) sur les URLs correspondantes.
    Les détails de l’interface utilisateur (popup).

backgroundScript.js

Ce script gère les événements globaux de l’extension :

    Initialisation de l’extension.
    Communication entre les différents composants (popup et content scripts).

contentScript.js

Le script de contenu est injecté dans les pages ciblées pour :

    Identifier les éléments de la page (boutons, cases à cocher, etc.).
    Exécuter les actions définies dans le workflow.
    Remonter les erreurs ou événements à la console pour un diagnostic rapide.

popup.html et popup.js

Ces fichiers forment l’interface utilisateur :

    Le popup permet aux opérateurs de contrôler l’exécution des étapes (boutons pour avancer ou recommencer).
    popup.js gère les interactions entre l’utilisateur et l’extension.

Flux global

    L’extension est chargée sur Firefox et activée uniquement pour les URLs de l’application FAED.
    Au chargement d’une page cible, contentScript.js s’exécute et prépare les éléments pour l’automatisation.
    L’opérateur interagit via le popup pour valider les étapes, garantissant ainsi un contrôle humain permanent.
    Toute erreur ou anomalie est journalisée dans la console pour révision ultérieure.

Compatibilité

    Compatible avec Firefox ESR 128.4.0 et versions supérieures.

Bénéfices

    Amélioration de l'ergonomie : Réduction des efforts physiques et cognitifs liés à la validation des fiches de signalisation, ce qui diminue la fatigue des opérateurs.
    Optimisation du temps de travail : Accélération des processus de validation grâce à l'automatisation des tâches répétitives.
    Prévention des TMS : Moins de clics et de mouvements de souris, contribuant à réduire le risque de troubles musculo-squelettiques chez les opérateurs.
    Facilité d'utilisation : Interface simple et intuitive avec des étapes de validation claires, garantissant un contrôle total tout en optimisant les tâches répétitives.

Conclusion

L'extension T41 Assistant représente un atout majeur pour les opérateurs utilisant l'application FAED, en apportant une solution ergonomique et efficace face aux tâches répétitives et lourdes. En automatisant certaines actions, l'extension permet aux opérateurs de travailler plus efficacement tout en minimisant les risques de TMS. Avec son interface intuitive et sa sécurité garantie, elle assure un équilibre parfait entre automatisation et contrôle humain, contribuant ainsi à un environnement de travail plus sain et plus productif.
