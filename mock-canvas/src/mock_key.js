import crypto from "crypto";

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
});

const PRIVATE_KEY_PEM = privateKey.export({
    type: "pkcs1",
    format: "pem",
});

const PUBLIC_KEY_PEM = publicKey.export({
    type: "pkcs1",
    format: "pem",
});

console.log("private " + PRIVATE_KEY_PEM)
console.log("public  " + PUBLIC_KEY_PEM)

const KID = "mock-key-1";