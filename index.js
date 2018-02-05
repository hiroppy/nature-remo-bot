'use strict';

const { RtmClient, CLIENT_EVENTS,  RTM_EVENTS, WebClient } = require('@slack/client');
const { getAppliances, setAirconSettings } = require('./apis');

require('dotenv').config();

// Cache of data
const appData = {};
let appliances = [];

const web = new WebClient(process.env.SLACK_TOKEN);
const rtm = new RtmClient(process.env.SLACK_TOKEN, {
  dataStore: false,
  useRtmConnect: true,
});

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (connectData) => {
  appData.selfId = connectData.self.id;
  console.log(`Logged in as ${appData.selfId} of team ${connectData.team.id}`);
});

rtm.on(RTM_EVENTS.MESSAGE, async (message) => {
  appliances = await getAppliances();

  // Skip messages that are from a bot or my own user ID
  if ((message.subtype && message.subtype === 'bot_message') ||
    (!message.subtype && message.user === appData.selfId)) {
    return;
  }

  if (message.text.includes(appData.selfId)) {
    const parsedMessage = message.text.split(' ');
    const type = parsedMessage[1];

    /**
     * @remo list
     */
    if (type === 'list') {
      appliances = await getAppliances();

      const attachments = appliances.map((item) => {
        return {
          color: '#3498db',
          text: `Appliance ID: ${item.id}`,
          title: item.nickname,
          fields: [
            {
              title: 'Type',
              value: item.type,
              short: true
            }
          ]
        }
      });

      return web.chat.postMessage(message.channel, 'success', {
        attachments
      });
    }

    /**
     * @remo on 1
     * @remo off 1
     * @remo change 1 tmp=20 air=5
       */
      if (type === 'on' || type === 'off' || type === 'change') {
        const name = parsedMessage[2];
        let appliance;

        // array id
        if (!isNaN(name)) appliance = appliances[name];

        // nickname
        // else if (typeof name === 'string') appliance = appliances.find((e) => e.nickname === name);

        if (appliance === undefined) return rtm.sendMessage('Error', message.channel);
        if (appliance.type !== 'AC') return rtm.sendMessage('Not Aircon', message.channel);

        let q;

        if (type !== 'change') {
          q = `button=${type === 'on' ? '' : 'power-off'}`;
        }
        else {
          q = parsedMessage
            .slice(3)
            .join('&')
            .replace(/tmp/g, 'temperature')
            .replace(/air/g, 'air_volume');
        }

        try {
          const res = await setAirconSettings(appliance.id, q);

          if (res.message) rtm.sendMessage(res.message, message.channel);
          else web.chat.postMessage(message.channel, 'success', {
            attachments: [{
              color: type === 'off' ? 'danger' : '#3498db',
              fields: [
                {
                  title: 'Temperature',
                  value: `${res.temp}c`,
                  short: true
                },
                {
                  title: 'Mode',
                  value: res.mode,
                  short: true
                },
                {
                  title: 'Air Volume',
                  value: res.vol,
                  short: true
                }
              ]
            }]
          });
        } catch(e) {
          console.error(e);
          rtm.sendMessage('Internal Error', message.channel);
        }
      }
  }
});

rtm.start();
