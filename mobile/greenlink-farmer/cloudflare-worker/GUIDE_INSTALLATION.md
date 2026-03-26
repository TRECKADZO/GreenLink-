# Guide d'installation du Cloudflare Worker — Proxy API GreenLink

## Etape 1 : Creer le record DNS

1. Allez sur https://dash.cloudflare.com
2. Selectionnez **greenlink-agritech.com**
3. Allez dans **DNS** > **Records**
4. Cliquez **Add record** :
   - Type: `AAAA`
   - Name: `api`
   - IPv6 address: `100::1`
   - Proxy status: **Proxied** (nuage orange ON)
   - TTL: Auto
5. Cliquez **Save**

Cela cree le sous-domaine `api.greenlink-agritech.com` route par Cloudflare.

## Etape 2 : Creer le Worker

1. Dans le dashboard Cloudflare, allez dans **Workers & Pages** (menu gauche)
2. Cliquez **Create** > **Create Worker**
3. Donnez-lui le nom: `greenlink-api-proxy`
4. Cliquez **Deploy** (avec le code par defaut)
5. Apres le deploiement, cliquez **Edit code**
6. **Supprimez** tout le code existant
7. **Collez** le contenu du fichier `worker.js` (fourni dans ce dossier)
8. Cliquez **Deploy** en haut a droite

## Etape 3 : Router le Worker vers votre domaine

1. Retournez sur le dashboard principal de greenlink-agritech.com
2. Allez dans **Workers Routes** (ou **Workers** dans le menu)
3. Cliquez **Add route** :
   - Route: `api.greenlink-agritech.com/*`
   - Worker: `greenlink-api-proxy`
   - Environment: Production
4. Cliquez **Save**

## Etape 4 : Tester

Ouvrez dans votre navigateur :
```
https://api.greenlink-agritech.com/api/health
```

Vous devriez voir :
```json
{"status":"ok","service":"greenlink-api"}
```

Si vous voyez ce resultat, le proxy fonctionne ! L'app mobile sera mise a jour pour utiliser cette URL.

## En cas de probleme

- Si vous voyez "Error 1000" : Le record DNS n'est pas encore propage (attendez 2 min)
- Si vous voyez "Error 523" : Le Worker n'est pas associe a la route
- Si vous voyez "502" : Le backend Emergent est temporairement down

## Architecture

```
Telephone (CI) --> api.greenlink-agritech.com (votre Cloudflare)
                          |
                   Cloudflare Worker
                          |
                          v
           ars1000-compliance.preview.emergentagent.com (backend)
```

Avantage : Votre domaine, vos regles Cloudflare. Pas de blocage reseau ivoirien.
