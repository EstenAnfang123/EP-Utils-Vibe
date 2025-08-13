const EPApi = require("./index");

const api = new EPApi("https://effiis.easyproject.cz", { login: "admin", pwd: "b'm4kmIP" });

api.users.listUsers().then(item => console.dir(item));
api.projects.getAllProjectsJSON().then(item => console.dir(item));
