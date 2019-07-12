#!/usr/bin/env node
'use strict'; /* jshint node:true, esversion:8 */
const fs = require('fs');
const bip39 = require('bip39');
const nacl = require('tweetnacl');
const sshpk = require('sshpk');
const commandLineArgs = require('command-line-args');
const rl = require('./lib/rl.js');
const E = exports;

const usageText = 'Backup/restore ed25519 ssh key using BIP39\n\n' +
    'Usage: ssh-ed25519-bip39 [-r] ssh_key_filename\n\n' +
    'Reads ssh_key_filename and prints 24 english words.\n' +
    'Use "-r" for reverse operation, with prompt for passphrase and comment.\n' +
    'Use "-rn" for reverse operation without asking passphrase and comment.';

const optionDef = [
    { name: 'restore', alias: 'r', type: Boolean },
    { name: 'nopass', alias: 'n', type: Boolean },
    { name: 'yes', alias: 'y', type: Boolean },
    { name: 'debug', alias: 'd', type: Boolean },
];

E.keyToWords = key => bip39.entropyToMnemonic(key.part.k.data, bip39.ENGLISH_WORDLIST);

E.wordsToKey = words => {
    const str = bip39.mnemonicToEntropy(words, bip39.ENGLISH_WORDLIST);
    const buf = Buffer.from(str, 'hex');
    const pair = nacl.sign.keyPair.fromSeed(new Uint8Array(buf));
    const key = new sshpk.PrivateKey({
        type: 'ed25519',
        parts: [
            { name: 'A', data: Buffer.from(pair.publicKey) },
            { name: 'k', data: Buffer.from(pair.secretKey).slice(0, 32) }
        ],
    });
    return key;
};

async function readSshKey(filename, passphrase) {
    const keyData = fs.readFileSync(filename);
    try {
        const key = sshpk.parsePrivateKey(keyData, 'ssh', { passphrase, filename });
        if (key.type != 'ed25519')
            throw new Error('Not Ed25519 key');
        console.log('Fingerprint: ' + key.fingerprint().toString());
        return key;
    } catch (e) {
        if (!(e instanceof sshpk.KeyEncryptedError) || passphrase)
            throw e;
        return readSshKey(filename, await rl.readPass('Enter passphrase: '));
    }
}

async function writeSshKey(filename, key, opt = {}) {
    const keyOpt = {};
    if (!opt.nopass) {
        const pass1 = await rl.readPass('Enter passphrase (empty for no passphrase): ');
        const pass2 = await rl.readPass('Enter same passphrase again: ');
        if (pass1 != pass2)
            throw new Error('Passphrases do not match');
        if (pass1)
            keyOpt.passphrase = pass1;
    }
    const comment = opt.nopass ? '' : await rl.readLn('Public key comment (optional): ');
    keyOpt.comment = comment;
    fs.writeFileSync(filename, key.toString('ssh', keyOpt));
    fs.chmodSync(filename, 0o600);
    console.log(`Your private key has been saved in ${filename}`);
    const pubKeyStr = key.toPublic().toString('ssh') +
        (comment ? ' ' + comment : '') + '\n';
    const pubFilename = `${filename}.pub`;
    fs.writeFileSync(pubFilename, pubKeyStr);
    console.log(`Your public key has been saved in ${pubFilename}`);
    console.log('Fingerprint: ' + key.fingerprint().toString());
}

async function backupSshKey(filename) {
    const key = await readSshKey(filename);
    console.log('Words: ' + E.keyToWords(key));
}

async function restoreSshKey(filename, opt) {
    if (fs.existsSync(filename) && !opt.yes) {
        const yesno = await rl.readLn(`${filename} already exists. Overwrite? (y/n) `);
        if (!yesno[0] || yesno[0].toUpperCase() != 'Y')
            throw new Error('Operation cancelled');
    }
    const words = await rl.readLn('24 seed words: ');
    if (!words)
        return void console.log('No words, exiting');
    await writeSshKey(filename, E.wordsToKey(words), opt);
}

async function main() {
    const opt = commandLineArgs(optionDef, { stopAtFirstUnknown: true });
    const arg = opt._unknown || [];
    if (arg.length != 1)
        return void console.log(usageText);
    rl.init();
    try { await (opt.restore ? restoreSshKey(arg[0], opt) : backupSshKey(arg[0])); }
    catch (e) {
        console.error(opt.debug ? e : `ERROR: ${e.message}`);
        process.exit(1);
    }
    rl.close();
}

if (!module.parent)
    main();
