var KeyHelper = libsignal.KeyHelper;

const KEY_ALGO = {
    'name': 'AES-GCM',
    'length': 128
};

var ChatOmemo = {
    generateBundle: async function () {
        var store = new ChatOmemoStorage();

        const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
        const bundle = {};
        const identityKey = MovimUtils.arrayBufferToBase64(identityKeyPair.pubKey);
        const deviceId = KeyHelper.generateRegistrationId();

        bundle['identityKey'] = identityKey;
        bundle['deviceId'] = deviceId;

        store.setLocalRegistrationId(deviceId);
        store.setIdentityKeyPair(identityKeyPair);

        const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1234);
        console.log(signedPreKey);
        store.storeSignedPreKey(signedPreKey.keyId, signedPreKey);
        bundle['signedPreKey'] = {
            'id': signedPreKey.keyId,
            'publicKey': signedPreKey.keyPair.privKey,
            'signature': signedPreKey.signature
        }
        const keys = await Promise.all(MovimUtils.range(0, 25).map(id => KeyHelper.generatePreKey(id)));
        keys.forEach(k => store.storePreKey(k.keyId, k.keyPair));

        const preKeys = keys.map(k => ({ 'id': k.keyId, 'key': k.keyPair.pubKey }));
        bundle['preKeys'] = preKeys;

        console.log(bundle);
        ChatOmemo_ajaxAnnounceBundle(bundle);
    },

    handlePreKey: function (jid, deviceId, preKey) {
        var store = new ChatOmemoStorage();
        var address = new libsignal.SignalProtocolAddress(jid, deviceId);

        var sessionBuilder = new libsignal.SessionBuilder(store, address);

        var promise = sessionBuilder.processPreKey({
            registrationId: 0,
            identityKey: MovimUtils.base64ToArrayBuffer(preKey.identitykey),
            signedPreKey: {
                keyId: 1,
                publicKey: MovimUtils.base64ToArrayBuffer(preKey.prekeypublic),
                signature: MovimUtils.base64ToArrayBuffer(preKey.prekeysignature)
            },
            preKey: {
                keyId: preKey.prekey.id,
                publicKey: MovimUtils.base64ToArrayBuffer(preKey.prekey.value)
            }
        });

        promise.then(function onsuccess() {
            console.log('success');
        });

        promise.catch(function onerror(error) {
            console.log(error);
        });
    },
    encrypt: async function (to, plaintext) {
        var store = new ChatOmemoStorage();

        // https://xmpp.org/extensions/attic/xep-0384-0.3.0.html#usecases-messagesend

        let iv = crypto.getRandomValues(new Uint8Array(12));
        let key = await crypto.subtle.generateKey(KEY_ALGO, true, ['encrypt', 'decrypt']);

        let algo = {
            'name': 'AES-GCM',
            'iv': iv,
            'tagLength': 128
        };

        let encrypted = await crypto.subtle.encrypt(algo, key, MovimUtils.stringToArrayBuffer(plaintext));
        let length = encrypted.byteLength - ((128 + 7) >> 3);
        let ciphertext = encrypted.slice(0, length);
        let tag = encrypted.slice(length);
        let exportedKey = await crypto.subtle.exportKey('raw', key);

        // obj
        let keyAndTag = MovimUtils.appendArrayBuffer(exportedKey, tag);
        let biv = MovimUtils.arrayBufferToBase64(iv);
        let payload = MovimUtils.arrayBufferToBase64(ciphertext);
        let deviceId = await store.getLocalRegistrationId();
        let results = await this.encryptJid(keyAndTag, to);

        let messageKeys = {};
        results.map(result => {
            messageKeys[result.device] = {
                payload : btoa(result.payload.body),
                prekey : 3 == parseInt(result.payload.type, 10)
            };
        });

        return {
            'sid': deviceId,
            'keys': messageKeys,
            'iv': biv,
            'payload': payload
        };
    },
    decrypt: async function (message) {
        if (message.omemoheader == undefined) return;

        let maybeDecrypted = await ChatOmemoDB.getMessage(message.id);

        if (maybeDecrypted !== undefined) {
            return maybeDecrypted;
        }

        var store = new ChatOmemoStorage();
        let deviceId = await store.getLocalRegistrationId();

        if (message.omemoheader.keys[deviceId] == undefined) {
            console.log('Message not encrypted for this device');
            return;
        }

        let key = message.omemoheader.keys[deviceId];
        let plainKey;

        try {
            plainKey = await this.decryptDevice(atob(key.payload), key.prekey, message.jidfrom, message.omemoheader.sid);
        } catch (err) {
            console.log('Error during decryption: ' + err);
            return;
        }

        let exportedAESKey = plainKey.slice(0, 16);
        let authenticationTag = plainKey.slice(16);

        if (authenticationTag.byteLength < 16) {
            if (authenticationTag.byteLength > 0) {
            throw new Error('Authentication tag too short');
            }

            console.log(`Authentication tag is only ${authenticationTag.byteLength} byte long`);
        }

        if (!message.omemoheader.payload) {
            console.log('No payload to decrypt');
        }

        if (key.prekey) {
            // One of our key was used, let's refresh the bundle
        }

        let iv = MovimUtils.base64ToArrayBuffer(message.omemoheader.iv);
        let ciphertextAndAuthenticationTag = MovimUtils.appendArrayBuffer(
            MovimUtils.base64ToArrayBuffer(message.omemoheader.payload),
            authenticationTag
        );

        let importedKey = await crypto.subtle.importKey('raw', exportedAESKey, 'AES-GCM', false, ['decrypt']);
        let decryptedBuffer = await crypto.subtle.decrypt({
            name: 'AES-GCM',
            iv,
            tagLength: 128
        }, importedKey, ciphertextAndAuthenticationTag);

        let plaintext = MovimUtils.arrayBufferToString(decryptedBuffer);

        ChatOmemoDB.putMessage(message.id, plaintext);
        return plaintext;
    },
    encryptJid: function (plaintext, jid) {
        let promises = Object.keys(localStorage)
            .filter(key => key.startsWith('session' + jid))
            .map(key => key.split(/[\s.]+/).pop())
            .map(deviceId => this.encryptDevice(plaintext, jid, deviceId) );

        return Promise.all(promises).then(result => {
            return result;
        });
    },
    encryptDevice: function (plaintext, jid, deviceId) {
        var address = new libsignal.SignalProtocolAddress(jid, deviceId);
        var store = new ChatOmemoStorage();
        var sessionCipher = new libsignal.SessionCipher(store, address);

        return sessionCipher.encrypt(plaintext)
            .then(payload => ({ 'payload': payload, 'device': deviceId }));
    },
    decryptDevice: async function(ciphertext, preKey, jid, deviceId) {
        var address = new libsignal.SignalProtocolAddress(jid, deviceId);
        var store = new ChatOmemoStorage();
        var sessionCipher = new libsignal.SessionCipher(store, address);

        let plaintextBuffer;

        if (preKey) {
           plaintextBuffer = await sessionCipher.decryptPreKeyWhisperMessage(ciphertext, 'binary');
        } else {
           plaintextBuffer = await sessionCipher.decryptWhisperMessage(ciphertext, 'binary');
        }

        return plaintextBuffer;
    }
}