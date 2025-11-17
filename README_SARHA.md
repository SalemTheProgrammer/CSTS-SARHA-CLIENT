# Sarha Client

Application de bureau Angular/Tauri pour la connexion automatique à un appareil sur le réseau local.

## Fonctionnalités

- Import et stockage sécurisé d'un fichier de configuration chiffré
- Déchiffrement automatique au démarrage
- Vérification de la présence de l'appareil sur le réseau (192.168.1.140)
- Interface en français avec fond blanc et boutons noirs
- Gestion des erreurs de connexion avec possibilité de réessayer

## Installation

```bash
# Installer les dépendances
yarn install

# Lancer en mode développement
yarn tauri dev

# Compiler l'application
yarn tauri build
```

## Utilisation

### Premier lancement

1. L'application demande d'importer un fichier de configuration
2. Sélectionnez le fichier `example-config.txt` (ou votre propre fichier)
3. Le fichier est chiffré et stocké localement

### Lancements suivants

1. L'application charge automatiquement la configuration chiffrée
2. Elle tente de se connecter à l'appareil (192.168.1.140)
3. Si la connexion échoue : message d'erreur avec bouton "Réessayer"
4. Si la connexion réussit : redirection automatique après 2 secondes

## Format du fichier de configuration

Le fichier doit être au format JSON :

```json
{
  "deviceIp": "192.168.1.140",
  "deviceName": "Mon Appareil Sarha"
}
```

## Structure du projet

- `src/app/services/` - Services (crypto, storage, device, config)
- `src/app/components/` - Composants (import, connection, main)
- `src/app/guards/` - Guards de navigation
- `src-tauri/` - Backend Rust/Tauri

## Sécurité

Le fichier de configuration est chiffré avec AES-GCM avant d'être stocké localement.
La clé de chiffrement est intégrée dans l'application.
