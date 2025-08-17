# Proyecto-docker-react-prod

#Idea:
Proyecto simple y modificable Full stack para poder aplicarlo en diferentes sircunstacias

Usando docker compose para evitar complicaciones

#Inicio del proyecto

##Creacion del proyecto - desde 0 (primera vez):

##Requisitos: Node.JS
##Front:
##React: React + Vite

```
npm create vite@latest
```

##Back:
##Express + nodemon (para actualizar en modo dev)
```
npm install express --save
npm install --save-dev nodemon
```

y cambios en pakage.json en back

```
"scripts": {
  "start": "node app.js",
  "dev": "nodemon app.js"
}
```

#Docker modo dev

docker compose up --build
docker compose down -v

#Dokcer modo deploy

docker compose -f docker-compose.build.yml up --build -d
docker compose -f docker-compose.build.yml down -v