const utils = require("../util");

exports.listUsers = async (sParams = "limit=100") => {
	const url = utils.constructURL("users.xml", sParams);
	const res = await utils.makeRequest(url);
	return res;
};

exports.listUsersJSON = async (page, urlLimit, urlParams = {}) => {
	const oParams = {
		par1: "users",
		par2: "user",
		urlParams: urlParams,
	};
	const aRet = await utils.getPageOfObjects("users.xml", page, urlLimit, oParams);
	return aRet;
};

exports.getUser = async (id) => {
	const res = await utils.getJSON(`users/${id}.xml`);
	return res;
};
