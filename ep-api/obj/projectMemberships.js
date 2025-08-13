const utils = require("../util");

exports.retrieveProjectMemberships = async (
	projectId,

	sParams = "limit=100"
) => {
	const url = utils.constructURL(
		`projects/${projectId}/memberships.xml`,

		sParams
	);

	console.debug(url);

	const res = await utils.makeRequest(url);

	return res;
};

exports.getAllProjectMembers = async (projectId) => {
	const oParams = {
		par1: "memberships",

		par2: "membership",
	};

	const res = utils.getAllObjects(
		`projects/${projectId}/memberships.xml`,

		100,

		oParams
	);

	return res;
};
