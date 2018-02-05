'use strict';

const fetch = require('node-fetch');
const uri = 'https://api.nature.global/1';

// swagger http://swagger.nature.global/
async function getAppliances() {
  return await fetch(`${uri}/appliances`, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`
    }
  })
    .then((res) => res.json());
}

async function setAirconSettings(id, q) {
  return await fetch(`${uri}/appliances/${id}/aircon_settings?${q}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`
    }
  })
    .then((res) => res.json());
}

module.exports = {
  getAppliances,
  setAirconSettings
};
