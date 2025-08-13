const utils = require("../util");

exports.listTimeEntries = async () => {};

exports.getTimeSpentByUserJSON = async (userId, iUrlParams) => {
	const urlParams = iUrlParams;
	urlParams.period_type = 2;
	urlParams.user_id = userId;

	const oParams = {
		par1: "time_entries",
		par2: "time_entry",
		urlParams,
	};

	const aRet = await utils.getAllObjects("time_entries.xml", 100, oParams);
	return aRet;
};

exports.getProjectTimeSpent = async (id, urlLimit, urlParams = {}) => {
	const oParams = {
		par1: "time_entries",
		par2: "time_entry",
		urlParams: urlParams,
	};
	
	const aRet = await utils.getAllObjects(`projects/${id}/time_entries.xml`, urlLimit, oParams);
	return aRet;
};

exports.getTimeSpentPageJSON = async (urlLimit, urlParams = {}) => {
	const oParams = {
		par1: "time_entries",
		par2: "time_entry",
		urlParams: urlParams,
	};
	const aRet = await utils.getAllObjects("time_entries.xml", urlLimit, oParams);
	return aRet;
};

exports.updateTimeEntry = async (data) => {
	const url = utils.constructURL(`time_entries/${data.id}.xml`);

	const res = await utils.makeRequest(url, "PUT", data.body, true);
	return res;
};
