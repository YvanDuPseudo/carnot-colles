# Colles Carnot

Ce projet est une simple application web pour voir vos colles. Les données sont
stockées dans le dossier `data`, avec un fichier par classe.

## Format des fichiers par classe

Le fichier est un fichier JSON. À la racine, on trouve un objet avec dans
l'ordre :
* Les personnes ayant participé à l'importation et la correction des données
  (clé `credits`) sous forme d'un tableau de chaînes de caractères.
* Les groupes (clé `groups`) sous forme de tableau de groupes, chaque groupe
  étant un objet qui comporte :
  * Les noms des élèves (clé `students`) sous forme de tableau de chaîne de
    caractères.
  * Les semaines de colles (clé `weeks`) sous forme d'un tableau dans lequel
    on associe à l'entrée d'indice `i` un tableau d'indice partants de 0
    faisant référence aux types de colles de la semaine `i` (voir `colles` et
    `weeks` à la
    racine).
* Le numéro du premier groupe (clé `firstGroup`) sous forme d'entier. Dans
  certaines classes, les numéros de groupes commencent à 0 alors que dans
  d'autres, ils commencent à 1.
* Les matières (clé `subjects`) sous forme d'un tableau de chaînes de
  caractères.
* Les noms des colleurs (clé `teachers`) sous forme d'un tableau de chaînes de
  caractères.
* Les types de colles (clé `colles`). Chaque type est un object lui-même qui
  comporte :
  * Une matière (clé `subject`) qui représente un indice partant de 0 dans le
    tableau des matières.
  * Un colleur (clé `teacher`) qui représente un indice partant de 0 dans le
    tableau des colleurs.
  * Un jour (clé `day`) où `0`, `1`, `2`, `3`, `4`, `5`, et `6` correspondent
    respectivement à Lundi, Mardi, Mercredi, Jeudi, Vendredi, Samedi, et
    Dimanche.
  * Une salle (clé `room`) sous forme de chaîne de caractères.
  * Une heure (clé `time`) sous forme d'entier qui représente l'heure de début
    de la colle. Par exemple, si la colle débute à 16h, la valeur attendue ici
    est `16`.
* Les semaines (clé `weeks`) sous forme d'un tableau de semaines, chaque semaine
  étant représentée par une chaîne de caractère du type 
  `<année>-<mois>-<jour>`. Les semaines sont triées par ordre chronologique.

L'indentation utilisée est 4 espaces, et chaque object et tableau est écrit sur
plusieurs lignes.

## Erreurs ou changements de colles

Si il y a une erreur dans les données ou une mise à jour à faire, merci de créer
un PR qui modifie les fichiers dans le dossier `data`.
