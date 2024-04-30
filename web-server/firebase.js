console.log(`firebase.js 모듈 분리`);

const firebase = require("firebase");

const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};
firebase.initializeApp(firebaseConfig)
let firebase = firebase.database();

module.exports = firebase;
