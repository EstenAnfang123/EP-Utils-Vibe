const utils = require("../util");

exports.getIssues = async (urlParams={}) => {
	const oParams = {
		par1: "issues",
		par2: "issue",
        urlParams
	};

	const res = await utils.getAllObjects(`issues.xml`, 100, oParams);
	return res;
};

exports.getProjectIssues = async (id,urlParams={}) => {
	const oParams = {
		par1: "issues",
		par2: "issue",
        urlParams
	};

	const res = await utils.getAllObjects(`projects/${id}/issues.xml`, 100, oParams);
	return res;
};
