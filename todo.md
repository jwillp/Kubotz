#TODO


## [] Corriger les contacts
	Quand on touche un powerup par exemple et qu'on se déplace plus loin, le cotnact existe toujours. Il devient alors possible de le ramasser
	à distance ce qui ne fait aucun sens.

## [] Encapsuler TOUTES les variables membres des Composantes
	Bien qu'au départ il semblait beaucoup plus simple de faire dans variables membres publiques, c'est vraiment plus facile à maintenir si elles sont encapsulée. Pour le moment seulement une partie sont faites, il faut toutes les terminées.


## [] Renommer le package Component pour Components
	C'est plus approprié

## [] Renommer le package System pour Systems
	C'est plus approprié

## [] Renommer la classe Component pour EntityComponent
	Sémentiquement ça ferait plus de sens parce que les systèmes s'appelles EntitySystems

## [] Modifier Entity Manager pour pouvoir utiliser des Templates Class<T> plutôt que des ID
	C'est juste vraiment plus simple à utiliser par la suite et ça rend le code plus cours et plus lisible.
	**ATTENTION** Ne pas oublier de LAISSER LE CHAMPS STATIC ID dans chacune des Components; Ça pourrait être utile un jours...

