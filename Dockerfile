# Building the image starting from a root nodeJs runtime image.
FROM node:16
WORKDIR /backend_app
COPY package* .
RUN npm i --force
COPY . .

EXPOSE 3000

# Running the image.a
CMD ["node","index.js"]
