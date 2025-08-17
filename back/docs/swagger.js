const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Cargar documentación desde archivo YAML
const swaggerDocument = YAML.load(path.join(__dirname, 'api.yaml'));

module.exports = {
    specs: swaggerDocument,
    swaggerUi
};
