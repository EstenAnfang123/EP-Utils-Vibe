const utils = require("../util");

exports.getContacts = async (urlParams = {}) => {
	const oParams = {
		par1: "easy_contacts",
		par2: "easy_contact",
		urlParams,
	};

	const res = await utils.getAllObjects(`easy_contacts.xml`, 100, oParams);
	return res;
};
