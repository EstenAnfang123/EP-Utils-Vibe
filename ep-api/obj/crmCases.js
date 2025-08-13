const utils = require("../util");

exports.getCRMCases = async (urlParams = {}) => {
	const oParams = {
		par1: "easy_crm_cases",
		par2: "easy_crm_case",
		urlParams,
	};

	const res = await utils.getAllObjects(`easy_crm_cases.xml`, 100, oParams);
	return res;
};

exports.getCRMCasesByProjectId = async (id, urlParams = {}) => {
	const oParams = {
		par1: "easy_crm_cases",
		par2: "easy_crm_case",
		urlParams,
	};

	const res = await utils.getAllObjects(`projects/${id}/easy_crm_cases.xml`, 100, oParams);
	return res;
};
