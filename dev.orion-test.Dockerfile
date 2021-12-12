FROM node:14.18.1 as build-stage

WORKDIR /orion-test/
COPY ./orion-test/package.json ./orion-test/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY ./orion-test/ ./

CMD ["yarn", "start:dev"]
