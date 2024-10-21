'use strict';

const srpGsa = require("@foxt/js-srp");
const crypto = require("crypto");

let srp = new srpGsa.Srp(srpGsa.Mode.GSA, srpGsa.Hash.SHA256, 2048);
const stringToU8Array = (str) => new TextEncoder().encode(str);
const base64ToU8Array = (str) => Uint8Array.from(Buffer.from(str, "base64"));
const GSASRPAuthenticator = function(username) {
    this.username = username;
    this.srpClient = undefined;
}

GSASRPAuthenticator.prototype.derivePassword = async function (protocol, password, salt, iterations) {
    let passHash = new Uint8Array(await srpGsa.util.hash(srp.h, stringToU8Array(password)));
    if (protocol === "s2k_fo") {
        passHash = stringToU8Array(srpGsa.util.toHex(passHash));
    }
    let imported = await crypto.subtle.importKey(
        "raw",
        passHash,
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );
    let derived = await crypto.subtle.deriveBits({
        name: "PBKDF2",
        hash: { name: "SHA-256" },
        iterations, salt
    }, imported, 256);

    return new Uint8Array(derived);
}

GSASRPAuthenticator.prototype.getInit = async function() {
    if (this.srpClient) throw new Error("Already initialized");
    this.srpClient = await srp.newClient(
        stringToU8Array(this.username),
        // provide fake passsword because we need to get data from server
        new Uint8Array()
    );
    let a = Buffer.from(
        srpGsa.util.bytesFromBigint(this.srpClient.A)
    ).toString("base64");
    return {
        a, protocols: ["s2k", "s2k_fo"],
        accountName: this.username,
    };
}


GSASRPAuthenticator.prototype.getComplete = async function (password, serverData) {
    if (!this.srpClient) throw new Error("Not initialized");
    if ((serverData.protocol !== "s2k") &&
        (serverData.protocol !== "s2k_fo")) throw new Error("Unsupported protocol " + serverData.protocol);
    let salt = base64ToU8Array(serverData.salt);
    let serverPub = base64ToU8Array(serverData.b);
    let iterations = serverData.iteration;
    let derived = await this.derivePassword(
        serverData.protocol, password,
        salt, iterations
    );
    this.srpClient.p = derived;
    await this.srpClient.generate(salt, serverPub);
    let m1 = Buffer.from(this.srpClient._M).toString("base64");
    let M2 = await this.srpClient.generateM2();
    let m2 = Buffer.from(M2).toString("base64");
    return {
        accountName: this.username,
        m1,
        m2,
        c: serverData.c,
    };
}

module.exports.GSASRPAuthenticator = GSASRPAuthenticator;

