const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const path = require("path");

const adapter = new FileSync(path.join(__dirname, "countit.json"));
const db = low(adapter);

db.defaults({ users: [], groups: [], members: [], drink_log: [] }).write();

module.exports = db;
