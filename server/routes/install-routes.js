'use strict';

const assert = require('assert');
const path = require('path');
const asyncHandler = require('../lib/express-async-handler');
const urlJoin = require('../lib/url-join');
const StatusError = require('../lib/status-error');

const fetchRoomData = require('../fetch-room-data');
const fetchEventsForTimestamp = require('../fetch-events-for-timestamp');
const renderHydrogenToString = require('../render-hydrogen-to-string');

const config = require('../../config.json');
const basePath = config.basePath;
assert(basePath);

function parseArchiveRangeFromReq(req) {
  const yyyy = parseInt(req.params.yyyy, 10);
  // Month is the only zero-based index in this group
  const mm = parseInt(req.params.mm, 10) - 1;
  const dd = parseInt(req.params.dd, 10);

  const hourRange = req.params.hourRange;

  let fromHour = 0;
  let toHour = 0;
  if (hourRange) {
    const hourMatches = hourRange.match(/^(\d\d?)-(\d\d?)$/);

    if (!hourMatches) {
      throw new StatusError(404, 'Hour was unable to be parsed');
    }

    fromHour = parseInt(hourMatches[1], 10);
    toHour = parseInt(hourMatches[2], 10);

    if (Number.isNaN(fromHour) || fromHour < 0 || fromHour > 23) {
      throw new StatusError(404, 'From hour can only be in range 0-23');
    }
  }

  const fromTimestamp = Date.UTC(yyyy, mm, dd, fromHour);
  let toTimestamp = Date.UTC(yyyy, mm, dd + 1, fromHour);
  if (hourRange) {
    toTimestamp = Date.UTC(yyyy, mm, dd, toHour);
  }

  return {
    fromTimestamp,
    toTimestamp,
    yyyy,
    mm,
    dd,
    fromHour,
    toHour,
  };
}

function installRoutes(app) {
  app.get('/hydrogen-styles.css', async function (req, res) {
    res.set('Content-Type', 'text/css');
    res.sendFile(require.resolve('hydrogen-view-sdk/style.css'));
  });

  app.get('/styles.css', async function (req, res) {
    res.set('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, '../../public/styles/styles.css'));
  });

  app.get('/matrix-public-archive.js', async function (req, res) {
    res.set('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, '../../dist/matrix-public-archive.es.js'));
  });

  app.get(
    '/:roomIdOrAlias/event/:eventId',
    asyncHandler(async function (req, res) {
      res.send('todo');
    })
  );

  // Based off of the Gitter archive routes,
  // https://gitlab.com/gitterHQ/webapp/-/blob/14954e05c905e8c7cb675efebb89116c07cfaab5/server/handlers/app/archive.js#L190-297
  app.get(
    '/:roomIdOrAlias/date/:yyyy(\\d{4})/:mm(\\d{2})/:dd(\\d{2})/:hourRange(\\d\\d?-\\d\\d?)?',
    asyncHandler(async function (req, res) {
      const roomIdOrAlias = req.params.roomIdOrAlias;
      assert(roomIdOrAlias.startsWith('!') || roomIdOrAlias.startsWith('#'));

      const { fromTimestamp, fromHour, toHour } = parseArchiveRangeFromReq(req);

      // Currently we force the range to always be 1 hour
      // If the format isn't correct, redirect to the correct hour range
      if (toHour !== fromHour + 1) {
        res.redirect(
          urlJoin(
            basePath,
            roomIdOrAlias,
            'date',
            req.params.yyyy,
            req.params.mm,
            req.params.dd,
            `${fromHour}-${fromHour + 1}`
          )
        );
        return;
      }

      const [roomData, { events, stateEventMap }] = await Promise.all([
        fetchRoomData(roomIdOrAlias),
        fetchEventsForTimestamp(roomIdOrAlias, fromTimestamp),
      ]);

      const hydrogenHtmlOutput = await renderHydrogenToString(roomData, events, stateEventMap);

      const hydrogenStylesUrl = urlJoin(basePath, 'hydrogen-styles.css');
      const stylesUrl = urlJoin(basePath, 'styles.css');
      const jsBundleUrl = urlJoin(basePath, 'matrix-public-archive.js');
      const pageHtml = `
      <!doctype html>
      <html lang="en">
        <head>
        <link href="${hydrogenStylesUrl}" rel="stylesheet">
        <link href="${stylesUrl}" rel="stylesheet">
        </head>
        <body>
          ${hydrogenHtmlOutput}
          <script type="text/javascript" src="${jsBundleUrl}"></script>
        </body>
      </html>
    `;

      res.set('Content-Type', 'text/html');
      res.send(pageHtml);
    })
  );
}

module.exports = installRoutes;