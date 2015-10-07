"use strict";

var substitutions = require("./substitutions");

/**
 * @constructor
 * @param {Object} config the configuration of the bridge.
 *     See ../config/slack-config-schema.yaml for the schema to which this must conform.
 * @param {Rooms} rooms mapping of all known slack channels to matrix rooms.
 * @param {request} requestLib request library, for sending HTTP requests.
 */
function MatrixHandler(config, rooms, requestLib, echoSuppresser) {
    this.config = config;
    this.rooms = rooms;
    this.requestLib = requestLib;
    this.echoSuppresser = echoSuppresser;
}

/**
 * Handles a matrix event.
 *
 * Sends a message to Slack if it understands enough of the event to do so.
 * Attempts to make the message as native-slack feeling as it can.
 *
 * @param {MatrixEvent} event the matrix event.
 */
MatrixHandler.prototype.handle = function(event) {
    if (event.type !== "m.room.message" || !event.content ||
            this.echoSuppresser.shouldSuppress(event.event_id)) {
        return;
    }
    var hookURL = this.rooms.webhookForMatrixRoomID(event.room_id);
    if (!hookURL) {
        console.log("Ignoring event for matrix room with unknown slack channel:" +
            event.room_id);
        return;
    }
    var body = substitutions.matrixToSlack(event, this.config.homeserver);
    this.requestLib({
        method: "POST",
        json: true,
        uri: hookURL,
        body: body
    }, function(err, res) {
        if (err) {
            console.log("HTTP Error: %s", err);
        }
        else {
            console.log("HTTP %s", res.statusCode);
        }
    });
};

module.exports = MatrixHandler;
