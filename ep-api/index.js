// const parser = require('fast-xml-parser');

const utils = require("./util");
const users = require("./obj/users");
const projects = require("./obj/projects");
const members = require("./obj/projectMemberships");
const money = require("./obj/money");
const timeSpent = require("./obj/timeSpent");
const customFields = require("./obj/customFields");
const issues = require("./obj/issues");
const crmCases = require("./obj/crmCases");
const attendance = require("./obj/attendance");
const contacts = require("./obj/contacts");

const oEmptyAuth = {
	login: "",
	pwd: "",
};

module.exports = class Application {
	/**
	 *Creates an instance of Application.
	 * @param {string} [baseURL='']
	 * @param {*} [auth=oEmptyAuth]
	 */
	constructor(baseURL = "", auth = oEmptyAuth) {
		this.baseURL = baseURL;
		this.auth = auth;
		utils.init(this.baseURL, this.auth);

		this.users = users;
		this.projects = projects;
		this.money = money;
		this.members = members;
		this.timeSpent = timeSpent;
		this.customFields = customFields;
		this.issues = issues;
		this.crmCases = crmCases;
		this.attendance = attendance;
		this.contacts = contacts;
	}

	/**
	 *
	 *
	 * @param {*} url
	 * @returns
	 */
	setBaseURL(url) {
		this.baseURL = url;
	}

	users() {
		return this.users;
	}

	projects() {
		return this.projects;
	}

	members() {
		return this.members;
	}

	money() {
		return this.money;
	}

	timeSpent() {
		return this.timeSpent;
	}

	customFields() {
		return this.customFields;
	}

	issues() {
		return this.issues;
	}

	crmCases() {
		return this.crmCases;
	}

	attendance() {
		return this.attendance;
	}

	contacts() {
		return this.contacts;
	}
};
