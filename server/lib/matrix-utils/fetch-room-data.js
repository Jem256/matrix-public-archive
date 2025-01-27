'use strict';

const assert = require('assert');

const urlJoin = require('url-join');
const { fetchEndpointAsJson } = require('../fetch-endpoint');
const { traceFunction } = require('../../tracing/trace-utilities');

const config = require('../config');
const matrixServerUrl = config.get('matrixServerUrl');
assert(matrixServerUrl);

async function fetchRoomData(accessToken, roomId) {
  assert(accessToken);
  assert(roomId);

  const stateNameEndpoint = urlJoin(
    matrixServerUrl,
    `_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/state/m.room.name`
  );
  const canoncialAliasEndpoint = urlJoin(
    matrixServerUrl,
    `_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/state/m.room.canonical_alias`
  );
  const stateAvatarEndpoint = urlJoin(
    matrixServerUrl,
    `_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/state/m.room.avatar`
  );
  const stateHistoryVisibilityEndpoint = urlJoin(
    matrixServerUrl,
    `_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/state/m.room.history_visibility`
  );
  const stateJoinRulesEndpoint = urlJoin(
    matrixServerUrl,
    `_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/state/m.room.join_rules`
  );

  const [
    stateNameResDataOutcome,
    stateCanonicalAliasResDataOutcome,
    stateAvatarResDataOutcome,
    stateHistoryVisibilityResDataOutcome,
    stateJoinRulesResDataOutcome,
  ] = await Promise.allSettled([
    fetchEndpointAsJson(stateNameEndpoint, {
      accessToken,
    }),
    fetchEndpointAsJson(canoncialAliasEndpoint, {
      accessToken,
    }),
    fetchEndpointAsJson(stateAvatarEndpoint, {
      accessToken,
    }),
    fetchEndpointAsJson(stateHistoryVisibilityEndpoint, {
      accessToken,
    }),
    fetchEndpointAsJson(stateJoinRulesEndpoint, {
      accessToken,
    }),
  ]);

  let name;
  if (stateNameResDataOutcome.reason === undefined) {
    const { data } = stateNameResDataOutcome.value;
    name = data.name;
  }

  let canonicalAlias;
  if (stateCanonicalAliasResDataOutcome.reason === undefined) {
    const { data } = stateCanonicalAliasResDataOutcome.value;
    canonicalAlias = data.alias;
  }

  let avatarUrl;
  if (stateAvatarResDataOutcome.reason === undefined) {
    const { data } = stateAvatarResDataOutcome.value;
    avatarUrl = data.url;
  }

  let historyVisibility;
  if (stateHistoryVisibilityResDataOutcome.reason === undefined) {
    const { data } = stateHistoryVisibilityResDataOutcome.value;
    historyVisibility = data.history_visibility;
  }

  let joinRule;
  if (stateJoinRulesResDataOutcome.reason === undefined) {
    const { data } = stateJoinRulesResDataOutcome.value;
    joinRule = data.join_rule;
  }

  return {
    id: roomId,
    name,
    canonicalAlias,
    avatarUrl,
    historyVisibility,
    joinRule,
  };
}

module.exports = traceFunction(fetchRoomData);
