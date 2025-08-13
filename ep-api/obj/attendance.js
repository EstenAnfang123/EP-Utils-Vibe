const utils = require("../util");

exports.getAttendances = async (urlParams = {}) => {
	const oParams = {
		par1: "easy_attendances",
		par2: "easy_attendance",
		urlParams,
	};

	const res = await utils.getAllObjects(`easy_attendances.xml`, 100, oParams);
	return res;
};
